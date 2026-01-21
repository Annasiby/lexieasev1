import { useState } from "react";
import Login from "./auth/Login";
import LetterLevel from "./student/LetterLevel";
import SentenceLevel from "./student/SentenceLevel";

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("letters"); // "letters" | "sentences"

  if (!user) return <Login onLogin={setUser} />;

  if (user.role === "student") {
    return (
      <div style={{ textAlign: "center", marginTop: 20 }}>
        {/* Simple navigation */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setMode("letters")}
            disabled={mode === "letters"}
            style={{ marginRight: 10 }}
          >
            Letter Practice
          </button>

          <button
            onClick={() => setMode("sentences")}
            disabled={mode === "sentences"}
          >
            Sentence Practice
          </button>
        </div>

        {mode === "letters" && <LetterLevel />}
        {mode === "sentences" && <SentenceLevel />}
      </div>
    );
  }

  return <div>Logged in as {user.role}</div>;
}

export default App;