import express from "express";
import { getSyllables } from "../controllers/syllableController.js";

const router = express.Router();

router.get("/:word", getSyllables);

export default router;

