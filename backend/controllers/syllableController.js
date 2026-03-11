import { getSyllablesForWord } from "../services/syllableService.js";

export const getSyllables = async (req, res) => {
  try {
    const { word } = req.params;
    const result = await getSyllablesForWord(word);

    return res.json({
      success: true,
      word: (word || "").toLowerCase(),
      syllables: result.syllables,
      source: result.source,
    });
  } catch (err) {
    console.error("getSyllables error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch syllables",
    });
  }
};

