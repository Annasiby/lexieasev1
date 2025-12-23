import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getNextLetter,
  logLetterAttempt,
} from "../controllers/letterController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/next", protect, authorizeRoles("student"), getNextLetter);

router.post("/attempt", protect, authorizeRoles("student"), logLetterAttempt);
router.post(
  "/attempt",
  protect,
  authorizeRoles("student"),
  upload.single("audio"),
  logLetterAttempt
);
export default router;
