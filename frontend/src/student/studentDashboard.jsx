

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiFetch } from "../api/api";

// import { jsPDF } from "jspdf";
// import 'jspdf-autotable';

// export default function StudentDashboard() {
//   const navigate = useNavigate();
//   const [report, setReport] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [timeframe, setTimeframe] = useState(7);
//   const [userInfo, setUserInfo] = useState(null);
//   const [downloading, setDownloading] = useState(false);

//   useEffect(() => {
//     const fetchUserInfo = async () => {
//       try {
//         const user = await apiFetch('/api/auth/me');
//         setUserInfo(user);
//       } catch (error) {
//         console.error('Failed to fetch user info');
//       }
//     };
    
//     fetchUserInfo();
//     fetchReport();
//   }, [timeframe]);

//   const fetchReport = async () => {
//     setLoading(true);
//     try {
//       const data = await apiFetch(`/api/reports/student?timeframe=${timeframe}`);
//       console.log("🔍 FULL REPORT DATA:", JSON.stringify(data, null, 2));
//       setReport(data);
//     } catch (error) {
//       console.error("Failed to fetch report:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadPDFReport = () => {
//     if (!report?.metrics) return;

//     setDownloading(true);

//     try {
//       const doc = new jsPDF({ unit: "mm", format: "a4" });
//       const { metrics } = report;

//       const studentName = userInfo?.name || "Student";

//       doc.setFillColor(59, 130, 246);
//       doc.rect(0, 0, 210, 30, "F");

//       doc.setTextColor(255, 255, 255);
//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(20);
//       doc.text("LexCura Speech Therapy", 105, 14, { align: "center" });

//       doc.setFontSize(12);
//       doc.setFont("helvetica", "normal");
//       doc.text("Student Progress Report", 105, 22, { align: "center" });

//       doc.setTextColor(0, 0, 0);
//       let yPos = 40;

//       doc.setDrawColor(59, 130, 246);
//       doc.rect(15, yPos, 180, 22);

//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(11);
//       doc.text("Report Information", 20, yPos + 7);

//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(10);
//       doc.text(`Student Name: ${studentName}`, 20, yPos + 14);
//       doc.text(`Report Period: Last ${timeframe} Days`, 20, yPos + 19);

//       doc.text(
//         `Generated: ${new Date().toLocaleDateString()}`,
//         120,
//         yPos + 14
//       );
//       doc.text(
//         `Total Sessions: ${metrics.overview?.totalAttempts || 0}`,
//         120,
//         yPos + 19
//       );

//       yPos += 35;

//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(14);
//       doc.setTextColor(59, 130, 246);
//       doc.text("Executive Summary", 20, yPos);
//       yPos += 8;

//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(10);
//       doc.setTextColor(0, 0, 0);

//       const summaryText = `
// This report covers ${metrics.overview?.totalAttempts || 0} sessions over the last ${timeframe} days.
// The student achieved a ${metrics.overview?.successRate || 0}% success rate
// with ${metrics.overview?.accuracyPercentage || 0}% pronunciation accuracy.
// Trend status: ${metrics.trend?.direction || "Stable"}.
//       `;

//       const summaryLines = doc.splitTextToSize(summaryText, 170);
//       summaryLines.forEach(line => {
//         doc.text(line, 20, yPos);
//         yPos += 5;
//       });

//       yPos += 10;

//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(14);
//       doc.setTextColor(59, 130, 246);
//       doc.text("Key Performance Indicators", 20, yPos);
//       yPos += 8;

//       doc.autoTable({
//         startY: yPos,
//         head: [["Metric", "Value", "Status"]],
//         body: [
//           [
//             "Success Rate",
//             `${metrics.overview?.successRate || 0}%`,
//             parseFloat(metrics.overview?.successRate || 0) >= 70
//               ? "Good"
//               : "Needs Improvement",
//           ],
//           [
//             "Accuracy",
//             `${metrics.overview?.accuracyPercentage || 0}%`,
//             parseFloat(metrics.overview?.accuracyPercentage || 0) >= 80
//               ? "Excellent"
//               : "Developing",
//           ],
//           [
//             "Avg Response Time",
//             `${((metrics.overview?.avgResponseTime || 0) / 1000).toFixed(1)}s`,
//             metrics.overview?.avgResponseTime < 3000
//               ? "Fast"
//               : "Moderate",
//           ],
//           [
//             "Trend",
//             metrics.trend?.direction?.toUpperCase() || "STABLE",
//             metrics.trend?.direction === "improving"
//               ? "Positive"
//               : metrics.trend?.direction === "declining"
//               ? "Needs Attention"
//               : "Stable",
//           ],
//         ],
//         theme: "striped",
//         tableWidth: "auto",
//         styles: {
//           font: "helvetica",
//           fontSize: 10,
//           overflow: "linebreak",
//           cellPadding: 4,
//         },
//         headStyles: {
//           fillColor: [59, 130, 246],
//         },
//       });

//       yPos = doc.lastAutoTable.finalY + 15;

//       if (metrics.problemAreas?.letters?.length > 0) {
//         doc.setFont("helvetica", "bold");
//         doc.setFontSize(14);
//         doc.setTextColor(239, 68, 68);
//         doc.text("Phonemes Requiring Attention", 20, yPos);
//         yPos += 8;

//         doc.autoTable({
//           startY: yPos,
//           head: [["Letter", "Errors", "Error Rate"]],
//           body: metrics.problemAreas.letters.map(item => [
//             item.letter.toUpperCase(),
//             item.errorCount,
//             `${item.errorRate}%`,
//           ]),
//           theme: "striped",
//           tableWidth: "auto",
//           styles: {
//             font: "helvetica",
//             fontSize: 9,
//             overflow: "linebreak",
//           },
//           headStyles: {
//             fillColor: [239, 68, 68],
//           },
//         });

//         yPos = doc.lastAutoTable.finalY + 15;
//       }

//       if (metrics.progress?.daily?.length > 0) {
//         doc.addPage();
//         yPos = 20;

//         doc.setFont("helvetica", "bold");
//         doc.setFontSize(14);
//         doc.setTextColor(59, 130, 246);
//         doc.text("Session Progress Overview", 20, yPos);
//         yPos += 8;

//         doc.autoTable({
//           startY: yPos,
//           head: [["Date", "Sessions", "Accuracy", "Success Rate"]],
//           body: metrics.progress.daily.map(day => [
//             new Date(day.date).toLocaleDateString(),
//             day.attempts,
//             `${day.accuracy}%`,
//             `${day.successRate}%`,
//           ]),
//           theme: "striped",
//           tableWidth: "auto",
//           styles: {
//             font: "helvetica",
//             fontSize: 9,
//             overflow: "linebreak",
//           },
//           headStyles: {
//             fillColor: [59, 130, 246],
//           },
//         });

//         yPos = doc.lastAutoTable.finalY + 15;
//       }

//       if (yPos > 220) {
//         doc.addPage();
//         yPos = 20;
//       }

//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(14);
//       doc.setTextColor(139, 92, 246);
//       doc.text("Therapist Remarks", 20, yPos);
//       yPos += 10;

//       doc.setDrawColor(139, 92, 246);
//       doc.setLineWidth(0.5);
//       doc.rect(15, yPos, 180, 60);

//       doc.setDrawColor(200, 200, 200);
//       doc.setLineWidth(0.2);
//       for (let i = 0; i < 10; i++) {
//         const lineY = yPos + 6 + (i * 5.5);
//         if (lineY < yPos + 58) {
//           doc.line(20, lineY, 190, lineY);
//         }
//       }

//       doc.setFont("helvetica", "italic");
//       doc.setFontSize(9);
//       doc.setTextColor(120, 120, 120);
//       doc.text("Therapist notes and recommendations:", 20, yPos + 3);

//       yPos += 70;

//       doc.setDrawColor(100, 100, 100);
//       doc.setLineWidth(0.3);
//       doc.line(20, yPos, 100, yPos);
      
//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(9);
//       doc.setTextColor(80, 80, 80);
//       doc.text("Therapist Signature", 20, yPos + 5);
      
//       doc.line(120, yPos, 190, yPos);
//       doc.text("Date", 120, yPos + 5);

//       const pageCount = doc.internal.getNumberOfPages();

//       for (let i = 1; i <= pageCount; i++) {
//         doc.setPage(i);
//         doc.setDrawColor(200);
//         doc.line(20, 285, 190, 285);

//         doc.setFontSize(8);
//         doc.setTextColor(120);
//         doc.text(
//           "LexCura Speech Therapy - Confidential Clinical Report",
//           20,
//           290
//         );

//         doc.text(`Page ${i} of ${pageCount}`, 190, 290, {
//           align: "right",
//         });
//       }

//       const fileName = `LexCura_Report_${studentName.replace(
//         /\s+/g,
//         "_"
//       )}_${new Date().toISOString().split("T")[0]}.pdf`;

//       doc.save(fileName);

//     } catch (error) {
//       console.error("PDF error:", error);
//       alert("Failed to generate report.");
//     } finally {
//       setDownloading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div style={styles.loadingContainer}>
//         <div style={styles.spinner}></div>
//         <p style={styles.loadingText}>Loading your progress...</p>
//       </div>
//     );
//   }

//   if (!report?.metrics) {
//     return (
//       <div style={styles.emptyState}>
//         <div style={styles.emptyIcon}>📚</div>
//         <h2 style={styles.emptyTitle}>Start Your Learning Journey!</h2>
//         <p style={styles.emptyText}>
//           No practice data yet. Complete some sentence exercises to see your progress.
//         </p>
//         <button
//           style={styles.startButton}
//           onClick={() => navigate("/student/sentence-level")}
//         >
//           Start Practicing
//         </button>
//       </div>
//     );
//   }

//   const { metrics } = report;

//   return (
//     <div style={styles.page}>
//       {/* Header */}
//       <div style={styles.header}>
//         <div>
//           <h1 style={styles.title}>Welcome back, {userInfo?.name || 'Student'}! 👋</h1>
//           <p style={styles.subtitle}>Here's how you're progressing</p>
//         </div>
        
//         <div style={styles.headerActions}>
//           <button
//             style={downloading ? styles.downloadButtonDisabled : styles.downloadButton}
//             onClick={downloadPDFReport}
//             disabled={downloading}
//           >
//             {downloading ? '⏳ Generating PDF...' : '📥 Download Report'}
//           </button>
          
//           <div style={styles.filterContainer}>
//             <button
//               style={timeframe === 7 ? styles.filterBtnActive : styles.filterBtn}
//               onClick={() => setTimeframe(7)}
//             >
//               7 Days
//             </button>
//             <button
//               style={timeframe === 30 ? styles.filterBtnActive : styles.filterBtn}
//               onClick={() => setTimeframe(30)}
//             >
//               30 Days
//             </button>
//             <button
//               style={timeframe === 90 ? styles.filterBtnActive : styles.filterBtn}
//               onClick={() => setTimeframe(90)}
//             >
//               90 Days
//             </button>
//           </div>
//         </div>
//       </div>

//       <div style={styles.statsGrid}>
//         <StatCard
//           icon="🎯"
//           label="Success Rate"
//           value={`${metrics.overview.successRate}%`}
//           trend={metrics.trend}
//           color="#10b981"
//         />
//         <StatCard
//           icon="📊"
//           label="Accuracy"
//           value={`${metrics.overview.accuracyPercentage}%`}
//           trend={metrics.trend}
//           color="#3b82f6"
//         />
//         <StatCard
//           icon="⚡"
//           label="Avg Response Time"
//           value={`${(metrics.overview.avgResponseTime / 1000).toFixed(1)}s`}
//           color="#f59e0b"
//         />
//         <StatCard
//           icon="✅"
//           label="Total Attempts"
//           value={metrics.overview.totalAttempts}
//           subValue={`${metrics.overview.correctAttempts} correct`}
//           color="#8b5cf6"
//         />
//       </div>

//       {metrics.trend.direction !== 'insufficient_data' && (
//         <TrendCard trend={metrics.trend} />
//       )}

//       {metrics.feedback && (
//         <FeedbackSection feedback={metrics.feedback} />
//       )}

//       <div style={styles.twoColumnGrid}>
//         {metrics.problemAreas.letters.length > 0 && (
//           <div style={styles.card}>
//             <h3 style={styles.cardTitle}>🔤 Letters to Practice</h3>
//             <div style={styles.problemLettersList}>
//               {metrics.problemAreas.letters.map((item, idx) => (
//                 <div key={idx} style={styles.problemLetterItem}>
//                   <div style={styles.letterBadge}>{item.letter.toUpperCase()}</div>
//                   <div style={styles.problemLetterInfo}>
//                     <span style={styles.problemLetterCount}>
//                       {item.errorCount} errors
//                     </span>
//                     <div style={styles.progressBarBg}>
//                       <div
//                         style={{
//                           ...styles.progressBarFill,
//                           width: `${item.errorRate}%`,
//                           background: '#ef4444'
//                         }}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {metrics.problemAreas.sentences.length > 0 && (
//           <div style={styles.card}>
//             <h3 style={styles.cardTitle}>📝 Challenging Sentences</h3>
//             <div style={styles.sentenceList}>
//               {metrics.problemAreas.sentences.map((item, idx) => (
//                 <div key={idx} style={styles.sentenceItem}>
//                   <p style={styles.sentenceText}>"{item.sentence}"</p>
//                   <div style={styles.sentenceStats}>
//                     <span style={styles.sentenceStat}>
//                       ✅ {item.successRate}% success
//                     </span>
//                     <span style={styles.sentenceStat}>
//                       ⏱️ {(item.avgTime / 1000).toFixed(1)}s
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>

//       {metrics.progress.daily.length > 0 && (
//         <div style={styles.card}>
//           <h3 style={styles.cardTitle}>📈 Daily Progress</h3>
//           <DailyProgressChart data={metrics.progress.daily} />
//         </div>
//       )}

//       <div style={styles.ctaCard}>
//         <div>
//           <h3 style={styles.ctaTitle}>Ready to improve? 🚀</h3>
//           <p style={styles.ctaText}>Keep practicing to master your weak areas!</p>
//         </div>
//         <button
//           style={styles.ctaButton}
//           onClick={() => navigate("/student/sentence-level")}
//         >
//           Continue Practice
//         </button>
//       </div>
//     </div>
//   );
// }

// function StatCard({ icon, label, value, subValue, trend, color }) {
//   return (
//     <div style={styles.statCard}>
//       <div style={{ ...styles.statIcon, background: `${color}15` }}>
//         <span style={{ fontSize: 24 }}>{icon}</span>
//       </div>
//       <div style={styles.statContent}>
//         <span style={styles.statLabel}>{label}</span>
//         <h3 style={{ ...styles.statValue, color }}>{value}</h3>
//         {subValue && <span style={styles.statSubValue}>{subValue}</span>}
//         {trend && trend.direction !== 'stable' && trend.direction !== 'insufficient_data' && (
//           <TrendBadge direction={trend.direction} change={trend.change} />
//         )}
//       </div>
//     </div>
//   );
// }

// function TrendBadge({ direction, change }) {
//   const isImproving = direction === 'improving';
//   return (
//     <span
//       style={{
//         ...styles.trendBadge,
//         background: isImproving ? '#dcfce7' : '#fee2e2',
//         color: isImproving ? '#16a34a' : '#dc2626'
//       }}
//     >
//       {isImproving ? '↗' : '↘'} {Math.abs(parseFloat(change))}%
//     </span>
//   );
// }

// function TrendCard({ trend }) {
//   const isImproving = trend.direction === 'improving';
//   const isStable = trend.direction === 'stable';

//   return (
//     <div
//       style={{
//         ...styles.trendCard,
//         background: isImproving
//           ? 'linear-gradient(135deg, #10b981, #34d399)'
//           : isStable
//           ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
//           : 'linear-gradient(135deg, #f59e0b, #fbbf24)'
//       }}
//     >
//       <div style={styles.trendIcon}>
//         {isImproving ? '🎉' : isStable ? '📊' : '💪'}
//       </div>
//       <div style={styles.trendContent}>
//         <h3 style={styles.trendTitle}>
//           {isImproving && "You're Improving!"}
//           {isStable && "Steady Progress"}
//           {!isImproving && !isStable && "Let's Focus"}
//         </h3>
//         <p style={styles.trendText}>
//           {isImproving &&
//             `Your accuracy increased by ${Math.abs(parseFloat(trend.change))}% recently. Keep it up!`}
//           {isStable && "Your performance is consistent. Keep practicing!"}
//           {!isImproving &&
//             !isStable &&
//             `Recent accuracy dropped by ${Math.abs(parseFloat(trend.change))}%. Focus on problem areas below.`}
//         </p>
//         <div style={styles.trendStats}>
//           <div>
//             <span style={styles.trendStatLabel}>Previous</span>
//             <span style={styles.trendStatValue}>
//               {(trend.previousAvg * 100).toFixed(1)}%
//             </span>
//           </div>
//           <div style={styles.trendArrow}>→</div>
//           <div>
//             <span style={styles.trendStatLabel}>Recent</span>
//             <span style={styles.trendStatValue}>
//               {trend.recentAccuracy}%
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function FeedbackSection({ feedback }) {
//   return (
//     <div style={styles.feedbackCard}>
//       <h3 style={styles.feedbackTitle}>💡 Personalized Feedback</h3>
      
//       <div style={styles.feedbackMessages}>
//         {feedback.messages.map((msg, idx) => (
//           <p key={idx} style={styles.feedbackMessage}>
//             {msg}
//           </p>
//         ))}
//       </div>

//       <div style={styles.motivationalBox}>
//         <span style={styles.quoteIcon}>✨</span>
//         <p style={styles.motivationalText}>{feedback.motivationalQuote}</p>
//       </div>

//       {feedback.recommendations.length > 0 && (
//         <div style={styles.recommendationsBox}>
//           <h4 style={styles.recommendationsTitle}>📌 Action Items:</h4>
//           <ul style={styles.recommendationsList}>
//             {feedback.recommendations.map((rec, idx) => (
//               <li key={idx} style={styles.recommendationItem}>
//                 {rec}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

// function DailyProgressChart({ data }) {
//   const maxAccuracy = Math.max(...data.map(d => parseFloat(d.accuracy)));
  
//   return (
//     <div style={styles.chartContainer}>
//       <div style={styles.chartBars}>
//         {data.map((day, idx) => {
//           const height = (parseFloat(day.accuracy) / maxAccuracy) * 100;
//           return (
//             <div key={idx} style={styles.chartBarWrapper}>
//               <div style={styles.chartBarAccuracy}>
//                 {day.accuracy}%
//               </div>
//               <div
//                 style={{
//                   ...styles.chartBar,
//                   height: `${height}%`,
//                   background:
//                     parseFloat(day.accuracy) >= 80
//                       ? '#10b981'
//                       : parseFloat(day.accuracy) >= 60
//                       ? '#f59e0b'
//                       : '#ef4444'
//                 }}
//                 title={`${day.accuracy}% accuracy`}
//               />
//               <span style={styles.chartDate}>
//                 {new Date(day.date).toLocaleDateString('en-US', {
//                   month: 'short',
//                   day: 'numeric'
//                 })}
//               </span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// function getStrengthColor(strength) {
//   if (strength >= 80) return '#10b981';
//   if (strength >= 60) return '#3b82f6';
//   if (strength >= 40) return '#f59e0b';
//   return '#ef4444';
// }

// const styles = {
//   headerActions: {
//     display: 'flex',
//     gap: '12px',
//     alignItems: 'center',
//     flexWrap: 'wrap'
//   },
  
//   downloadButton: {
//     background: 'linear-gradient(135deg, #10b981, #059669)',
//     color: 'white',
//     border: 'none',
//     padding: '12px 24px',
//     borderRadius: '10px',
//     fontSize: '14px',
//     fontWeight: '600',
//     cursor: 'pointer',
//     transition: 'all 0.2s ease',
//     boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
//     whiteSpace: 'nowrap'
//   },
  
//   downloadButtonDisabled: {
//     background: '#94a3b8',
//     color: 'white',
//     border: 'none',
//     padding: '12px 24px',
//     borderRadius: '10px',
//     fontSize: '14px',
//     fontWeight: '600',
//     cursor: 'not-allowed',
//     whiteSpace: 'nowrap',
//     opacity: 0.7
//   },
  
//   page: {
//     padding: '32px',
//     maxWidth: '1400px',
//     margin: '0 auto',
//     background: '#f8fafc'
//   },
  
//   loadingContainer: {
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: '60vh',
//     gap: '16px'
//   },
  
//   spinner: {
//     width: '48px',
//     height: '48px',
//     border: '4px solid #e2e8f0',
//     borderTopColor: '#3b82f6',
//     borderRadius: '50%',
//     animation: 'spin 1s linear infinite'
//   },
  
//   loadingText: {
//     fontSize: '16px',
//     color: '#64748b'
//   },
  
//   emptyState: {
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: '60vh',
//     textAlign: 'center',
//     padding: '40px'
//   },
  
//   emptyIcon: {
//     fontSize: '64px',
//     marginBottom: '24px'
//   },
  
//   emptyTitle: {
//     fontSize: '28px',
//     fontWeight: '700',
//     color: '#0f172a',
//     marginBottom: '12px'
//   },
  
//   emptyText: {
//     fontSize: '16px',
//     color: '#64748b',
//     marginBottom: '32px',
//     maxWidth: '400px'
//   },
  
//   startButton: {
//     background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
//     color: 'white',
//     border: 'none',
//     padding: '14px 32px',
//     borderRadius: '12px',
//     fontSize: '16px',
//     fontWeight: '600',
//     cursor: 'pointer',
//     transition: 'transform 0.2s ease'
//   },
  
//   header: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: '32px',
//     flexWrap: 'wrap',
//     gap: '16px'
//   },
  
//   title: {
//     fontSize: '32px',
//     fontWeight: '800',
//     color: '#0f172a',
//     margin: 0
//   },
  
//   subtitle: {
//     fontSize: '16px',
//     color: '#64748b',
//     marginTop: '8px'
//   },
  
//   filterContainer: {
//     display: 'flex',
//     gap: '8px',
//     background: 'white',
//     padding: '4px',
//     borderRadius: '12px',
//     boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
//   },
  
//   filterBtn: {
//     padding: '8px 16px',
//     border: 'none',
//     background: 'transparent',
//     color: '#64748b',
//     borderRadius: '8px',
//     cursor: 'pointer',
//     fontSize: '14px',
//     fontWeight: '500',
//     transition: 'all 0.2s ease'
//   },
  
//   filterBtnActive: {
//     padding: '8px 16px',
//     border: 'none',
//     background: '#3b82f6',
//     color: 'white',
//     borderRadius: '8px',
//     cursor: 'pointer',
//     fontSize: '14px',
//     fontWeight: '600'
//   },
  
//   statsGrid: {
//     display: 'grid',
//     gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
//     gap: '20px',
//     marginBottom: '24px'
//   },
  
//   statCard: {
//     background: 'white',
//     borderRadius: '16px',
//     padding: '24px',
//     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//     display: 'flex',
//     gap: '16px',
//     alignItems: 'flex-start'
//   },
  
//   statIcon: {
//     width: '56px',
//     height: '56px',
//     borderRadius: '12px',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0
//   },
  
//   statContent: {
//     flex: 1,
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '4px'
//   },
  
//   statLabel: {
//     fontSize: '13px',
//     color: '#64748b',
//     fontWeight: '500'
//   },
  
//   statValue: {
//     fontSize: '28px',
//     fontWeight: '700',
//     lineHeight: 1
//   },
  
//   statSubValue: {
//     fontSize: '13px',
//     color: '#64748b'
//   },
  
//   trendBadge: {
//     display: 'inline-block',
//     padding: '4px 8px',
//     borderRadius: '6px',
//     fontSize: '12px',
//     fontWeight: '600',
//     marginTop: '4px'
//   },
  
//   trendCard: {
//     borderRadius: '20px',
//     padding: '32px',
//     marginBottom: '24px',
//     color: 'white',
//     display: 'flex',
//     gap: '24px',
//     alignItems: 'center',
//     boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
//   },
  
//   trendIcon: {
//     fontSize: '48px',
//     flexShrink: 0
//   },
  
//   trendContent: {
//     flex: 1
//   },
  
//   trendTitle: {
//     fontSize: '24px',
//     fontWeight: '700',
//     marginBottom: '8px'
//   },
  
//   trendText: {
//     fontSize: '15px',
//     opacity: 0.95,
//     marginBottom: '16px',
//     lineHeight: 1.5
//   },
  
//   trendStats: {
//     display: 'flex',
//     alignItems: 'center',
//     gap: '16px'
//   },
  
//   trendStatLabel: {
//     display: 'block',
//     fontSize: '12px',
//     opacity: 0.8,
//     marginBottom: '4px'
//   },
  
//   trendStatValue: {
//     display: 'block',
//     fontSize: '20px',
//     fontWeight: '700'
//   },
  
//   trendArrow: {
//     fontSize: '20px',
//     opacity: 0.8
//   },
  
//   card: {
//     background: 'white',
//     borderRadius: '16px',
//     padding: '24px',
//     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//     marginBottom: '24px'
//   },
  
//   cardTitle: {
//     fontSize: '18px',
//     fontWeight: '700',
//     color: '#0f172a',
//     marginBottom: '20px'
//   },
  
//   twoColumnGrid: {
//     display: 'grid',
//     gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
//     gap: '20px',
//     marginBottom: '24px'
//   },
  
//   problemLettersList: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '12px'
//   },
  
//   problemLetterItem: {
//     display: 'flex',
//     alignItems: 'center',
//     gap: '16px'
//   },
  
//   letterBadge: {
//     width: '48px',
//     height: '48px',
//     borderRadius: '12px',
//     background: 'linear-gradient(135deg, #ef4444, #dc2626)',
//     color: 'white',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     fontSize: '20px',
//     fontWeight: '700',
//     flexShrink: 0
//   },
  
//   problemLetterInfo: {
//     flex: 1
//   },
  
//   problemLetterCount: {
//     fontSize: '14px',
//     color: '#64748b',
//     display: 'block',
//     marginBottom: '6px'
//   },
  
//   progressBarBg: {
//     height: '8px',
//     background: '#e2e8f0',
//     borderRadius: '4px',
//     overflow: 'hidden'
//   },
  
//   progressBarFill: {
//     height: '100%',
//     borderRadius: '4px',
//     transition: 'width 0.3s ease'
//   },
  
//   sentenceList: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '16px'
//   },
  
//   sentenceItem: {
//     padding: '16px',
//     background: '#f8fafc',
//     borderRadius: '12px',
//     borderLeft: '4px solid #f59e0b'
//   },
  
//   sentenceText: {
//     fontSize: '14px',
//     color: '#0f172a',
//     marginBottom: '12px',
//     fontStyle: 'italic',
//     lineHeight: 1.6
//   },
  
//   sentenceStats: {
//     display: 'flex',
//     gap: '16px'
//   },
  
//   sentenceStat: {
//     fontSize: '13px',
//     color: '#64748b',
//     fontWeight: '500'
//   },
  
//   feedbackCard: {
//     background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
//     borderRadius: '20px',
//     padding: '32px',
//     marginBottom: '24px',
//     border: '2px solid #bae6fd'
//   },
  
//   feedbackTitle: {
//     fontSize: '20px',
//     fontWeight: '700',
//     color: '#0c4a6e',
//     marginBottom: '20px'
//   },
  
//   feedbackMessages: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '12px',
//     marginBottom: '20px'
//   },
  
//   feedbackMessage: {
//     fontSize: '15px',
//     color: '#0f172a',
//     lineHeight: 1.6,
//     padding: '12px 16px',
//     background: 'white',
//     borderRadius: '10px',
//     margin: 0
//   },
  
//   motivationalBox: {
//     background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
//     padding: '20px',
//     borderRadius: '12px',
//     display: 'flex',
//     alignItems: 'center',
//     gap: '16px',
//     marginBottom: '20px'
//   },
  
//   quoteIcon: {
//     fontSize: '32px',
//     flexShrink: 0
//   },
  
//   motivationalText: {
//     fontSize: '16px',
//     fontWeight: '600',
//     color: '#78350f',
//     margin: 0
//   },
  
//   recommendationsBox: {
//     background: 'white',
//     padding: '20px',
//     borderRadius: '12px'
//   },
  
//   recommendationsTitle: {
//     fontSize: '15px',
//     fontWeight: '700',
//     color: '#0f172a',
//     marginBottom: '12px',
//     marginTop: 0
//   },
  
//   recommendationsList: {
//     margin: 0,
//     paddingLeft: '20px'
//   },
  
//   recommendationItem: {
//     fontSize: '14px',
//     color: '#475569',
//     marginBottom: '8px',
//     lineHeight: 1.6
//   },
  
//   // Compact chart
//   chartContainer: {
//     padding: '8px 0 0',
//   },
  
//   chartBars: {
//     display: 'flex',
//     alignItems: 'flex-end',
//     gap: '8px',
//     height: '110px',       // was 200px — now compact
//     paddingBottom: '28px', // room for date labels
//     position: 'relative',
//   },
  
//   chartBarWrapper: {
//     flex: 1,
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     gap: '4px',
//     height: '100%',
//     position: 'relative',
//   },

//   chartBarAccuracy: {
//     fontSize: '10px',
//     fontWeight: '700',
//     color: '#475569',
//     marginBottom: '2px',
//   },
  
//   chartBar: {
//     width: '100%',
//     borderRadius: '5px 5px 0 0',
//     minHeight: '8px',
//     transition: 'height 0.3s ease',
//   },
  
//   chartDate: {
//     position: 'absolute',
//     bottom: 0,
//     fontSize: '10px',
//     color: '#94a3b8',
//     fontWeight: '500',
//     textAlign: 'center',
//     whiteSpace: 'nowrap',
//   },
  
//   ctaCard: {
//     background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
//     borderRadius: '20px',
//     padding: '32px',
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     color: 'white',
//     flexWrap: 'wrap',
//     gap: '20px'
//   },
  
//   ctaTitle: {
//     fontSize: '24px',
//     fontWeight: '700',
//     marginBottom: '8px',
//     marginTop: 0
//   },
  
//   ctaText: {
//     fontSize: '15px',
//     opacity: 0.9,
//     margin: 0
//   },
  
//   ctaButton: {
//     background: 'white',
//     color: '#1e40af',
//     border: 'none',
//     padding: '14px 28px',
//     borderRadius: '12px',
//     fontSize: '16px',
//     fontWeight: '700',
//     cursor: 'pointer',
//     transition: 'transform 0.2s ease, box-shadow 0.2s ease',
//     boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
//   }
// };

// const styleSheet = document.createElement("style");
// styleSheet.textContent = `
//   @keyframes spin {
//     to { transform: rotate(360deg); }
//   }
  
//   button:hover:not(:disabled) {
//     transform: translateY(-2px);
//   }
  
//   button:disabled {
//     cursor: not-allowed;
//   }
// `;
// document.head.appendChild(styleSheet);

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [timeframe, setTimeframe] = useState(7);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [user, data] = await Promise.all([
          apiFetch("/api/auth/me"),
          apiFetch(`/api/reports/student?timeframe=${timeframe}`),
        ]);
        setUserInfo(user);
        setSummary(data.summary);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [timeframe]);

  if (loading) return (
    <div style={s.loadingContainer}>
      <div style={s.spinner} />
      <p style={s.loadingText}>Loading your progress...</p>
    </div>
  );

  const cards = [
    {
      key: "letters",
      icon: "🔤",
      title: "Letter Practice",
      desc: "Track how well you pronounce individual letters and sounds",
      color: "#f59e0b",
      grad: "linear-gradient(135deg, #fef3c7, #fde68a)",
      border: "#fcd34d",
      route: "/student/report/letters",
     
    },
    {
      key: "words",
      icon: "🔡",
      title: "Word Practice",
      desc: "Review your two-letter word accuracy and problem words",
      color: "#8b5cf6",
      grad: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
      border: "#c4b5fd",
      route: "/student/report/words",
     
    },
    {
      key: "sentences",
      icon: "📝",
      title: "Sentence Practice",
      desc: "Full sentence accuracy, problem phonemes and daily progress",
      color: "#3b82f6",
      grad: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
      border: "#93c5fd",
      route: "/student/report/sentences",
      
    },
  ];

  return (
    <div style={s.page}>
     

      {/* HERO */}
      <div style={s.hero}>
        <h1 style={s.heroTitle}>Welcome back, {userInfo?.name || "Student"}! 👋</h1>
        <p style={s.heroSub}>Select a practice area to view your detailed report</p>
        <div style={s.filterContainer}>
          {[7, 30, 90].map(t => (
            <button key={t} style={timeframe === t ? s.filterBtnActive : s.filterBtn} onClick={() => setTimeframe(t)}>{t} Days</button>
          ))}
        </div>
      </div>

      {/* REPORT CARDS */}
      <div style={s.grid}>
        {cards.map(card => (
          <div
            key={card.key}
            style={{ ...s.card, background: card.grad, border: `2px solid ${card.border}`, opacity: card.hasData ? 1 : 0.65 }}
            onClick={() => navigate(card.route)}
          >
            <div style={{ ...s.cardIcon, color: card.color }}>{card.icon}</div>
            <h2 style={{ ...s.cardTitle, color: card.color }}>{card.title}</h2>
            <p style={s.cardDesc}>{card.desc}</p>
            <div style={{ ...s.cardStat, color: card.color }}>{card.stat}</div>
            
          </div>
        ))}
      </div>

      {/* QUICK TIP */}
      <div style={s.tip}>
        <span style={s.tipIcon}>💡</span>
        <p style={s.tipText}>Tip: Practice all three levels regularly for the best results. Start with letters, then words, then sentences!</p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontSize: 22, fontWeight: 800, color: "#1e40af", cursor: "pointer", letterSpacing: "-0.5px" },
  navLink: { fontSize: 14, fontWeight: 600, color: "#3b82f6", cursor: "pointer", padding: "6px 14px", borderRadius: 8, background: "#eff6ff" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 },
  spinner: { width: 48, height: 48, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  loadingText: { fontSize: 16, color: "#64748b" },
  hero: { padding: "48px 32px 32px", textAlign: "center" },
  heroTitle: { fontSize: 36, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" },
  heroSub: { fontSize: 18, color: "#64748b", margin: "0 0 24px" },
  filterContainer: { display: "inline-flex", gap: 8, background: "white", padding: 4, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  filterBtn: { padding: "8px 20px", border: "none", background: "transparent", color: "#64748b", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  filterBtnActive: { padding: "8px 20px", border: "none", background: "#3b82f6", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, padding: "0 32px", maxWidth: 1100, margin: "0 auto" },
  card: { borderRadius: 20, padding: 32, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", display: "flex", flexDirection: "column", gap: 12 },
  cardIcon: { fontSize: 48 },
  cardTitle: { fontSize: 24, fontWeight: 800, margin: 0 },
  cardDesc: { fontSize: 15, color: "#475569", margin: 0, lineHeight: 1.6 },
  cardStat: { fontSize: 13, fontWeight: 600, margin: 0 },
  cardArrow: { alignSelf: "flex-start", marginTop: 8, color: "white", padding: "8px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600 },
  tip: { display: "flex", alignItems: "center", gap: 16, background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 28px", margin: "32px auto", maxWidth: 700 },
  tipIcon: { fontSize: 28, flexShrink: 0 },
  tipText: { fontSize: 15, color: "#475569", margin: 0, lineHeight: 1.6 },
};

// inject CSS
const ss = document.createElement("style");
ss.textContent = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); @keyframes spin { to { transform: rotate(360deg); } } [style*='cursor: pointer']:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }`;
document.head.appendChild(ss);