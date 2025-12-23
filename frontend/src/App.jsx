import { useState } from "react";
import Login from "./auth/Login";
import LetterLevel from "./student/LetterLevel";

function App() {
  const [user, setUser] = useState(null);

  if (!user) return <Login onLogin={setUser} />;

  if (user.role === "student") {
    return <LetterLevel />;
  }

  return <div>Logged in as {user.role}</div>;
}

export default App;
