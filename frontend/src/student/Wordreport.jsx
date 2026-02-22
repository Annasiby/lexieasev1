import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

export default function WordReport() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(7);
  const [userInfo, setUserInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [user, data] = await Promise.all([
          apiFetch('/api/auth/me'),
          apiFetch(`/api/reports/student/words?timeframe=${timeframe}`),
        ]);
        setUserInfo(user);
        setReport(data);
      } catch (error) {
        console.error("Failed to fetch word report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [timeframe]);

  const downloadPDFReport = () => {
    if (!report?.metrics) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const { metrics } = report;
      const studentName = userInfo?.name || "Student";

      // Header
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("LexCura Speech Therapy", 105, 14, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Word Practice Report", 105, 22, { align: "center" });

      // Report info
      doc.setTextColor(0, 0, 0);
      let yPos = 40;
      doc.setDrawColor(139, 92, 246);
      doc.rect(15, yPos, 180, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Report Information", 20, yPos + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Student Name: ${studentName}`, 20, yPos + 14);
      doc.text(`Report Period: Last ${timeframe} Days`, 20, yPos + 19);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 120, yPos + 14);
      doc.text(`Total Sessions: ${metrics.overview?.totalAttempts || 0}`, 120, yPos + 19);

      // KPIs
      yPos += 35;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(139, 92, 246);
      doc.text("Key Performance Indicators", 20, yPos);
      yPos += 8;
      doc.autoTable({
        startY: yPos,
        head: [["Metric", "Value", "Status"]],
        body: [
          ["Success Rate", `${metrics.overview?.successRate || 0}%`, parseFloat(metrics.overview?.successRate || 0) >= 70 ? "Good" : "Needs Improvement"],
          ["Avg Response Time", `${((metrics.overview?.avgResponseTime || 0) / 1000).toFixed(1)}s`, (metrics.overview?.avgResponseTime || 0) < 3000 ? "Fast" : "Moderate"],
          ["Trend", metrics.trend?.direction?.toUpperCase() || "STABLE", metrics.trend?.direction === "improving" ? "Positive" : metrics.trend?.direction === "declining" ? "Needs Attention" : "Stable"],
        ],
        theme: "striped",
        styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [139, 92, 246] },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Problem words
      if (metrics.problemWords?.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(239, 68, 68);
        doc.text("Problem Words", 20, yPos);
        yPos += 8;
        doc.autoTable({
          startY: yPos,
          head: [["Word", "Errors", "Error Rate"]],
          body: metrics.problemWords.map(item => [item.word.toUpperCase(), item.errorCount, `${item.errorRate}%`]),
          theme: "striped",
          styles: { font: "helvetica", fontSize: 9 },
          headStyles: { fillColor: [239, 68, 68] },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }

      // Problem letters
      if (metrics.problemLetters?.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(239, 68, 68);
        doc.text("Problem Phonemes", 20, yPos);
        yPos += 8;
        doc.autoTable({
          startY: yPos,
          head: [["Letter", "Errors", "Error Rate"]],
          body: metrics.problemLetters.map(item => [item.letter.toUpperCase(), item.errorCount, `${item.errorRate}%`]),
          theme: "striped",
          styles: { font: "helvetica", fontSize: 9 },
          headStyles: { fillColor: [239, 68, 68] },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }

      // Daily progress
      if (metrics.daily?.length > 0) {
        doc.addPage();
        yPos = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(139, 92, 246);
        doc.text("Daily Progress", 20, yPos);
        yPos += 8;
        doc.autoTable({
          startY: yPos,
          head: [["Date", "Sessions", "Success Rate"]],
          body: metrics.daily.map(day => [
            new Date(day.date).toLocaleDateString(),
            day.attempts,
            `${day.successRate}%`,
          ]),
          theme: "striped",
          styles: { font: "helvetica", fontSize: 9 },
          headStyles: { fillColor: [139, 92, 246] },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(20, 285, 190, 285);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("LexCura Speech Therapy - Confidential Clinical Report", 20, 290);
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: "right" });
      }

      doc.save(`LexCura_Word_Report_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF error:", error);
      alert("Failed to generate report.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading word report...</p>
      </div>
    );
  }

  if (!report?.metrics) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🔡</div>
        <h2 style={styles.emptyTitle}>No Word Data Yet</h2>
        <p style={styles.emptyText}>Complete some word exercises to see your report here.</p>
        <button style={styles.startButton} onClick={() => navigate("/student/word-level")}>
          Start Practicing Words
        </button>
      </div>
    );
  }

  const { metrics } = report;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
         
          <h1 style={styles.title}>🔡 Word Practice Report</h1>
          <p style={styles.subtitle}>Welcome, {userInfo?.name || 'Student'}</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={downloading ? styles.downloadButtonDisabled : styles.downloadButton}
            onClick={downloadPDFReport}
            disabled={downloading}
          >
            {downloading ? '⏳ Generating...' : '📥 Download PDF'}
          </button>
          <div style={styles.filterContainer}>
            {[7, 30, 90].map(t => (
              <button
                key={t}
                style={timeframe === t ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setTimeframe(t)}
              >
                {t} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        <StatCard icon="🎯" label="Success Rate" value={`${metrics.overview.successRate}%`} trend={metrics.trend} color="#8b5cf6" />
        <StatCard icon="⚡" label="Avg Response Time" value={`${(metrics.overview.avgResponseTime / 1000).toFixed(1)}s`} color="#f59e0b" />
        <StatCard icon="✅" label="Total Attempts" value={metrics.overview.totalAttempts} subValue={`${metrics.overview.correctAttempts} correct`} color="#10b981" />
        <StatCard icon="📉" label="Trend" value={metrics.trend?.direction === 'insufficient_data' ? 'Not enough data' : metrics.trend?.direction} color="#3b82f6" />
      </div>

      {/* Trend Card */}
     
            {metrics?.trend &&
 metrics.trend.direction !== "insufficient_data" && (
   <TrendCard trend={metrics.trend} />
)}
      

      {/* Problem Areas */}
      <div style={styles.twoColumnGrid}>

        {metrics.problemWords?.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🔡 Problem Words</h3>
            <div style={styles.problemList}>
              {metrics.problemWords.map((item, idx) => (
                <div key={idx} style={styles.problemItem}>
                  <div style={{ ...styles.badge, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    {item.word.toUpperCase()}
                  </div>
                  <div style={styles.problemInfo}>
                    <span style={styles.problemCount}>{item.errorCount} errors</span>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${item.errorRate}%`, background: '#8b5cf6' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.problemLetters?.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🔤 Problem Phonemes</h3>
            <div style={styles.problemList}>
              {metrics.problemLetters.map((item, idx) => (
                <div key={idx} style={styles.problemItem}>
                  <div style={{ ...styles.badge, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                    {item.letter.toUpperCase()}
                  </div>
                  <div style={styles.problemInfo}>
                    <span style={styles.problemCount}>{item.errorCount} errors</span>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${item.errorRate}%`, background: '#ef4444' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Daily Progress Chart */}
      {metrics.daily?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📈 Daily Progress</h3>
          <DailyProgressChart data={metrics.daily} />
        </div>
      )}

      {/* CTA */}
      <div style={styles.ctaCard}>
        <div>
          <h3 style={styles.ctaTitle}>Keep it up! 🚀</h3>
          <p style={styles.ctaText}>Practice words daily to build your vocabulary and pronunciation.</p>
        </div>
        <button style={styles.ctaButton} onClick={() => navigate("/student/word-level")}>
          Continue Practice
        </button>
      </div>

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ icon, label, value, subValue, trend, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}15` }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <div style={styles.statContent}>
        <span style={styles.statLabel}>{label}</span>
        <h3 style={{ ...styles.statValue, color }}>{value}</h3>
        {subValue && <span style={styles.statSubValue}>{subValue}</span>}
        {trend && trend.direction !== 'stable' && trend.direction !== 'insufficient_data' && (
          <TrendBadge direction={trend.direction} change={trend.change} />
        )}
      </div>
    </div>
  );
}

function TrendBadge({ direction, change }) {
  const isImproving = direction === 'improving';
  return (
    <span style={{ ...styles.trendBadge, background: isImproving ? '#dcfce7' : '#fee2e2', color: isImproving ? '#16a34a' : '#dc2626' }}>
      {isImproving ? '↗' : '↘'} {Math.abs(parseFloat(change))}%
    </span>
  );
}

function TrendCard({ trend }) {
  const isImproving = trend.direction === 'improving';
  const isStable = trend.direction === 'stable';
  return (
    <div style={{
      ...styles.trendCard,
      background: isImproving
        ? 'linear-gradient(135deg, #10b981, #34d399)'
        : isStable
        ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
        : 'linear-gradient(135deg, #f59e0b, #fbbf24)'
    }}>
      <div style={styles.trendIcon}>{isImproving ? '🎉' : isStable ? '📊' : '💪'}</div>
      <div style={styles.trendContent}>
        <h3 style={styles.trendTitle}>
          {isImproving ? "You're Improving!" : isStable ? "Steady Progress" : "Let's Focus"}
        </h3>
        <p style={styles.trendText}>
          {isImproving && `Your success rate increased by ${Math.abs(parseFloat(trend.change))}% recently. Keep it up!`}
          {isStable && "Your performance is consistent. Keep practicing!"}
          {!isImproving && !isStable && `Recent success rate dropped by ${Math.abs(parseFloat(trend.change))}%. Focus on problem words below.`}
        </p>
        <div style={styles.trendStats}>
          <div>
            <span style={styles.trendStatLabel}>Previous</span>
            <span style={styles.trendStatValue}>{(trend.previousAvg * 100).toFixed(1)}%</span>
          </div>
          <div style={styles.trendArrow}>→</div>
          <div>
            <span style={styles.trendStatLabel}>Recent</span>
            <span style={styles.trendStatValue}>{trend.recentAccuracy}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyProgressChart({ data }) {
  const maxRate = Math.max(...data.map(d => parseFloat(d.successRate)));
  return (
    <div style={styles.chartContainer}>
      <div style={styles.chartBars}>
        {data.map((day, idx) => {
          const height = maxRate > 0 ? (parseFloat(day.successRate) / maxRate) * 100 : 0;
          return (
            <div key={idx} style={styles.chartBarWrapper}>
              <div style={styles.chartBarAccuracy}>{day.successRate}%</div>
              <div style={{
                ...styles.chartBar,
                height: `${height}%`,
                background: parseFloat(day.successRate) >= 80 ? '#10b981' : parseFloat(day.successRate) >= 60 ? '#f59e0b' : '#ef4444'
              }} />
              <span style={styles.chartDate}>
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = {
  page: { padding: '32px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' },
  spinner: { width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { fontSize: '16px', color: '#64748b' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '64px', marginBottom: '24px' },
  emptyTitle: { fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' },
  emptyText: { fontSize: '16px', color: '#64748b', marginBottom: '32px', maxWidth: '400px' },
  startButton: { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
  backBtn: { background: 'none', border: 'none', color: '#8b5cf6', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px', padding: 0, display: 'block' },
  title: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: 0 },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  downloadButton: { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  downloadButtonDisabled: { background: '#94a3b8', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', opacity: 0.7, whiteSpace: 'nowrap' },
  filterContainer: { display: 'flex', gap: '8px', background: 'white', padding: '4px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  filterBtn: { padding: '8px 16px', border: 'none', background: 'transparent', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  filterBtnActive: { padding: '8px 16px', border: 'none', background: '#8b5cf6', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' },
  statCard: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '16px', alignItems: 'flex-start' },
  statIcon: { width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  statLabel: { fontSize: '13px', color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: '28px', fontWeight: '700', lineHeight: 1 },
  statSubValue: { fontSize: '13px', color: '#64748b' },
  trendBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', marginTop: '4px' },
  trendCard: { borderRadius: '20px', padding: '32px', marginBottom: '24px', color: 'white', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  trendIcon: { fontSize: '48px', flexShrink: 0 },
  trendContent: { flex: 1 },
  trendTitle: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
  trendText: { fontSize: '15px', opacity: 0.95, marginBottom: '16px', lineHeight: 1.5 },
  trendStats: { display: 'flex', alignItems: 'center', gap: '16px' },
  trendStatLabel: { display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '4px' },
  trendStatValue: { display: 'block', fontSize: '20px', fontWeight: '700' },
  trendArrow: { fontSize: '20px', opacity: 0.8 },
  card: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' },
  cardTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px' },
  twoColumnGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' },
  problemList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  problemItem: { display: 'flex', alignItems: 'center', gap: '16px' },
  badge: { minWidth: '48px', height: '48px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0, padding: '0 8px' },
  problemInfo: { flex: 1 },
  problemCount: { fontSize: '14px', color: '#64748b', display: 'block', marginBottom: '6px' },
  progressBarBg: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  chartContainer: { padding: '8px 0 0' },
  chartBars: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingBottom: '28px', position: 'relative' },
  chartBarWrapper: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', height: '100%', position: 'relative' },
  chartBarAccuracy: { fontSize: '10px', fontWeight: '700', color: '#475569', marginBottom: '2px' },
  chartBar: { width: '100%', borderRadius: '5px 5px 0 0', minHeight: '8px', transition: 'height 0.3s ease' },
  chartDate: { position: 'absolute', bottom: 0, fontSize: '10px', color: '#94a3b8', fontWeight: '500', textAlign: 'center', whiteSpace: 'nowrap' },
  ctaCard: { background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', borderRadius: '20px', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', flexWrap: 'wrap', gap: '20px' },
  ctaTitle: { fontSize: '24px', fontWeight: '700', marginBottom: '8px', marginTop: 0 },
  ctaText: { fontSize: '15px', opacity: 0.9, margin: 0 },
  ctaButton: { background: 'white', color: '#7c3aed', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } } button:hover:not(:disabled) { transform: translateY(-2px); }`;
document.head.appendChild(styleSheet);