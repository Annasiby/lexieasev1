import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TrainingDocsPage from "./pages/TrainingDocsPage";

import StudentLayout from "./student/StudentLayout";
import Toggle from "./student/Toggle";
import Dashboard from "./student/Dashboard";

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
  const location = useLocation();

  return (
    <>
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
          <Route path="word-level" element={<WordLevel />} />
          <Route path="sentence-level" element={<SentenceLevel />} />
          <Route path="training-docs" element={<TrainingDocsPage role="student" />} />
        </Route>

        {/* -------- Teacher -------- */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TrainingDocsPage role="teacher" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/training-docs"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TrainingDocsPage role="teacher" />
            </ProtectedRoute>
          }
        />

        {/* -------- Parent -------- */}
        <Route
          path="/parent/dashboard"
          element={
            <ProtectedRoute allowedRoles={["parent"]}>
              <TrainingDocsPage role="parent" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/training-docs"
          element={
            <ProtectedRoute allowedRoles={["parent"]}>
              <TrainingDocsPage role="parent" />
            </ProtectedRoute>
          }
        />

        {/* -------- Admin -------- */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <div style={placeholderStyle}>
                <h1>Admin Dashboard</h1>
                <p>Coming Soon</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* -------- Catch All -------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UploadDocsShortcut pathname={location.pathname} />
    </>
  );
}

function UploadDocsShortcut({ pathname }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user || !["student", "teacher", "parent"].includes(user.role)) return null;

  const uploadPathByRole = {
    student: "/student/training-docs",
    teacher: "/teacher/training-docs",
    parent: "/parent/training-docs",
  };

  const targetPath = uploadPathByRole[user.role];
  if (!targetPath || pathname === targetPath) return null;

  return (
    <button style={shortcutStyles.button} onClick={() => navigate(targetPath)}>
      Upload Docs
    </button>
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

const shortcutStyles = {
  button: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 9999,
    border: "none",
    borderRadius: 999,
    background: "#0f172a",
    color: "white",
    fontWeight: 700,
    fontSize: 14,
    padding: "12px 16px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(2, 6, 23, 0.28)",
  },
};

export default App;
