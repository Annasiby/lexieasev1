// import express from "express"; //creates backend server
// import cors from "cors"; //allows communication between frontend and backend
// import cookieParser from "cookie-parser"; //lets backend read cookies - cookie based auth

// import authRoutes from "./routes/authRoutes.js";


// import reportRoutes from "./routes/reportRoutes.js";
// import therapistRoutes from "./routes/therapistRoutes.js";
// import guardianRoutes from "./routes/guardianRoutes.js";

// import relationshipRoutes from "./routes/relationshipRoutes.js";
// import letterRoutes from "./routes/letterRoutes.js";
// import sentenceRoutes from "./routes/sentenceRoutes.js";
// import wordRoutes from "./routes/wordRoutes.js";
// import twoLetterRoutes from "./routes/twoLetterRoutes.js";
// import syllableRoutes from "./routes/syllableRoutes.js";

// const app = express();

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   }),
// );

// app.use(express.json());
// app.use(cookieParser());

// //Health check endpoint
// app.get("/", (req, res) => {
//   res.send("LexiEase backend running");
// });

// app.use("/api/auth", authRoutes);

// app.use("/api/relationships", relationshipRoutes);
// app.use("/api/letters", letterRoutes);
// app.use("/api/sentences", sentenceRoutes);
// app.use("/api/words", wordRoutes);
// app.use("/api/reports", reportRoutes);
// app.use("/api/therapist", therapistRoutes);
// app.use("/api/guardian", guardianRoutes);
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import relationshipRoutes from "./routes/relationshipRoutes.js";
import letterRoutes from "./routes/letterRoutes.js";
import sentenceRoutes from "./routes/sentenceRoutes.js";
import wordRoutes from "./routes/wordRoutes.js";
import twoLetterRoutes from "./routes/twoLetterRoutes.js";
import syllableRoutes from "./routes/syllableRoutes.js";

import reportRoutes from "./routes/reportRoutes.js";
import therapistRoutes from "./routes/therapistRoutes.js";
import guardianRoutes from "./routes/guardianRoutes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Ensure DB connection before processing API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.get("/", (req, res) => {
  res.send("LexiEase backend running");
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/letters", letterRoutes);
app.use("/api/sentences", sentenceRoutes);
app.use("/api/words", wordRoutes);
app.use("/api/twoletterwords", twoLetterRoutes);
app.use("/api/syllables", syllableRoutes);

app.use("/api/reports", reportRoutes);
app.use("/api/therapist", therapistRoutes);
app.use("/api/guardian", guardianRoutes);

export default app;

// app.use("/api/twoletterwords", twoLetterRoutes);
// app.use("/api/syllables", syllableRoutes);
// export default app;
