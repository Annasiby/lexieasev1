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
    const date = new Date().toLocaleDateString();

    // ── PAGE 1 ──────────────────────────────────────────────────
    // Header
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LexCura Speech Therapy", 105, 13, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Rapid Word Naming — Clinical Progress Report", 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(`Student: ${studentName}   |   Period: Last ${timeframe} Days   |   Generated: ${date}`, 105, 30, { align: "center" });

    // ── SECTION 1: RND Summary ────────────────────────────────
    let y = 46;
    doc.setTextColor(109, 40, 217);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("1. Rapid Naming Performance Summary", 15, y);
    y += 2;
    doc.setDrawColor(109, 40, 217);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 6;

    const successRate = parseFloat(metrics.overview.successRate);
    const avgRTsec = (metrics.overview.avgResponseTime / 1000).toFixed(2);
    const rndInterpretation =
      metrics.overview.avgResponseTime < 2000
        ? "Fast — within typical range for rapid naming"
        : metrics.overview.avgResponseTime < 4000
        ? "Moderate — mild delay; targeted practice recommended"
        : "Slow — significant naming latency; intervention indicated";

    const accuracyLevel =
      successRate >= 80 ? "Strong" : successRate >= 60 ? "Developing" : "Needs Support";

    doc.autoTable({
      startY: y,
      head: [["Metric", "Value", "Clinical Interpretation"]],
      body: [
        ["Word Accuracy", `${metrics.overview.successRate}%`, accuracyLevel],
        ["Correct Responses", `${metrics.overview.correctAttempts} / ${metrics.overview.totalAttempts}`, "Total session attempts"],
        ["Avg Response Time (RND)", `${avgRTsec}s`, rndInterpretation],
        ["Naming Speed Target", "< 2.0s", metrics.overview.avgResponseTime < 2000 ? "✓ Achieved" : "✗ Not yet achieved"],
        ["Trend", metrics.trend?.direction === "insufficient_data" ? "More data needed" : metrics.trend?.direction, 
          metrics.trend?.direction === "improving" ? "Positive trajectory" : metrics.trend?.direction === "declining" ? "Needs attention" : metrics.trend?.direction === "stable" ? "Consistent performance" : "Practice more sessions"],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold" },
      columnStyles: { 2: { cellWidth: 80 } },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── SECTION 2: Response Time Analysis ────────────────────
    doc.setTextColor(109, 40, 217);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Response Time Analysis (Key RND Indicator)", 15, y);
    y += 2;
    doc.line(15, y, 195, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const rtNote = [
      "Rapid Automatic Naming (RAN) speed is a strong predictor of reading fluency.",
      "Target: students with RND should aim to name words in under 2 seconds consistently.",
      `This student's average: ${avgRTsec}s — ${metrics.overview.avgResponseTime < 2000 ? "within target range." : "above target; focused drills on high-frequency words are recommended."}`,
    ];
    rtNote.forEach(line => { doc.text(line, 15, y); y += 5; });
    y += 4;

    // RT Zones table
    doc.autoTable({
      startY: y,
      head: [["Response Time Zone", "Range", "This Student"]],
      body: [
        ["Fluent (RND Low Risk)", "< 2.0s", metrics.overview.avgResponseTime < 2000 ? "✓ Here" : ""],
        ["Borderline", "2.0s – 4.0s", metrics.overview.avgResponseTime >= 2000 && metrics.overview.avgResponseTime < 4000 ? "✓ Here" : ""],
        ["Significant Delay (RND High Risk)", "> 4.0s", metrics.overview.avgResponseTime >= 4000 ? "✓ Here" : ""],
      ],
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [109, 40, 217], textColor: 255 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── SECTION 3: Problem Words ──────────────────────────────
    if (metrics.problemWords?.length > 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("3. High-Error Words (Priority Practice Targets)", 15, y);
      y += 2;
      doc.setDrawColor(220, 38, 38);
      doc.line(15, y, 195, y);
      doc.setDrawColor(109, 40, 217);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [["Word", "Errors", "Error Rate", "RND Priority", "Recommended Drill"]],
        body: metrics.problemWords.map((item, i) => [
          item.word.toUpperCase(),
          item.errorCount,
          `${item.errorRate}%`,
          i < 2 ? "HIGH" : "MEDIUM",
          "Flashcard + timed naming drill"
        ]),
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ── SECTION 4: Problem Phonemes ───────────────────────────
    if (metrics.problemLetters?.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("4. Problem Phonemes (Sound-Level Errors)", 15, y);
      y += 2;
      doc.setDrawColor(220, 38, 38);
      doc.line(15, y, 195, y);
      doc.setDrawColor(109, 40, 217);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [["Sound", "Errors", "Error Rate", "Intervention Note"]],
        body: metrics.problemLetters.map(item => [
          item.letter.toUpperCase(),
          item.errorCount,
          `${item.errorRate}%`,
          `Practise /${item.letter}/ in isolation, then in CVC words`
        ]),
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ── PAGE 2: Daily Progress + RND Action Plan ──────────────
    doc.addPage();
    y = 20;

    if (metrics.daily?.length > 0) {
      doc.setTextColor(109, 40, 217);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("5. Daily Progress Log", 15, y);
      y += 2;
      doc.setDrawColor(109, 40, 217);
      doc.line(15, y, 195, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [["Date", "Sessions", "Success Rate", "Performance"]],
        body: metrics.daily.map(day => [
          new Date(day.date).toLocaleDateString(),
          day.attempts,
          `${day.successRate}%`,
          parseFloat(day.successRate) >= 80 ? "Strong" : parseFloat(day.successRate) >= 60 ? "Developing" : "Needs Practice"
        ]),
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [109, 40, 217], textColor: 255 },
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // ── RND Action Plan ────────────────────────────────────────
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("6. Personalised RND Action Plan", 15, y);
    y += 2;
    doc.setDrawColor(15, 118, 110);
    doc.line(15, y, 195, y);
    y += 6;

    const actions = [];
    if (metrics.overview.avgResponseTime >= 2000)
      actions.push(["Speed Drills", "Daily 5-min timed naming of top 10 error words using flashcards"]);
    if (metrics.problemWords?.length > 0)
      actions.push(["Word Mastery", `Focus on: ${metrics.problemWords.slice(0, 3).map(w => w.word.toUpperCase()).join(", ")} — 20 reps each before next session`]);
    if (metrics.problemLetters?.length > 0)
      actions.push(["Phoneme Drill", `Isolate sounds: ${metrics.problemLetters.slice(0, 3).map(l => l.letter.toUpperCase()).join(", ")} — use minimal pairs`]);
    if (successRate < 60)
      actions.push(["Session Frequency", "Increase to daily short sessions (10 min) rather than longer infrequent ones"]);
    actions.push(["Progress Check", "Re-assess in 2 weeks; compare avg response time and success rate"]);

    doc.autoTable({
      startY: y,
      head: [["Strategy", "Action"]],
      body: actions,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Disclaimer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    const disclaimer = "This report is generated by LexCura and is intended to support — not replace — clinical assessment by a qualified speech-language pathologist.";
    doc.text(disclaimer, 15, y, { maxWidth: 180 });

    // Footer all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200);
      doc.line(15, 285, 195, 285);
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.setFont("helvetica", "normal");
      doc.text("LexCura Speech Therapy — Confidential Clinical Report", 15, 290);
      doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
    }

    doc.save(`LexCura_RND_Report_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
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
        <StatCard 
  icon="📉" 
  label="Trend" 
  value={
    !metrics.trend || metrics.trend.direction === 'insufficient_data' ? 'Collecting data...' :
    metrics.trend.direction === 'improving' ? '↗ Improving' :
    metrics.trend.direction === 'declining' ? '↘ Declining' : '→ Stable'
  } 
  color={
    metrics.trend?.direction === 'improving' ? '#10b981' :
    metrics.trend?.direction === 'declining' ? '#ef4444' : '#3b82f6'
  } 
/>
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

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiFetch } from "../api/api";
// import { jsPDF } from "jspdf";
// import 'jspdf-autotable';

// /* ─── inject global keyframes once ─────────────────────────────── */
// if (typeof document !== "undefined") {
//   const s = document.createElement("style");
//   s.textContent = `
//     @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
//     @keyframes spin   { to { transform: rotate(360deg); } }
//     @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
//     .rnd-fade { animation: fadeUp 0.38s ease both; }
//     .rnd-fade:nth-child(1){animation-delay:.04s}
//     .rnd-fade:nth-child(2){animation-delay:.09s}
//     .rnd-fade:nth-child(3){animation-delay:.14s}
//     .rnd-fade:nth-child(4){animation-delay:.19s}
//     .rnd-btn { transition: transform .15s, box-shadow .15s; }
//     .rnd-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.13); }
//   `;
//   document.head.appendChild(s);
// }

// /* ══════════════════════════════════════════════════════════════════
//    MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════ */
// export default function WordReport() {
//   const navigate    = useNavigate();
//   const [report,    setReport]    = useState(null);
//   const [loading,   setLoading]   = useState(true);
//   const [timeframe, setTimeframe] = useState(7);
//   const [userInfo,  setUserInfo]  = useState(null);
//   const [downloading, setDownloading] = useState(false);

//   /* ── fetch ── */
//   useEffect(() => {
//     const fetchAll = async () => {
//       setLoading(true);
//       try {
//         const [user, data] = await Promise.all([
//           apiFetch('/api/auth/me'),
//           apiFetch(`/api/reports/student/words?timeframe=${timeframe}`),
//         ]);
//         setUserInfo(user);
//         setReport(data);
//       } catch (err) {
//         console.error("Failed to fetch word report:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAll();
//   }, [timeframe]);

//   /* ── PDF export ── */
//   const downloadPDFReport = () => {
//     if (!report?.metrics) return;
//     setDownloading(true);
//     try {
//       const doc = new jsPDF({ unit: "mm", format: "a4" });
//       const { metrics } = report;
//       const studentName = userInfo?.name || "Student";
//       const date = new Date().toLocaleDateString();

//       /* Header */
//       doc.setFillColor(109, 40, 217);
//       doc.rect(0, 0, 210, 36, "F");
//       doc.setTextColor(255, 255, 255);
//       doc.setFont("helvetica", "bold"); doc.setFontSize(18);
//       doc.text("LexCura Speech Therapy", 105, 13, { align: "center" });
//       doc.setFont("helvetica", "normal"); doc.setFontSize(12);
//       doc.text("Rapid Word Naming — Clinical Progress Report", 105, 22, { align: "center" });
//       doc.setFontSize(9);
//       doc.text(`Student: ${studentName}   |   Period: Last ${timeframe} Days   |   Generated: ${date}`, 105, 30, { align: "center" });

//       let y = 46;

//       const sectionHeader = (txt, color) => {
//         doc.setTextColor(...color); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
//         doc.text(txt, 15, y); y += 2;
//         doc.setDrawColor(...color); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 6;
//       };

//       /* Section 1 */
//       sectionHeader("1. Rapid Naming Performance Summary", [109, 40, 217]);
//       const successRate = parseFloat(metrics.overview.successRate);
//       const avgRTsec    = (metrics.overview.avgResponseTime / 1000).toFixed(2);
//       const rndInterp   = metrics.overview.avgResponseTime < 2000
//         ? "Fast — within typical range for rapid naming"
//         : metrics.overview.avgResponseTime < 4000
//         ? "Moderate — mild delay; targeted practice recommended"
//         : "Slow — significant naming latency; intervention indicated";
//       const accuracyLevel = successRate >= 80 ? "Strong" : successRate >= 60 ? "Developing" : "Needs Support";
//       const trendDir    = metrics.trend?.direction;
//       const trendLabel  = trendDir === "insufficient_data" ? "More data needed" : (trendDir || "—");
//       const trendInterp = trendDir === "improving" ? "Positive trajectory"
//         : trendDir === "declining" ? "Needs attention"
//         : trendDir === "stable"   ? "Consistent performance"
//         : "Practice more sessions";

//       doc.autoTable({
//         startY: y,
//         head: [["Metric", "Value", "Clinical Interpretation"]],
//         body: [
//           ["Word Accuracy",           `${metrics.overview.successRate}%`, accuracyLevel],
//           ["Correct Responses",       `${metrics.overview.correctAttempts} / ${metrics.overview.totalAttempts}`, "Total session attempts"],
//           ["Avg Response Time (RND)", `${avgRTsec}s`, rndInterp],
//           ["Naming Speed Target",     "< 2.0s", metrics.overview.avgResponseTime < 2000 ? "✓ Achieved" : "✗ Not yet achieved"],
//           ["Trend",                   trendLabel, trendInterp],
//         ],
//         theme: "grid", styles: { fontSize: 9, cellPadding: 4 },
//         headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold" },
//         columnStyles: { 2: { cellWidth: 80 } },
//       });
//       y = doc.lastAutoTable.finalY + 10;

//       /* Section 2 */
//       sectionHeader("2. Response Time Analysis (Key RND Indicator)", [109, 40, 217]);
//       doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
//       [
//         "Rapid Automatic Naming (RAN) speed is a strong predictor of reading fluency.",
//         "Target: students with RND should aim to name words in under 2 seconds consistently.",
//         `This student's average: ${avgRTsec}s — ${metrics.overview.avgResponseTime < 2000 ? "within target range." : "above target; focused drills on high-frequency words are recommended."}`,
//       ].forEach(l => { doc.text(l, 15, y); y += 5; });
//       y += 4;
//       doc.autoTable({
//         startY: y,
//         head: [["Response Time Zone", "Range", "This Student"]],
//         body: [
//           ["Fluent (RND Low Risk)",             "< 2.0s",      metrics.overview.avgResponseTime < 2000 ? "✓ Here" : ""],
//           ["Borderline",                         "2.0s – 4.0s", metrics.overview.avgResponseTime >= 2000 && metrics.overview.avgResponseTime < 4000 ? "✓ Here" : ""],
//           ["Significant Delay (RND High Risk)", "> 4.0s",      metrics.overview.avgResponseTime >= 4000 ? "✓ Here" : ""],
//         ],
//         theme: "striped", styles: { fontSize: 9 },
//         headStyles: { fillColor: [109, 40, 217], textColor: 255 },
//       });
//       y = doc.lastAutoTable.finalY + 10;

//       /* Section 3 */
//       if (metrics.problemWords?.length > 0) {
//         sectionHeader("3. High-Error Words (Priority Practice Targets)", [220, 38, 38]);
//         doc.autoTable({
//           startY: y,
//           head: [["Word", "Errors", "Error Rate", "RND Priority", "Recommended Drill"]],
//           body: metrics.problemWords.map((item, i) => [
//             item.word.toUpperCase(), item.errorCount, `${item.errorRate}%`,
//             i < 2 ? "HIGH" : "MEDIUM", "Flashcard + timed naming drill",
//           ]),
//           theme: "striped", styles: { fontSize: 9 },
//           headStyles: { fillColor: [220, 38, 38], textColor: 255 },
//         });
//         y = doc.lastAutoTable.finalY + 10;
//       }

//       /* Section 4 */
//       if (metrics.problemLetters?.length > 0) {
//         if (y > 220) { doc.addPage(); y = 20; }
//         sectionHeader("4. Problem Phonemes (Sound-Level Errors)", [220, 38, 38]);
//         doc.autoTable({
//           startY: y,
//           head: [["Sound", "Errors", "Error Rate", "Intervention Note"]],
//           body: metrics.problemLetters.map(item => [
//             item.letter.toUpperCase(), item.errorCount, `${item.errorRate}%`,
//             `Practise /${item.letter}/ in isolation, then in CVC words`,
//           ]),
//           theme: "striped", styles: { fontSize: 9 },
//           headStyles: { fillColor: [220, 38, 38], textColor: 255 },
//         });
//         y = doc.lastAutoTable.finalY + 10;
//       }

//       /* Page 2 */
//       doc.addPage(); y = 20;
//       if (metrics.daily?.length > 0) {
//         sectionHeader("5. Daily Progress Log", [109, 40, 217]);
//         doc.autoTable({
//           startY: y,
//           head: [["Date", "Sessions", "Success Rate", "Performance"]],
//           body: metrics.daily.map(day => [
//             new Date(day.date).toLocaleDateString(), day.attempts, `${day.successRate}%`,
//             parseFloat(day.successRate) >= 80 ? "Strong" : parseFloat(day.successRate) >= 60 ? "Developing" : "Needs Practice",
//           ]),
//           theme: "striped", styles: { fontSize: 9 },
//           headStyles: { fillColor: [109, 40, 217], textColor: 255 },
//         });
//         y = doc.lastAutoTable.finalY + 12;
//       }

//       /* Action plan */
//       sectionHeader("6. Personalised RND Action Plan", [15, 118, 110]);
//       const actions = [];
//       if (metrics.overview.avgResponseTime >= 2000)
//         actions.push(["Speed Drills",      "Daily 5-min timed naming of top 10 error words using flashcards"]);
//       if (metrics.problemWords?.length > 0)
//         actions.push(["Word Mastery",      `Focus on: ${metrics.problemWords.slice(0, 3).map(w => w.word.toUpperCase()).join(", ")} — 20 reps each before next session`]);
//       if (metrics.problemLetters?.length > 0)
//         actions.push(["Phoneme Drill",     `Isolate sounds: ${metrics.problemLetters.slice(0, 3).map(l => l.letter.toUpperCase()).join(", ")} — use minimal pairs`]);
//       if (successRate < 60)
//         actions.push(["Session Frequency", "Increase to daily short sessions (10 min) rather than longer infrequent ones"]);
//       actions.push(["Progress Check",      "Re-assess in 2 weeks; compare avg response time and success rate"]);

//       doc.autoTable({
//         startY: y,
//         head: [["Strategy", "Action"]],
//         body: actions,
//         theme: "grid", styles: { fontSize: 9, cellPadding: 5 },
//         headStyles: { fillColor: [15, 118, 110], textColor: 255 },
//         columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
//       });
//       y = doc.lastAutoTable.finalY + 10;
//       doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "italic");
//       doc.text("This report is generated by LexCura and is intended to support — not replace — clinical assessment by a qualified speech-language pathologist.", 15, y, { maxWidth: 180 });

//       /* Footers */
//       const pageCount = doc.internal.getNumberOfPages();
//       for (let i = 1; i <= pageCount; i++) {
//         doc.setPage(i);
//         doc.setDrawColor(200); doc.line(15, 285, 195, 285);
//         doc.setFontSize(8); doc.setTextColor(130); doc.setFont("helvetica", "normal");
//         doc.text("LexCura Speech Therapy — Confidential Clinical Report", 15, 290);
//         doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
//       }

//       doc.save(`LexCura_RND_Report_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
//     } catch (err) {
//       console.error("PDF error:", err);
//       alert("Failed to generate report.");
//     } finally {
//       setDownloading(false);
//     }
//   };

//   /* ── Loading ── */
//   if (loading) return (
//     <div style={S.center}>
//       <div style={S.spinner} />
//       <p style={S.loadingText}>Loading word report…</p>
//     </div>
//   );

//   /* ── Empty ── */
//   if (!report?.metrics) return (
//     <div style={S.center}>
//       <div style={{ fontSize: 64, marginBottom: 20 }}>🔡</div>
//       <h2 style={S.emptyTitle}>No Word Data Yet</h2>
//       <p style={S.emptyText}>Complete some word exercises to see your progress report here.</p>
//       <button className="rnd-btn" style={S.startBtn} onClick={() => navigate("/student/word-level")}>
//         Start Practising Words
//       </button>
//     </div>
//   );

//   /* ── Derived ── */
//   const { metrics } = report;
//   const trendDir = metrics.trend?.direction;
//   const hasTrend = trendDir && trendDir !== "insufficient_data";
//   const rtMs     = metrics.overview.avgResponseTime;
//   const rtStatus = rtMs < 2000
//     ? { label: "Within target ✓",    color: "#059669" }
//     : rtMs < 4000
//     ? { label: "Mild delay ⚠",       color: "#d97706" }
//     : { label: "Significant delay ✗", color: "#dc2626" };

//   return (
//     <div style={S.page}>

//       {/* HEADER */}
//       <div style={S.header}>
//         <div>
//           <span style={S.pill}>Rapid Naming Deficit · Word Level</span>
//           <h1 style={S.title}>Word Practice Report</h1>
//           <p style={S.subtitle}>{userInfo?.name || "Student"} · Last {timeframe} days</p>
//         </div>
//         <div style={S.headerRight}>
//           <button className="rnd-btn"
//             style={downloading ? S.dlBtnOff : S.dlBtn}
//             onClick={downloadPDFReport} disabled={downloading}>
//             {downloading ? "⏳ Generating…" : "📥 Download Clinical PDF"}
//           </button>
//           <div style={S.filterGroup}>
//             {[7, 30, 90].map(t => (
//               <button key={t} className="rnd-btn"
//                 style={timeframe === t ? S.filterOn : S.filterOff}
//                 onClick={() => setTimeframe(t)}>{t}d
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* STAT CARDS */}
//       <div style={S.statsGrid}>
//         <StatCard icon="🎯" label="Word Accuracy"
//           value={`${metrics.overview.successRate}%`}
//           sub={`${metrics.overview.correctAttempts} of ${metrics.overview.totalAttempts} correct`}
//           accent="#7c3aed" />
//         <StatCard icon="⚡" label="Avg Response Time"
//           value={`${(rtMs / 1000).toFixed(1)}s`}
//           sub={rtStatus.label}
//           accent={rtStatus.color} />
//         <StatCard icon="✅" label="Total Sessions"
//           value={metrics.overview.totalAttempts}
//           sub="attempts recorded"
//           accent="#0891b2" />
//         <StatCard icon="📈" label="Naming Trend"
//           value={
//             !hasTrend              ? "Collecting…"  :
//             trendDir==="improving" ? "↗ Improving"  :
//             trendDir==="declining" ? "↘ Declining"  : "→ Stable"
//           }
//           sub={
//             !hasTrend              ? "Practice more sessions" :
//             trendDir==="improving" ? "Positive trajectory"   :
//             trendDir==="declining" ? "Needs attention"       : "Consistent performance"
//           }
//           accent={
//             trendDir==="improving" ? "#059669" :
//             trendDir==="declining" ? "#dc2626" : "#7c3aed"
//           } />
//       </div>

//       {/* RND SPEED ZONE */}
//       <div style={S.speedCard}>
//         <div style={S.speedLeft}>
//           <span style={S.speedLabel}>RND Naming Speed</span>
//           <div style={S.speedValue}>
//             <span style={{ fontFamily:"'JetBrains Mono',monospace", color: rtStatus.color }}>
//               {(rtMs / 1000).toFixed(2)}
//             </span>
//             <span style={S.speedUnit}>s average</span>
//           </div>
//           <p style={S.speedNote}>Target for fluent readers: &lt;2.0s · RND students typically need 3–6s</p>
//         </div>
//         <div style={S.speedRight}>
//           <SpeedZones ms={rtMs} />
//         </div>
//       </div>

//       {/* TREND CARD — only renders when direction is improving / stable / declining */}
//       {hasTrend && <TrendCard trend={metrics.trend} />}

//       {/* PROBLEM AREAS */}
//       <div style={S.twoCol}>
//         {metrics.problemWords?.length > 0 && (
//           <div style={S.card}>
//             <h3 style={S.cardTitle}><Dot color="#7c3aed" /> High-Error Words</h3>
//             <p style={S.cardHint}>Prioritise these in timed flashcard drills</p>
//             <div style={S.problemList}>
//               {metrics.problemWords.map((item, idx) => (
//                 <ProblemRow key={idx} label={item.word.toUpperCase()}
//                   count={item.errorCount} rate={item.errorRate}
//                   rank={idx} color="#7c3aed" mono />
//               ))}
//             </div>
//           </div>
//         )}
//         {metrics.problemLetters?.length > 0 && (
//           <div style={S.card}>
//             <h3 style={S.cardTitle}><Dot color="#dc2626" /> Problem Phonemes</h3>
//             <p style={S.cardHint}>Isolate these sounds before word-level practice</p>
//             <div style={S.problemList}>
//               {metrics.problemLetters.map((item, idx) => (
//                 <ProblemRow key={idx} label={`/${item.letter.toUpperCase()}/`}
//                   count={item.errorCount} rate={item.errorRate}
//                   rank={idx} color="#dc2626" />
//               ))}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* DAILY CHART */}
//       {metrics.daily?.length > 0 && (
//         <div style={S.card}>
//           <h3 style={S.cardTitle}><Dot color="#0891b2" /> Daily Progress</h3>
//           <DailyChart data={metrics.daily} />
//         </div>
//       )}

//       {/* CTA */}
//       <div style={S.cta}>
//         <div>
//           <h3 style={S.ctaTitle}>Keep naming, keep improving 🚀</h3>
//           <p style={S.ctaText}>
//             Consistent daily practice of 10–15 minutes is the most effective intervention for Rapid Naming Deficit.
//           </p>
//         </div>
//         <button className="rnd-btn" style={S.ctaBtn} onClick={() => navigate("/student/word-level")}>
//           Continue Practice →
//         </button>
//       </div>

//     </div>
//   );
// }

// /* ══════════════════════════════════════════════════════════════════
//    SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════ */

// function Dot({ color }) {
//   return (
//     <span style={{
//       display:"inline-block", width:10, height:10,
//       borderRadius:"50%", background:color,
//       marginRight:8, flexShrink:0,
//     }} />
//   );
// }

// function StatCard({ icon, label, value, sub, accent }) {
//   return (
//     <div className="rnd-fade" style={{ ...S.statCard, borderTop:`3px solid ${accent}` }}>
//       <div style={{ ...S.statIcon, background:`${accent}14` }}>
//         <span style={{ fontSize:22 }}>{icon}</span>
//       </div>
//       <div style={S.statBody}>
//         <span style={S.statLabel}>{label}</span>
//         <div style={{ ...S.statValue, color:accent }}>{value}</div>
//         <span style={S.statSub}>{sub}</span>
//       </div>
//     </div>
//   );
// }

// function SpeedZones({ ms }) {
//   const clamp  = Math.min(ms, 8000);
//   const pct    = (clamp / 8000) * 100;
//   const needle = ms < 2000 ? "#059669" : ms < 4000 ? "#d97706" : "#dc2626";
//   return (
//     <div>
//       <div style={S.zoneTrack}>
//         <div style={{ ...S.zoneSeg, left:"0%",  width:"25%", background:"#059669" }} />
//         <div style={{ ...S.zoneSeg, left:"25%", width:"25%", background:"#d97706" }} />
//         <div style={{ ...S.zoneSeg, left:"50%", width:"50%", background:"#dc2626" }} />
//         <div style={{ ...S.needle, left:`${pct}%`, background:needle, boxShadow:`0 0 8px ${needle}` }} />
//       </div>
//       <div style={S.zoneLabels}>
//         <span style={{ color:"#059669", fontSize:10, fontWeight:700 }}>Fluent &lt;2s</span>
//         <span style={{ color:"#d97706", fontSize:10, fontWeight:700 }}>Borderline</span>
//         <span style={{ color:"#dc2626", fontSize:10, fontWeight:700 }}>Delayed &gt;4s</span>
//       </div>
//     </div>
//   );
// }

// function TrendCard({ trend }) {
//   /* Safety guard — should never be called with insufficient_data but just in case */
//   if (!trend || trend.direction === "insufficient_data") return null;

//   const improving = trend.direction === "improving";
//   const stable    = trend.direction === "stable";

//   /* previousAvg arrives as raw decimal (0.75) from the controller */
//   const prevPct = trend.previousAvg <= 1
//     ? (trend.previousAvg * 100).toFixed(1)
//     : parseFloat(trend.previousAvg).toFixed(1);

//   const bg = improving
//     ? "linear-gradient(135deg,#059669,#10b981)"
//     : stable
//     ? "linear-gradient(135deg,#7c3aed,#a78bfa)"
//     : "linear-gradient(135deg,#dc2626,#f87171)";

//   return (
//     <div style={{ ...S.trendCard, background:bg }}>
//       <div style={S.trendEmoji}>{improving ? "🎉" : stable ? "📊" : "💪"}</div>
//       <div style={S.trendBody}>
//         <h3 style={S.trendTitle}>
//           {improving ? "You're Improving!" : stable ? "Steady Progress" : "Let's Refocus"}
//         </h3>
//         <p style={S.trendText}>
//           {improving && `Success rate increased by ${Math.abs(parseFloat(trend.change))}% — naming speed is developing well.`}
//           {stable    && "Your performance is consistent. Keep up your daily practice sessions."}
//           {!improving && !stable && `Recent rate dropped by ${Math.abs(parseFloat(trend.change))}%. Focus on flashcard drills for problem words.`}
//         </p>
//         <div style={S.trendStats}>
//           <div>
//             <span style={S.trendStatLabel}>Previous</span>
//             <span style={S.trendStatVal}>{prevPct}%</span>
//           </div>
//           <span style={S.trendArrow}>→</span>
//           <div>
//             <span style={S.trendStatLabel}>Recent</span>
//             <span style={S.trendStatVal}>{trend.recentAccuracy}%</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function ProblemRow({ label, count, rate, rank, color, mono }) {
//   const high = rank < 2;
//   return (
//     <div style={S.problemRow}>
//       <div style={{
//         ...S.problemBadge, background:color,
//         fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit",
//       }}>
//         {label}
//       </div>
//       <div style={{ flex:1 }}>
//         <div style={S.barBg}>
//           <div style={{ ...S.barFill, width:`${Math.min(parseFloat(rate),100)}%`, background:color }} />
//         </div>
//         <span style={S.problemMeta}>{count} error{count!==1?"s":""} · {rate}%</span>
//       </div>
//       <span style={{
//         ...S.priorityPill,
//         background: high ? "#fef2f2" : "#fefce8",
//         color:      high ? "#dc2626" : "#b45309",
//       }}>
//         {high ? "HIGH" : "MED"}
//       </span>
//     </div>
//   );
// }

// function DailyChart({ data }) {
//   const maxRate = Math.max(...data.map(d => parseFloat(d.successRate)), 1);
//   return (
//     <div style={S.chartWrap}>
//       {data.map((day, idx) => {
//         const h     = (parseFloat(day.successRate) / maxRate) * 100;
//         const color = parseFloat(day.successRate) >= 80 ? "#059669"
//           : parseFloat(day.successRate) >= 60 ? "#d97706" : "#dc2626";
//         return (
//           <div key={idx} style={S.chartCol}>
//             <span style={S.chartPct}>{day.successRate}%</span>
//             <div style={{ ...S.chartBar, height:`${Math.max(h,5)}%`, background:color }} />
//             <span style={S.chartDate}>
//               {new Date(day.date).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
//             </span>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// /* ══════════════════════════════════════════════════════════════════
//    STYLE TOKENS
// ══════════════════════════════════════════════════════════════════ */
// const FONT = "'Sora', sans-serif";

// const S = {
//   /* layout */
//   page:       { padding:32, maxWidth:1300, margin:"0 auto", background:"#f9f8ff", fontFamily:FONT, minHeight:"100vh" },

//   /* loading / empty */
//   center:     { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center", padding:40, fontFamily:FONT },
//   spinner:    { width:44, height:44, border:"4px solid #e2e8f0", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin .9s linear infinite" },
//   loadingText:{ fontSize:15, color:"#64748b", marginTop:12 },
//   emptyTitle: { fontSize:26, fontWeight:800, color:"#0f172a", margin:"0 0 10px" },
//   emptyText:  { fontSize:15, color:"#64748b", margin:"0 0 28px", maxWidth:380 },
//   startBtn:   { background:"linear-gradient(135deg,#7c3aed,#5b21b6)", color:"white", border:"none", padding:"14px 32px", borderRadius:12, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:FONT },

//   /* header */
//   header:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32, flexWrap:"wrap", gap:16 },
//   pill:       { display:"inline-block", background:"#ede9fe", color:"#6d28d9", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 12px", borderRadius:999, marginBottom:8 },
//   title:      { fontSize:28, fontWeight:800, color:"#0f172a", margin:"0 0 4px" },
//   subtitle:   { fontSize:14, color:"#64748b", margin:0 },
//   headerRight:{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" },
//   dlBtn:      { background:"linear-gradient(135deg,#7c3aed,#5b21b6)", color:"white", border:"none", padding:"11px 22px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, whiteSpace:"nowrap" },
//   dlBtnOff:   { background:"#94a3b8", color:"white", border:"none", padding:"11px 22px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"not-allowed", fontFamily:FONT, whiteSpace:"nowrap", opacity:0.7 },
//   filterGroup:{ display:"flex", background:"white", borderRadius:10, padding:3, boxShadow:"0 1px 4px rgba(0,0,0,.08)", gap:2 },
//   filterOn:   { padding:"8px 14px", border:"none", background:"#7c3aed", color:"white",   borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:FONT },
//   filterOff:  { padding:"8px 14px", border:"none", background:"transparent", color:"#64748b", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:FONT },

//   /* stat cards */
//   statsGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:16, marginBottom:20 },
//   statCard:   { background:"white", borderRadius:14, padding:20, display:"flex", gap:14, alignItems:"flex-start", boxShadow:"0 1px 4px rgba(0,0,0,.07)" },
//   statIcon:   { width:50, height:50, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
//   statBody:   { display:"flex", flexDirection:"column", gap:2 },
//   statLabel:  { fontSize:11, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" },
//   statValue:  { fontSize:26, fontWeight:800, lineHeight:1.1, marginTop:2 },
//   statSub:    { fontSize:12, color:"#64748b" },

//   /* speed card */
//   speedCard:  { background:"white", borderRadius:16, padding:"22px 28px", marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)", display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" },
//   speedLeft:  { flex:1, minWidth:200 },
//   speedLabel: { fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" },
//   speedValue: { fontSize:42, fontWeight:800, color:"#0f172a", lineHeight:1.1, margin:"4px 0", display:"flex", alignItems:"baseline", gap:8 },
//   speedUnit:  { fontSize:16, fontWeight:400, color:"#64748b" },
//   speedNote:  { fontSize:11, color:"#94a3b8", margin:"4px 0 0" },
//   speedRight: { flex:1, minWidth:220 },
//   zoneTrack:  { position:"relative", height:14, background:"#f1f5f9", borderRadius:7, overflow:"visible", marginBottom:6 },
//   zoneSeg:    { position:"absolute", top:0, height:"100%", opacity:0.3 },
//   needle:     { position:"absolute", top:-5, bottom:-5, width:3, borderRadius:4, transform:"translateX(-50%)" },
//   zoneLabels: { display:"flex", justifyContent:"space-between" },

//   /* trend */
//   trendCard:      { borderRadius:18, padding:"26px 30px", marginBottom:20, color:"white", display:"flex", gap:22, alignItems:"center", boxShadow:"0 8px 24px rgba(0,0,0,.15)", flexWrap:"wrap" },
//   trendEmoji:     { fontSize:44, flexShrink:0 },
//   trendBody:      { flex:1 },
//   trendTitle:     { fontSize:22, fontWeight:800, margin:"0 0 6px" },
//   trendText:      { fontSize:14, opacity:0.9, margin:"0 0 14px", lineHeight:1.6 },
//   trendStats:     { display:"flex", alignItems:"center", gap:20 },
//   trendStatLabel: { display:"block", fontSize:11, opacity:0.75, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.06em" },
//   trendStatVal:   { display:"block", fontSize:22, fontWeight:800, fontFamily:"'JetBrains Mono',monospace" },
//   trendArrow:     { fontSize:20, opacity:0.7 },

//   /* cards */
//   twoCol:      { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:20 },
//   card:        { background:"white", borderRadius:14, padding:22, boxShadow:"0 1px 4px rgba(0,0,0,.07)", marginBottom:20 },
//   cardTitle:   { fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 4px", display:"flex", alignItems:"center" },
//   cardHint:    { fontSize:12, color:"#94a3b8", margin:"0 0 14px" },
//   problemList: { display:"flex", flexDirection:"column", gap:10 },
//   problemRow:  { display:"flex", alignItems:"center", gap:12 },
//   problemBadge:{ minWidth:52, height:40, borderRadius:8, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0, padding:"0 10px" },
//   barBg:       { height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden", marginBottom:4 },
//   barFill:     { height:"100%", borderRadius:3, transition:"width .4s ease" },
//   problemMeta: { fontSize:11, color:"#94a3b8" },
//   priorityPill:{ fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:999, letterSpacing:"0.05em", flexShrink:0 },

//   /* daily chart */
//   chartWrap:  { display:"flex", alignItems:"flex-end", gap:8, height:120, paddingBottom:24, paddingTop:8 },
//   chartCol:   { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%", position:"relative", gap:3 },
//   chartPct:   { fontSize:9, fontWeight:700, color:"#475569" },
//   chartBar:   { width:"100%", borderRadius:"4px 4px 0 0", minHeight:6, transition:"height .4s ease" },
//   chartDate:  { position:"absolute", bottom:0, fontSize:9, color:"#94a3b8", fontWeight:600, textAlign:"center", whiteSpace:"nowrap" },

//   /* cta */
//   cta:     { background:"linear-gradient(135deg,#4c1d95,#6d28d9)", borderRadius:18, padding:"26px 30px", display:"flex", justifyContent:"space-between", alignItems:"center", color:"white", flexWrap:"wrap", gap:20 },
//   ctaTitle:{ fontSize:20, fontWeight:800, margin:"0 0 6px" },
//   ctaText: { fontSize:13, opacity:0.85, margin:0, maxWidth:500 },
//   ctaBtn:  { background:"white", color:"#6d28d9", border:"none", padding:"13px 26px", borderRadius:12, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:FONT, boxShadow:"0 4px 12px rgba(0,0,0,.15)", whiteSpace:"nowrap" },
// };