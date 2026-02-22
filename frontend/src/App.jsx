import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import StudentLayout from "./student/StudentLayout";
import Toggle from "./student/Toggle";
import Dashboard from "./student/studentDashboard.jsx";

import LetterLevel from "./student/LetterLevel";
import TwoLetterLevel from "./student/TwoLetterLevel";
import WordLevel from "./student/WordLevel";
import SentenceLevel from "./student/SentenceLevel.jsx";

/* ================= Protected Route ================= */
function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ================= App ================= */
function App() {
  return (
    <Routes>
      {/* -------- Public Routes -------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* -------- Student Routes -------- */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        {/* student home */}
        <Route index element={<Toggle />} />

        {/* dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* learning levels (same logic as upstream, just routed) */}
        <Route path="letter-level" element={<LetterLevel />} />
        <Route path="word-level" element={<TwoLetterLevel />} />
        <Route path="sentence-level" element={<SentenceLevel />} />
      </Route>

      {/* -------- Teacher -------- */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <Placeholder title="Teacher Dashboard" />
          </ProtectedRoute>
        }
      />

      {/* -------- Parent -------- */}
      <Route
        path="/parent/dashboard"
        element={
          <ProtectedRoute allowedRoles={["parent"]}>
            <Placeholder title="Parent Dashboard" />
          </ProtectedRoute>
        }
      />

      {/* -------- Admin -------- */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Placeholder title="Admin Dashboard" />
          </ProtectedRoute>
        }
      />

      {/* -------- Catch All -------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ================= Placeholder ================= */
function Placeholder({ title }) {
  return (
    <div style={placeholderStyle}>
      <h1>{title}</h1>
      <p>Coming Soon</p>
    </div>
  );
}

const placeholderStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
};

export default App;

