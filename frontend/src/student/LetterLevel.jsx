

import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../api/api";

export default function LetterLevelGemini() {
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");
  const [score, setScore] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* =========================
     Check browser support
  ========================== */
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setStatus("❌ Microphone recording not supported in this browser.");
    }
  }, []);

  /* =========================
     Fetch next letter (Bandit)
  ========================== */
  const fetchNextLetter = async () => {
    try {
      const data = await apiFetch("/api/letters/next");

      if (!data?.letter) {
        throw new Error("No letter returned");
      }

      setLetter(data.letter.toUpperCase());
      setScore(null);
      setStatus("");
    } catch (err) {
      console.error("fetchNextLetter error:", err);
      setStatus("❌ Could not load next letter");
      setLetter("");
    }
  };

  useEffect(() => {
    fetchNextLetter();
  }, []);

  /* =========================
     Recording logic
  ========================== */
  const startRecording = async () => {
    if (!isSupported) return;

    try {
      setScore(null);
      setStatus("🎤 Listening...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await submitAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setTimeout(stopRecording, 3000);
    } catch (err) {
      console.error(err);
      setStatus("❌ Microphone access error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /* =========================
     Submit audio → Gemini → Bandit
  ========================== */
  const submitAudio = async (audioBlob) => {
    try {
      setStatus("⏳ Processing with Gemini AI...");

      const formData = new FormData();
      formData.append("letter", letter.toLowerCase());
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("http://localhost:5001/api/letters/attempt", {
        method: "POST",
        body: formData,
        credentials: "include", // 🔑 REQUIRED
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Attempt failed");
      }

      const data = await res.json();

      // Don't show score if it's 100
      if (data.score === 100) {
        setScore(null);
      } else {
        setScore(data.score);
      }
      
      setStatus(data.message);

      speakFeedback(data.score);

      console.log(
        `Expected: ${letter}, Heard: ${data.transcript}, Score: ${data.score}`
      );

      setTimeout(fetchNextLetter, 1200);
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err.message}`);
      setScore(null);
    }
  };

  /* =========================
     Speech feedback
  ========================== */
  const speakFeedback = (score) => {
    if (!("speechSynthesis" in window)) return;

    let text =
      score >= 90
        ? "Excellent work! Congratulations."
        : score >= 75
        ? "Well done. You are very close."
        : score >= 55
        ? "Good effort. Relax and try again."
        : "Don't worry. Take your time and keep trying.";

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  /* =========================
     UI (UNCHANGED)
  ========================== */
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔤 Letter Practice</h2>

        <div style={styles.letterDisplay}>{letter}</div>

        <div style={styles.instructions}>
          Click the microphone and clearly say: <strong>"{letter}"</strong>
        </div>

        <div style={styles.buttonContainer}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported}
            style={{
              ...styles.recordButton,
              backgroundColor: isRecording ? "#ef4444" : "#3b82f6",
              opacity: !isSupported ? 0.6 : 1,
            }}
          >
            {isRecording ? "🔴 Stop (3s max)" : "🎤 Speak"}
          </button>
        </div>

        {status && <p style={styles.status}>{status}</p>}

        {score !== null && (
          <div
            style={{
              ...styles.scoreContainer,
              backgroundColor: score >= 80 ? "#d1fae5" : "#fee2e2",
            }}
          >
            <p
              style={{
                ...styles.score,
                color: score >= 80 ? "#059669" : "#dc2626",
              }}
            >
              Score: {score}/100
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Styles (unchanged)
========================== */
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #f8fafc, #ffffff)",
    padding: "24px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    maxWidth: "600px",
    width: "100%",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "12px",
  },
  letterDisplay: {
    fontSize: "120px",
    fontWeight: 700,
    color: "#1e40af",
    margin: "28px 0",
    textAlign: "center",
  },
  instructions: {
    fontSize: "18px",
    color: "#6b7280",
    marginBottom: "30px",
    textAlign: "center",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  recordButton: {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  status: {
    fontSize: "18px",
    textAlign: "center",
    margin: "20px 0",
  },
  scoreContainer: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center",
  },
  score: {
    fontSize: "36px",
    fontWeight: "bold",
  },
};