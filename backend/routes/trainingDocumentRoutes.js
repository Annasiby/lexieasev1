import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadTrainingDocumentFile } from "../middleware/trainingDocumentUpload.js";
import {
  uploadTrainingDocument,
  getMyTrainingDocuments,
} from "../controllers/trainingDocumentController.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  authorizeRoles("student", "teacher", "parent"),
  uploadTrainingDocumentFile,
  uploadTrainingDocument
);

router.get(
  "/mine",
  protect,
  authorizeRoles("student", "teacher", "parent"),
  getMyTrainingDocuments
);

export default router;
