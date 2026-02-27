import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";

/* Helper: Format time ago */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function GuardianStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedReport, setSelectedReport] = useState("summary");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(7);

  // colors used by student report pages; guardian will adopt same palette
  const reportColors = {
    summary: "#64748b",
    letters: "#10b981",       // green
    words: "#8b5cf6",         // purple
    sentences: "#3b82f6",     // blue
  };
  const currentColor = reportColors[selectedReport] || "#3b82f6";  // fallback

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  useEffect(() => {
    if (student) {
      fetchSummary();
    }
  }, [student, timeframe]);

  useEffect(() => {
    if (selectedReport !== "summary") {
      fetchReport(selectedReport);
    }
  }, [selectedReport]);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/guardian/students/${studentId}`);
      setStudent(data.student);
    } catch (err) {
      console.error("Failed to fetch student:", err);
      setError("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiFetch(
        `/api/guardian/students/${studentId}/summary?timeframe=${timeframe}`
      );
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const fetchReport = async (reportType) => {
    try {
      setLoading(true);
      let url = "";
      if (reportType === "words") {
        url = `/api/guardian/students/${studentId}/report/words`;
      } else if (reportType === "sentences") {
        url = `/api/guardian/students/${studentId}/report/sentences`;
      } else if (reportType === "letters") {
        url = `/api/guardian/students/${studentId}/report/letters`;
      }

      if (url) {
        const data = await apiFetch(url);
        setReportData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError(`Failed to load ${reportType} report`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !student) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Loading student details...</div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate("/guardian/dashboard")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <div style={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate("/guardian/dashboard")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        {student && (
          <div style={styles.studentHeader}>
            <div style={styles.avatarLarge}>
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={styles.studentName}>{student.name}</h1>
              <p style={styles.studentEmail}>{student.email}</p>
              {student.age != null && (
                <p style={styles.studentMeta}>Age: {student.age}</p>
              )}
              {student.lastActive && (
                <p style={styles.studentMeta}>
                  Last active: {new Date(student.lastActive).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Navigation */}
      <div style={styles.reportNav}>
        <button
          onClick={() => setSelectedReport("summary")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "summary" ? styles.reportBtnActive(reportColors.summary) : {}),
          }}
        >
          Summary
        </button>
        <button
          onClick={() => setSelectedReport("letters")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "letters" ? styles.reportBtnActive(reportColors.letters) : {}),
          }}
        >
          Letters Report
        </button>
        <button
          onClick={() => setSelectedReport("words")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "words" ? styles.reportBtnActive(reportColors.words) : {}),
          }}
        >
          Words Report
        </button>
        <button
          onClick={() => setSelectedReport("sentences")}
          style={{
            ...styles.reportBtn,
            ...(selectedReport === "sentences" ? styles.reportBtnActive(reportColors.sentences) : {}),
          }}
        >
          Sentences Report
        </button>
      </div>

      {/* Summary Cards */}
      {selectedReport === "summary" && summary && (
        <div style={styles.summarySection}>
          <div style={styles.summaryGrid}>
            {student && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: "#1e40af" }}>👤</div>
                <h3 style={styles.cardTitle}>Profile</h3>
                <div style={styles.cardStat}>{student.name}</div>
                {student.age != null && <div style={styles.cardSubValue}>Age: {student.age}</div>}
                <div style={styles.cardSubValue}>{student.email}</div>
                {student.createdAt && (
                  <div style={{ ...styles.cardSubValue, fontSize: 12, marginTop: 4, color: "#94a3b8" }}>
                    Member since {new Date(student.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
            {student && student.lastActive && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: "#059669" }}>⏱️</div>
                <h3 style={styles.cardTitle}>Activity</h3>
                <div style={styles.cardStat}>{new Date(student.lastActive).toLocaleString()}</div>
                <div style={styles.cardSubValue}>{getTimeAgo(new Date(student.lastActive))}</div>
              </div>
            )}
            {summary.sentences && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: reportColors.sentences }}>📖</div>
                <h3 style={styles.cardTitle}>Sentences</h3>
                <div style={styles.cardStat}>{summary.sentences.total}</div>
                <div style={styles.cardSubValue}>Success: {summary.sentences.successRate}%</div>
              </div>
            )}
            {summary.words && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: reportColors.words }}>💬</div>
                <h3 style={styles.cardTitle}>Words</h3>
                <div style={styles.cardStat}>{summary.words.total}</div>
                <div style={styles.cardSubValue}>Success: {summary.words.successRate}%</div>
              </div>
            )}
            {summary.letters && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: reportColors.letters }}>🔤</div>
                <h3 style={styles.cardTitle}>Letters</h3>
                <div style={styles.cardStat}>{summary.letters.total}</div>
                <div style={styles.cardSubValue}>Strength: {summary.letters.avgStrength}%</div>
              </div>
            )}
            {summary && (
              <div style={{ ...styles.summaryCard, cursor: "default" }}>
                <div style={{ ...styles.cardIcon, color: "#64748b" }}>📊</div>
                <h3 style={styles.cardTitle}>Total Attempts</h3>
                <div style={styles.cardStat}>
                  {(summary.sentences?.total || 0) + (summary.words?.total || 0) + (summary.letters?.total || 0)}
                </div>
              </div>
            )}
          </div>

          <div style={styles.timeframeControl}>
            <label style={styles.timeframeLabel}>Filter by timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              style={styles.timeframeSelect}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      )}

      {/* Letter Report */}
      {selectedReport === "letters" && reportData && (
        <div style={styles.reportSection}>
          <h2 style={{...styles.reportTitle, borderBottomColor: currentColor}}>Letters Report</h2>
          <div style={styles.reportStats}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Total Letters:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.letters?.length || 0}</span>
            </div>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>Letter</th>
                  <th style={styles.tableCell}>Strength</th>
                  <th style={styles.tableCell}>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {reportData.letters?.map((letter, idx) => (
                  <tr key={idx} style={styles.tableRow}>
                    <td style={styles.tableCell}>{letter.letter}</td>
                    <td style={styles.tableCell}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${letter.strength}%`,
                            background: currentColor,
                          }}
                        />
                      </div>
                      <span>{letter.strength}%</span>
                    </td>
                    <td style={styles.tableCell}>{letter.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Words Report */}
      {selectedReport === "words" && reportData && (
        <div style={styles.reportSection}>
          <h2 style={{...styles.reportTitle, borderBottomColor: currentColor}}>Words Report</h2>
          <div style={styles.reportStats}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Total Attempts:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.total}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Success Rate:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.successRate}%</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Average Accuracy:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.avgAccuracy}%</span>
            </div>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>Word</th>                  <th style={styles.tableCell}>Spoken</th>                  <th style={styles.tableCell}>Correct</th>
                  <th style={styles.tableCell}>Accuracy</th>
                  <th style={styles.tableCell}>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.attempts?.slice(0, 20).map((attempt, idx) => (
                  <tr key={idx} style={styles.tableRow}>
                    <td style={styles.tableCell}>{attempt.word}</td>
                    <td style={styles.tableCell}>{attempt.spoken || ""}</td>
                    <td style={styles.tableCell}>
                      {attempt.correct ? "✓" : "✗"}
                    </td>
                    <td style={styles.tableCell}>{attempt.accuracy}%</td>
                    <td style={styles.tableCell}>
                      {new Date(attempt.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sentences Report */}
      {selectedReport === "sentences" && reportData && (
        <div style={styles.reportSection}>
          <h2 style={{...styles.reportTitle, borderBottomColor: currentColor}}>Sentences Report</h2>
          <div style={styles.reportStats}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Total Attempts:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.total}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Success Rate:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.successRate}%</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Average Accuracy:</span>
              <span style={{...styles.statValue, color: currentColor}}>{reportData.avgAccuracy}%</span>
            </div>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>Sentence</th>
                  <th style={styles.tableCell}>Spoken</th>
                  <th style={styles.tableCell}>Correct</th>
                  <th style={styles.tableCell}>Accuracy</th>
                  <th style={styles.tableCell}>Response Time</th>
                  <th style={styles.tableCell}>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.attempts?.slice(0, 20).map((attempt, idx) => (
                  <tr key={idx} style={styles.tableRow}>
                    <td style={{ ...styles.tableCell, maxWidth: "250px" }}>
                      {attempt.sentence}
                    </td>
                    <td style={styles.tableCell}>{attempt.spoken || ""}</td>
                    <td style={styles.tableCell}>
                      {attempt.correct ? "✓" : "✗"}
                    </td>
                    <td style={styles.tableCell}>{attempt.accuracy}%</td>
                    <td style={styles.tableCell}>{attempt.responseTime}ms</td>
                    <td style={styles.tableCell}>
                      {new Date(attempt.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div style={styles.loadingMessage}>Loading report...</div>
      )}
    </div>
  );
}

// ---- styles updated to match student report theme ----
const styles = {
  container: {
    // use student page background/padding
    padding: "32px",
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#f0fdf4",
    fontFamily: "'DM Sans', sans-serif",
    minHeight: "100vh",
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: 16,
    fontSize: 14,
  },
  studentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 24,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
  },
  studentMeta: {
    fontSize: 13,
    color: "#475569",
    margin: 0,
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 24,
    padding: "0 32px",
  },
  summaryCard: {
    background: "white",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    cursor: "pointer",
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: "#0f172a",
  },
  cardStat: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
  },
  cardSubValue: {
    fontSize: 13,
    color: "#64748b",
  },
  profileDetail: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 500,
  },
  timeframeControl: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  timeframeLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "#64748b",
  },
  timeframeSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
  },
  reportNav: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 16,
    overflowX: "auto",
  },

  reportBtn: {
    padding: "8px 16px",
    border: "1px solid #bfdbfe",
    background: "transparent",
    color: "#3b82f6",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    borderRadius: 6,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  reportBtnActive: (color = "#3b82f6") => ({
    color: "white",
    background: color,
    border: `1px solid ${color}`,
  }),
  reportSection: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 20px 0",
    color: "#1e293b",
    padding: "12px 0",
    borderBottom: "3px solid",
    display: "inline-block",
  },
  reportStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: "1px solid #f1f5f9",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1e293b",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  },
  tableCell: {
    padding: "12px",
    textAlign: "left",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
  },
  tableRow: {
    "&:hover": {
      background: "#f8fafc",
    },
  },
  progressBar: {
    width: "100%",
    height: 6,
    background: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  loadingMessage: {
    textAlign: "center",
    padding: 40,
    color: "#64748b",
    fontSize: 16,
  },
  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
  },
};
