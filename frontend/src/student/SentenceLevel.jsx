import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/api";
import { computeVisualHesitationScore } from "../utils/visionUtils";
import {
  initializeEyeTracking,
  startSegment,
  endSegment,
  getSegmentMetrics,
  shutdownEyeTracking,
} from "../utils/eyeTrackingController";

function SentenceLevel() {
  const [sentence, setSentence] = useState(null);
  const [sentenceId, setSentenceId] = useState(null);
  const [spoken, setSpoken] = useState("");
  const [shownAt, setShownAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef(null);
  const spokenRef = useRef("");
  const shouldSubmitRef = useRef(false);
  
  const sentenceIdRef = useRef(null);
  const sentenceRef = useRef(null);
  const shownAtRef = useRef(null);
  const videoRef = useRef(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current) {
        console.log("Initializing eye tracking...");
        initializeEyeTracking(videoRef.current);
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      shutdownEyeTracking();
    };
  }, []);

  useEffect(() => {
    sentenceIdRef.current = sentenceId;
    sentenceRef.current = sentence;
    shownAtRef.current = shownAt;
  }, [sentenceId, sentence, shownAt]);

  /* =========================
     Varied Feedback Messages
  ========================== */
  const getSuccessFeedback = () => {
    const messages = [
      "Excellent work! Keep it up!",
      "Perfect! You nailed it!",
      "Fantastic! You're doing great!",
      "Amazing job! Keep going!",
      "Superb! You're on fire!",
      "Outstanding! Well done!",
      "Brilliant! That was perfect!",
      "Wonderful! You've got this!",
      "Incredible! Keep that momentum!",
      "Great job! You're improving!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getMotivatingFeedback = () => {
    const messages = [
      "You're so close! Try again!",
      "Almost there! You can do it!",
      "You're getting better! Keep trying!",
      "Nice effort! You're almost perfect!",
      "Keep going! You're improving!",
      "You're near! One more time!",
      "Great attempt! Try once more!",
      "You're on the right track!",
      "So close! Don't give up!",
      "You're doing well! Keep practicing!",
      "Almost perfect! You've got this!",
      "Good try! You're getting there!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  /* =========================
     Load next sentence (Bandit)
  ========================== */
  const loadSentence = async () => {
    try {
      const res = await apiFetch("/api/sentences/next");
      console.log("✅ Sentence loaded:", res);
      setSentence(res.sentence);
      setSentenceId(res.sentenceId);
      setFeedback(null);
      setSpoken("");
      spokenRef.current = "";
      startSegment();
      setShownAt(Date.now());
    } catch (error) {
      console.error("❌ Failed to load sentence:", error);
      setSentence("Error loading sentence. Please refresh.");
    }
  };

  useEffect(() => {
    loadSentence();
  }, []);

  /* =========================
     Audio Feedback
  ========================== */
  const speakFeedback = (feedback) => {
    if (!("speechSynthesis" in window)) return;

    const text = feedback.sentenceCorrect
      ? getSuccessFeedback()
      : getMotivatingFeedback();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Make it more enthusiastic
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  /* =========================
     Submit Attempt → Bandit
  ========================== */
  const submitAttempt = async () => {
    console.log("📤 submitAttempt called");
    
    if (!sentenceIdRef.current || !sentenceRef.current || !spokenRef.current || !shownAtRef.current) {
      console.log("❌ Missing data, aborting submit");
      return;
    }

    endSegment();
    
    const metrics = getSegmentMetrics();
    const responseTimeMs = Date.now() - shownAtRef.current;
    
    let visionResult = { usable: false, score: 0, isHard: false };

    if (responseTimeMs >= 2000) {  // sentences need longer threshold
      visionResult = computeVisualHesitationScore(metrics);
    }

    console.log("=== SENTENCE VISION DEBUG ===");
    console.log("Response Time:", responseTimeMs);
    console.log("Samples:", metrics.samples);
    console.log("Fixations:", metrics.fixationCount);
    console.log("Mean Duration:", metrics.meanFixationDuration);
    console.log("Score:", visionResult.score);
    console.log("IsHard:", visionResult.isHard);

    try {
      const payload = {
        sentenceId: sentenceIdRef.current,
        expected: sentenceRef.current,
        spoken: spokenRef.current,
        responseTimeMs: Date.now() - shownAtRef.current,
        visualScore: visionResult.score,
        visualIsHard: visionResult.isHard,
      };
      
      console.log("📤 Sending to API:", payload);

      const res = await apiFetch("/api/sentences/attempt", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("✅ API Response:", res);

      // Add varied feedback message
      const feedbackMessage = res.sentenceCorrect
        ? getSuccessFeedback()
        : getMotivatingFeedback();

      setFeedback({
        ...res,
        displayMessage: feedbackMessage,
      });
      
      speakFeedback(res);

      // 🔥 Load next sentence after delay
      setTimeout(() => {
        console.log("⏭️ Loading next sentence...");
        loadSentence();
      }, 1600);
    } catch (error) {
      console.error("❌ Failed to submit attempt:", error);
      setFeedback({
        sentenceCorrect: false,
        displayMessage: "Connection error. Please try again.",
      });
    }
  };

  /* =========================
     Speech Recognition Setup
  ========================== */
  useEffect(() => {
    console.log("🎙️ Setting up speech recognition (ONCE)");
    
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      console.log("🎙️ Recognition started");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log(`🎤 Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
      
      spokenRef.current = transcript;
      setSpoken(transcript);
    };

    recognition.onerror = (event) => {
      console.error("❌ Recognition error:", event.error);
      setIsRecording(false);
      shouldSubmitRef.current = false;
    };

    recognition.onend = () => {
      console.log(`🎙️ Recognition ended. hasTranscript: ${!!spokenRef.current}`);
      setIsRecording(false);

      // ✅ AUTO-SUBMIT if we have a transcript
      if (spokenRef.current) {
        console.log("✅ Calling submitAttempt");
        submitAttempt();
      } else {
        console.log("⚠️ Not submitting - no transcript");
      }

      shouldSubmitRef.current = false;
    };

    recognitionRef.current = recognition;
    console.log("✅ Speech recognition ready");

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        console.log("🧹 Recognition cleaned up on unmount");
      }
    };
  }, []); // Empty array - only setup once

  /* =========================
     Cleanup speech synthesis
  ========================== */
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* =========================
     Controls
  ========================== */
  const startRecording = () => {
    console.log("▶️ START button clicked");
    
    if (!recognitionRef.current) {
      console.log("❌ No recognition object");
      return;
    }

    setSpoken("");
    spokenRef.current = "";
    setFeedback(null);
    setShownAt(Date.now());
    shouldSubmitRef.current = false;

    try {
      setIsRecording(true);
      recognitionRef.current.start();
      console.log("🎙️ Starting recognition...");
    } catch (error) {
      console.error("❌ Start error:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("⏹️ STOP button clicked");
    
    if (!recognitionRef.current) {
      console.log("❌ No recognition object");
      return;
    }

    shouldSubmitRef.current = true;
    console.log("✅ Set shouldSubmit = true");
    
    try {
      recognitionRef.current.stop();
      console.log("🎙️ Stopping recognition...");
    } catch (error) {
      console.error("❌ Stop error:", error);
    }
  };

  /* =========================
     UI
  ========================== */
  if (!sentence)
    return <div style={styles.loading}>Preparing your session…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />

        <p style={styles.subtitle}>Read this sentence clearly</p>

        <div style={styles.sentenceWrap}>
          <h1 style={styles.sentence}>{sentence}</h1>
        </div>

        <div style={styles.controls}>
          <button
            onClick={startRecording}
            disabled={isRecording}
            style={{
              ...styles.micBtn,
              ...(isRecording ? styles.micActive : {}),
            }}
          >
            {isRecording ? "🔴" : "🎤"}
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            style={styles.stopBtn}
          >
            Stop
          </button>
        </div>

        {spoken && (
          <div style={styles.spokenCard}>
            <span style={styles.label}>You said</span>
            <p style={styles.spokenText}>{spoken}</p>
          </div>
        )}

        {feedback && (
          <div
            style={{
              ...styles.feedback,
              background: feedback.sentenceCorrect
                ? "linear-gradient(135deg,#ecfeff,#d1fae5)"
                : "linear-gradient(135deg,#fff7ed,#ffe4b5)",
            }}
          >
            <strong style={styles.feedbackMessage}>
              {feedback.displayMessage || feedback.message}
            </strong>

            {feedback.problemLetters?.length > 0 && (
              <p style={styles.coach}>
                💡 Focus on:{" "}
                <strong>{feedback.problemLetters.join(", ")}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Styles
========================== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #eef2ff 0%, #f8fafc 60%)",
    display: "flex",
    justifyContent: "center",
    paddingTop: 80,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: 820,
    background: "white",
    borderRadius: 24,
    padding: "48px",
    boxShadow: "0 30px 60px rgba(15,23,42,0.12)",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 36,
    color: "#1e293b",
  },
  sentenceWrap: {
    padding: "48px",
    borderRadius: 24,
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    color: "white",
    marginBottom: 56,
    boxShadow: "0 10px 30px rgba(30,64,175,0.3)",
  },
  sentence: {
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1.4,
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    marginBottom: 30,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "none",
    fontSize: 32,
    background: "#1e40af",
    color: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(30,64,175,0.4)",
  },
  micActive: {
    background: "#dc2626",
    animation: "pulse 1.5s infinite",
  },
  stopBtn: {
    padding: "16px 28px",
    borderRadius: 14,
    border: "1px solid #c7d2fe",
    background: "white",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  spokenCard: {
    background: "#f1f5f9",
    borderRadius: 14,
    padding: 20,
    textAlign: "left",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  spokenText: {
    fontSize: 18,
    marginTop: 8,
    color: "#1e293b",
  },
  feedback: {
    marginTop: 24,
    padding: 22,
    borderRadius: 16,
    border: "2px solid rgba(0,0,0,0.05)",
  },
  feedbackMessage: {
    fontSize: 20,
    color: "#1e293b",
  },
  coach: {
    marginTop: 12,
    fontSize: 15,
    color: "#475569",
  },
  loading: {
    marginTop: 120,
    fontSize: 20,
    textAlign: "center",
    color: "#64748b",
  },
};

export default SentenceLevel;