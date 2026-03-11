import axios from "axios";

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const cache = new Map();
const VOWELS = "aeiouy";

const normalizeWord = (word = "") => word.toLowerCase().replace(/[^a-z]/g, "");

const heuristicSplit = (word = "") => {
  const clean = normalizeWord(word);
  if (!clean) return [];

  const out = [];
  let chunk = "";

  for (let i = 0; i < clean.length; i++) {
    chunk += clean[i];
    const cur = clean[i];
    const next = clean[i + 1];
    const curIsVowel = VOWELS.includes(cur);
    const nextIsVowel = next ? VOWELS.includes(next) : false;

    if (curIsVowel && (!next || !nextIsVowel)) {
      out.push(chunk);
      chunk = "";
    }
  }

  if (chunk) {
    if (out.length === 0) out.push(chunk);
    else out[out.length - 1] += chunk;
  }

  return out.filter(Boolean);
};

const parseFromPhonetic = (phoneticText = "") => {
  const cleaned = phoneticText
    .replace(/[\/\[\]]/g, "")
    .replace(/[ˈˌ]/g, "")
    .trim();

  if (!cleaned) return null;

  const parts = cleaned
    .split(/[.·]/g)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : null;
};

const getPhoneticCandidates = (entries = []) => {
  const candidates = [];

  for (const entry of entries) {
    if (entry?.phonetic) candidates.push(entry.phonetic);
    for (const p of entry?.phonetics || []) {
      if (p?.text) candidates.push(p.text);
    }
  }

  return candidates;
};

const fetchDictionarySplit = async (word) => {
  const url = `${API_BASE}/${encodeURIComponent(word)}`;
  const { data } = await axios.get(url, { timeout: 2500 });
  const phonetics = getPhoneticCandidates(Array.isArray(data) ? data : []);

  for (const phonetic of phonetics) {
    const parts = parseFromPhonetic(phonetic);
    if (parts) return parts;
  }

  return null;
};

export const getSyllablesForWord = async (word) => {
  const clean = normalizeWord(word);
  if (!clean) return { syllables: [], source: "invalid" };

  if (cache.has(clean)) return cache.get(clean);

  let syllables = null;
  let source = "heuristic";

  try {
    syllables = await fetchDictionarySplit(clean);
    if (syllables?.length) source = "dictionary";
  } catch (_) {
    // ignore dictionary errors and use fallback
  }

  if (!syllables?.length) syllables = heuristicSplit(clean);

  const result = { syllables, source };
  cache.set(clean, result);
  return result;
};

