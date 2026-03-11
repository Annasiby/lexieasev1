import { apiFetch } from "../api/api";

const VOWELS = "aeiouy";
const LS_PREFIX = "syllables:";

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

export const splitIntoSyllables = async (word = "") => {
  const clean = normalizeWord(word);
  if (!clean) return [];

  const key = `${LS_PREFIX}${clean}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (_) {
      // ignore invalid cache entries
    }
  }

  try {
    const res = await apiFetch(`/api/syllables/${encodeURIComponent(clean)}`);
    if (res?.success && Array.isArray(res.syllables) && res.syllables.length) {
      localStorage.setItem(key, JSON.stringify(res.syllables));
      return res.syllables;
    }
  } catch (_) {
    // ignore API errors and use fallback
  }

  const fallback = heuristicSplit(clean);
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
};

export const getStressedSyllables = (syllables = []) =>
  syllables.map((s, i) => (i === 0 ? `ˈ${s}` : s));

export const getGoogleStylePronunciation = (syllables = []) =>
  getStressedSyllables(syllables).join("·");

export const speakSyllables = (syllables = [], gapMs = 350) => {
  if (!("speechSynthesis" in window) || !syllables.length) return;
  window.speechSynthesis.cancel();

  syllables.forEach((syllable, i) => {
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(syllable);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }, i * gapMs);
  });
};

