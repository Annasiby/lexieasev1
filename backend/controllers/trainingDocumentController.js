import TrainingDocument from "../models/TrainingDocument.js";
import StudentTeacher from "../models/StudentTeacher.js";
import ParentChild from "../models/ParentChild.js";
import {
  parseTrainingText,
  extractTextFromUploadedDocument,
} from "../services/trainingContentService.js";

const parseIdList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // ignore and fallback to comma format
  }

  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

export const uploadTrainingDocument = async (req, res) => {
  try {
    const file = req.file;
    const { title, shareMode } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const rawText = await extractTextFromUploadedDocument(file);
    if (!rawText || rawText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Uploaded document does not contain usable text",
      });
    }

    const role = req.user.role;
    if (!["student", "teacher", "parent"].includes(role)) {
      return res.status(403).json({ success: false, message: "Only student/teacher/parent can upload" });
    }

    let finalShareMode = "private";
    let assignedStudentIds = [];

    if (role === "teacher") {
      finalShareMode = shareMode === "selected" ? "selected" : "all-linked";

      if (finalShareMode === "selected") {
        const selectedIds = parseIdList(req.body.studentIds);
        const links = await StudentTeacher.find({ teacherId: req.user._id }).select("studentId");
        const myStudentIds = new Set(links.map((l) => l.studentId.toString()));
        assignedStudentIds = selectedIds.filter((id) => myStudentIds.has(String(id)));
      }
    }

    if (role === "parent") {
      finalShareMode = shareMode === "selected" ? "selected" : "all-linked";

      if (finalShareMode === "selected") {
        const selectedIds = parseIdList(req.body.childIds);
        const links = await ParentChild.find({ parentId: req.user._id }).select("childId");
        const myChildIds = new Set(links.map((l) => l.childId.toString()));
        assignedStudentIds = selectedIds.filter((id) => myChildIds.has(String(id)));
      }
    }

    const savedDoc = await TrainingDocument.create({
      ownerId: req.user._id,
      ownerRole: role,
      title: (title || file.originalname || "Training Document").slice(0, 140),
      rawText,
      shareMode: finalShareMode,
      assignedStudentIds,
      isEnabledForTraining: true,
    });

    const parsed = parseTrainingText(rawText, `doc-${savedDoc._id.toString()}`);

    return res.status(201).json({
      success: true,
      document: {
        id: savedDoc._id,
        title: savedDoc.title,
        ownerRole: savedDoc.ownerRole,
        shareMode: savedDoc.shareMode,
        assignedStudentIds: savedDoc.assignedStudentIds,
        createdAt: savedDoc.createdAt,
        isEnabledForTraining: savedDoc.isEnabledForTraining,
      },
      extracted: {
        words: parsed.words.length,
        sentences: parsed.sentences.length,
      },
    });
  } catch (error) {
    console.error("uploadTrainingDocument error:", error);
    if (
      error.message === "Unsupported file type" ||
      error.message?.toLowerCase().includes("pdf") ||
      error.message?.toLowerCase().includes("docx")
    ) {
      return res.status(400).json({
        success: false,
        message: "Could not parse this file. Please upload a valid PDF, DOCX, or TXT document.",
      });
    }

    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

export const getMyTrainingDocuments = async (req, res) => {
  try {
    if (!["student", "teacher", "parent"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const docs = await TrainingDocument.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .select("title ownerRole shareMode assignedStudentIds isEnabledForTraining createdAt");

    return res.json({ success: true, documents: docs });
  } catch (error) {
    console.error("getMyTrainingDocuments error:", error);
    return res.status(500).json({ success: false, message: "Failed to load documents" });
  }
};
