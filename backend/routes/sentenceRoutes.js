import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { getNextSentence, logSentenceAttempt } from "../controllers/sentenceController.js";

const router = express.Router();

router.get("/next", protect, authorizeRoles("student"), getNextSentence);
router.post("/attempt", protect, authorizeRoles("student"), logSentenceAttempt);

export default router;