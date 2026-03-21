import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/api";

const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

const getExtension = (filename = "") => {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
};

export default function TrainingDocsPage({ role }) {
  const [docs, setDocs] = useState([]);
  const [relations, setRelations] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [shareMode, setShareMode] = useState("all-linked");
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isTeacher = role === "teacher";
  const isParent = role === "parent";
  const isStudent = role === "student";
  const relationField = isTeacher ? "studentIds" : "childIds";
  const relationLabel = isTeacher ? "students" : "children";

  const headerText = useMemo(() => {
    if (isStudent) return "Upload your own training document";
    if (isTeacher) return "Upload a document for your students";
    return "Upload a document for your child";
  }, [isStudent, isTeacher]);

  const loadMine = async () => {
    const res = await apiFetch("/api/training-documents/mine");
    setDocs(res.documents || []);
  };

  const loadRelations = async () => {
    if (isTeacher) {
      const list = await apiFetch("/api/relationships/my-students");
      setRelations(list || []);
      return;
    }

    if (isParent) {
      const list = await apiFetch("/api/relationships/my-children");
      setRelations(list || []);
    }
  };

  useEffect(() => {
    loadMine();
    loadRelations();
  }, [role]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Please choose a document file.");
      return;
    }

    const ext = getExtension(file.name || "");
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }

    if (file.size > MAX_DOC_SIZE_BYTES) {
      setError(`File is too large. Maximum allowed size is ${MAX_DOC_SIZE_MB} MB.`);
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("document", file);
      if (title.trim()) form.append("title", title.trim());

      if (!isStudent) {
        form.append("shareMode", shareMode);
        if (shareMode === "selected") {
          form.append(relationField, JSON.stringify(selectedIds));
        }
      }

      const res = await apiFetch("/api/training-documents/upload", {
        method: "POST",
        body: form,
      });

      setMessage(
        `Uploaded. Extracted ${res.extracted.words} words and ${res.extracted.sentences} sentences.`
      );
      setTitle("");
      setFile(null);
      setSelectedIds([]);
      await loadMine();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{headerText}</h1>
        <p style={styles.subtitle}>
          Uploaded text is mapped into words and sentences for meaningful MAB-based training.
        </p>
        <p style={styles.rules}>
          Allowed formats: PDF, DOCX, TXT. Maximum size: {MAX_DOC_SIZE_MB} MB.
        </p>

        <form onSubmit={handleUpload} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Document title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="file"
            onChange={(e) => {
              const picked = e.target.files?.[0] || null;
              setFile(picked);
              setError("");
              if (!picked) return;

              const ext = getExtension(picked.name || "");
              if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setError("Only PDF, DOCX, and TXT files can be selected.");
                return;
              }

              if (picked.size > MAX_DOC_SIZE_BYTES) {
                setError(`Selected file is too large. Limit is ${MAX_DOC_SIZE_MB} MB.`);
              }
            }}
            style={styles.input}
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          />

          {!isStudent && (
            <>
              <select
                style={styles.input}
                value={shareMode}
                onChange={(e) => setShareMode(e.target.value)}
              >
                <option value="all-linked">Use for all linked {relationLabel}</option>
                <option value="selected">Use for selected {relationLabel}</option>
              </select>

              {shareMode === "selected" && relations.length > 0 && (
                <div style={styles.selectionBox}>
                  {relations.map((person) => (
                    <label key={person._id} style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(person._id)}
                        onChange={() => toggleSelect(person._id)}
                      />
                      <span>{person.name} ({person.email})</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>My Uploaded Documents</h2>
        {docs.length === 0 ? (
          <p style={styles.empty}>No documents uploaded yet.</p>
        ) : (
          <div style={styles.list}>
            {docs.map((doc) => (
              <div key={doc._id} style={styles.listItem}>
                <div>
                  <strong>{doc.title}</strong>
                  <div style={styles.meta}>
                    share: {doc.shareMode} | {new Date(doc.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f8fafc",
    display: "grid",
    gap: 20,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
  },
  title: { margin: 0, fontSize: 28, color: "#0f172a" },
  subtitle: { marginTop: 8, color: "#64748b" },
  rules: { marginTop: 8, color: "#334155", fontSize: 13 },
  form: { marginTop: 16, display: "grid", gap: 12 },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "white",
  },
  selectionBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    maxHeight: 180,
    overflow: "auto",
  },
  checkboxRow: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
    color: "#334155",
    fontSize: 14,
  },
  button: {
    border: "none",
    borderRadius: 10,
    background: "#1d4ed8",
    color: "white",
    padding: "11px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  success: { color: "#166534", marginTop: 10 },
  error: { color: "#991b1b", marginTop: 10 },
  sectionTitle: { margin: 0, fontSize: 20, color: "#0f172a" },
  empty: { color: "#64748b", marginTop: 10 },
  list: { marginTop: 14, display: "grid", gap: 10 },
  listItem: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    background: "#f8fafc",
  },
  meta: { color: "#64748b", marginTop: 4, fontSize: 13 },
};
