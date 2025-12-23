import { useEffect, useState } from "react";
import { apiFetch } from "../api/api";

const TOTAL_LETTERS = 10;

export default function LetterLevel() {
  const [letter, setLetter] = useState(null);
  const [shownAt, setShownAt] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const loadLetter = async () => {
    const res = await apiFetch("/api/letters/next");
    setLetter(res.letter);
    setShownAt(Date.now());
  };

  useEffect(() => {
    loadLetter();
  }, []);

  const submitAttempt = async (correct) => {
    const responseTimeMs = Date.now() - shownAt;

    await apiFetch("/api/letters/attempt", {
      method: "POST",
      body: JSON.stringify({
        letter,
        correct,
        responseTimeMs,
      }),
    });

    setAttempts((prev) => [...prev, { letter, correct, responseTimeMs }]);

    if (index + 1 === TOTAL_LETTERS) {
      setDone(true);
    } else {
      setIndex(index + 1);
      loadLetter();
    }
  };

  if (done) {
    const accuracy =
      (attempts.filter((a) => a.correct).length / attempts.length) * 100;

    const avgTime =
      attempts.reduce((s, a) => s + a.responseTimeMs, 0) / attempts.length;

    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h2>Letter Level Report</h2>
        <p>Accuracy: {accuracy.toFixed(1)}%</p>
        <p>Avg Response Time: {(avgTime / 1000).toFixed(2)}s</p>

        <h3>Attempts</h3>
        <ul>
          {attempts.map((a, i) => (
            <li key={i}>
              {a.letter} – {a.correct ? "Correct" : "Wrong"} –{" "}
              {(a.responseTimeMs / 1000).toFixed(2)}s
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!letter) return <div>Loading...</div>;

  return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <h1 style={{ fontSize: "6rem" }}>{letter}</h1>

      <button
        onClick={() => submitAttempt(true)}
        style={{ margin: 10, padding: 15 }}
      >
        Correct
      </button>

      <button
        onClick={() => submitAttempt(false)}
        style={{ margin: 10, padding: 15 }}
      >
        Wrong
      </button>

      <p>
        {index + 1} / {TOTAL_LETTERS}
      </p>
    </div>
  );
}
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  const startTime = Date.now();

  setTimeout(() => {
    recorder.stop();

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      const responseTimeMs = Date.now() - startTime;

      const formData = new FormData();
      formData.append("audio", blob);
      formData.append("letter", letter);
      formData.append("responseTimeMs", responseTimeMs);

      await fetch("http://localhost:5001/api/letters/attempt", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      loadLetter();
    };
  }, 3000);
};
