import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function LetterReport() {
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
          apiFetch("/api/auth/me"),
          apiFetch(`/api/reports/student/letters?timeframe=${timeframe}`),
        ]);
        setUserInfo(user);
        setReport(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [timeframe]);

  const downloadPDF = () => {
    if (!report?.metrics) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit:"mm", format:"a4" });
      const m = report.metrics;
      const name = userInfo?.name || "Student";

      doc.setFillColor(245, 158, 11);
      doc.rect(0,0,210,30,"F");
      doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(20);
      doc.text("LexCura Speech Therapy",105,14,{align:"center"});
      doc.setFontSize(12); doc.setFont("helvetica","normal");
      doc.text("Letter Level Progress Report",105,22,{align:"center"});

      doc.setTextColor(0,0,0); let yPos=40;
      doc.setDrawColor(245,158,11); doc.rect(15,yPos,180,22);
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("Report Information",20,yPos+7);
      doc.setFont("helvetica","normal"); doc.setFontSize(10);
      doc.text(`Student: ${name}`,20,yPos+14);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`,120,yPos+14);
      doc.text(`Letters Practiced: ${m.overview.totalLettersPracticed}`,20,yPos+19);
      doc.text(`Avg Strength: ${m.overview.avgStrength}%`,120,yPos+19);
      yPos+=35;

      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(245,158,11);
      doc.text("Overview",20,yPos); yPos+=8;
      doc.autoTable({ startY:yPos, head:[["Metric","Value"]],
        body:[
          ["Letters Practiced", m.overview.totalLettersPracticed],
          ["Total Attempts", m.overview.totalAttempts],
          ["Average Strength", `${m.overview.avgStrength}%`],
          ["Letters Needing Work", m.overview.weakCount],
        ],
        theme:"striped", styles:{font:"helvetica",fontSize:10,cellPadding:4}, headStyles:{fillColor:[245,158,11]}, tableWidth:80,
      });
      yPos = doc.lastAutoTable.finalY+12;

      if (m.weakLetters?.length>0) {
        doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(239,68,68);
        doc.text("Letters Requiring Attention",20,yPos); yPos+=8;
        doc.autoTable({ startY:yPos, head:[["Letter","Strength","Error Rate","Attempts"]],
          body:m.weakLetters.map(l=>[l.letter.toUpperCase(),`${l.strength}%`,`${l.errorRate}%`,l.attempts]),
          theme:"striped", styles:{font:"helvetica",fontSize:9}, headStyles:{fillColor:[239,68,68]},
        });
        yPos=doc.lastAutoTable.finalY+12;
      }

      if (m.strongLetters?.length>0) {
        if(yPos>220){doc.addPage();yPos=20;}
        doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(16,185,129);
        doc.text("Strongest Letters",20,yPos); yPos+=8;
        doc.autoTable({ startY:yPos, head:[["Letter","Strength","Attempts"]],
          body:m.strongLetters.map(l=>[l.letter.toUpperCase(),`${l.strength}%`,l.attempts]),
          theme:"striped", styles:{font:"helvetica",fontSize:9}, headStyles:{fillColor:[16,185,129]},
        });
        yPos=doc.lastAutoTable.finalY+12;
      }

      if (m.allLetters?.length>0) {
        if(yPos>180){doc.addPage();yPos=20;}
        doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(245,158,11);
        doc.text("All Letters Overview",20,yPos); yPos+=8;
        doc.autoTable({ startY:yPos, head:[["Letter","Strength","Attempts"]],
          body:m.allLetters.map(l=>[l.letter.toUpperCase(),`${l.strength}%`,l.attempts]),
          theme:"striped", styles:{font:"helvetica",fontSize:9}, headStyles:{fillColor:[245,158,11]},
        });
        yPos=doc.lastAutoTable.finalY+15;
      }

      if(yPos>215){doc.addPage();yPos=20;}
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(139,92,246);
      doc.text("Therapist Remarks",20,yPos); yPos+=10;
      doc.setDrawColor(139,92,246); doc.setLineWidth(0.5); doc.rect(15,yPos,180,60);
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2);
      for(let i=0;i<10;i++){const ly=yPos+6+i*5.5;if(ly<yPos+58)doc.line(20,ly,190,ly);}
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(120,120,120);
      doc.text("Therapist notes and recommendations:",20,yPos+3); yPos+=70;
      doc.setDrawColor(100,100,100); doc.setLineWidth(0.3); doc.line(20,yPos,100,yPos);
      doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
      doc.text("Therapist Signature",20,yPos+5); doc.line(120,yPos,190,yPos); doc.text("Date",120,yPos+5);

      const pc=doc.internal.getNumberOfPages();
      for(let i=1;i<=pc;i++){
        doc.setPage(i); doc.setDrawColor(200); doc.line(20,285,190,285);
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text("LexCura Speech Therapy - Confidential Clinical Report",20,290);
        doc.text(`Page ${i} of ${pc}`,190,290,{align:"right"});
      }
      doc.save(`LexCura_Letters_${name.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch(err){console.error(err);alert("Failed to generate PDF");}
    finally{setDownloading(false);}
  };

  if (loading) return <div style={s.center}><div style={s.spinner}/></div>;

  const getStrengthColor = v => v>=80?"#10b981":v>=60?"#3b82f6":v>=40?"#f59e0b":"#ef4444";

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo} onClick={()=>navigate("/")}>LexCura</span>
        <span style={s.navLink} onClick={()=>navigate("/student/dashboard")}>Dashboard</span>
      </nav>

      <div style={s.content}>
        <div style={s.pageHeader}>
          <div>
            <button style={s.backBtn} onClick={()=>navigate("/student/dashboard")}>← Back</button>
            <h1 style={s.pageTitle}>🔤 Letter Report</h1>
            <p style={s.pageSub}>Individual letter and sound analysis</p>
          </div>
          <div style={s.headerRight}>
            <button style={downloading?s.dlBtnDisabled:s.dlBtn} onClick={downloadPDF} disabled={downloading}>
              {downloading?"⏳ Generating...":"📥 Download PDF"}
            </button>
            <div style={s.filterContainer}>
              {[7,30,90].map(t=>(
                <button key={t} style={timeframe===t?s.filterBtnActive:s.filterBtn} onClick={()=>setTimeframe(t)}>{t} Days</button>
              ))}
            </div>
          </div>
        </div>

        {!report?.metrics ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🔤</div>
            <h2 style={s.emptyTitle}>No Letter Data Yet</h2>
            <p style={s.emptyText}>Complete some letter exercises to see your report here.</p>
            <button style={s.practiceBtn} onClick={()=>navigate("/student/letter-level")}>Start Practicing</button>
          </div>
        ) : (
          <>
            {/* OVERVIEW STATS */}
            <div style={s.statsGrid}>
              <StatCard icon="🔤" label="Letters Practiced" value={report.metrics.overview.totalLettersPracticed} color="#f59e0b" />
              <StatCard icon="💪" label="Avg Strength" value={`${report.metrics.overview.avgStrength}%`} color="#10b981" />
              <StatCard icon="⚠️" label="Need Work" value={report.metrics.overview.weakCount} color="#ef4444" />
              <StatCard icon="🔁" label="Total Attempts" value={report.metrics.overview.totalAttempts} color="#3b82f6" />
            </div>

            {/* WEAK LETTERS */}
            {report.metrics.weakLetters?.length > 0 && (
              <div style={s.card}>
                <h3 style={{...s.cardTitle, color:"#ef4444"}}>⚠️ Letters Needing Attention</h3>
                <div style={s.letterGrid}>
                  {report.metrics.weakLetters.map((item,i) => (
                    <div key={i} style={s.letterCard}>
                      <div style={{...s.bigLetter, color:"#ef4444"}}>{item.letter.toUpperCase()}</div>
                      <div style={s.strengthRow}>
                        <span style={s.strengthLabel}>Strength</span>
                        <span style={{...s.strengthVal, color:"#ef4444"}}>{item.strength}%</span>
                      </div>
                      <div style={s.barBg}>
                        <div style={{...s.barFill, width:`${item.strength}%`, background:"#ef4444"}}/>
                      </div>
                      <span style={s.attemptsLabel}>{item.attempts} attempts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STRONG LETTERS */}
            {report.metrics.strongLetters?.length > 0 && (
              <div style={s.card}>
                <h3 style={{...s.cardTitle, color:"#10b981"}}>✅ Strongest Letters</h3>
                <div style={s.letterGrid}>
                  {report.metrics.strongLetters.map((item,i) => (
                    <div key={i} style={{...s.letterCard, border:"1.5px solid #d1fae5"}}>
                      <div style={{...s.bigLetter, color:"#10b981"}}>{item.letter.toUpperCase()}</div>
                      <div style={s.strengthRow}>
                        <span style={s.strengthLabel}>Strength</span>
                        <span style={{...s.strengthVal, color:"#10b981"}}>{item.strength}%</span>
                      </div>
                      <div style={s.barBg}>
                        <div style={{...s.barFill, width:`${item.strength}%`, background:"#10b981"}}/>
                      </div>
                      <span style={s.attemptsLabel}>{item.attempts} attempts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALL LETTERS GRID */}
            {report.metrics.allLetters?.length > 0 && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>📊 All Letters Overview</h3>
                <div style={s.allLettersGrid}>
                  {report.metrics.allLetters.map((item,i) => {
                    const strength = parseFloat(item.strength);
                    const color = getStrengthColor(strength);
                    return (
                      <div key={i} style={{...s.miniLetterCard, borderColor: color}}>
                        <span style={{...s.miniLetter, color}}>{item.letter.toUpperCase()}</span>
                        <span style={{...s.miniStrength, color}}>{item.strength}%</span>
                        <div style={s.miniBarBg}>
                          <div style={{...s.miniBarFill, width:`${strength}%`, background:color}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* LEGEND */}
                <div style={s.legend}>
                  {[["#10b981","≥80% Strong"],["#3b82f6","60-79% Good"],["#f59e0b","40-59% Fair"],["#ef4444","<40% Needs Work"]].map(([c,l])=>(
                    <div key={l} style={s.legendItem}><div style={{width:12,height:12,borderRadius:3,background:c}}/><span style={s.legendLabel}>{l}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div style={s.cta}>
              <div><h3 style={s.ctaTitle}>Keep going! 🚀</h3><p style={s.ctaText}>Daily letter practice builds a strong foundation.</p></div>
              <button style={s.ctaBtn} onClick={()=>navigate("/student/letter-level")}>Practice Letters</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={{...s.statIcon, background:`${color}18`}}><span style={{fontSize:22}}>{icon}</span></div>
      <div style={s.statBody}>
        <span style={s.statLabel}>{label}</span>
        <span style={{...s.statVal, color}}>{value}</span>
      </div>
    </div>
  );
}

const s = {
  page:{minHeight:"100vh",background:"#f8fafc",fontFamily:"'DM Sans',sans-serif"},
  nav:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",height:60,background:"white",borderBottom:"1px solid #e2e8f0",position:"sticky",top:0,zIndex:100},
  logo:{fontSize:22,fontWeight:800,color:"#1e40af",cursor:"pointer"},
  navLink:{fontSize:14,fontWeight:600,color:"#3b82f6",cursor:"pointer",padding:"6px 14px",borderRadius:8,background:"#eff6ff"},
  content:{maxWidth:1200,margin:"0 auto",padding:"32px"},
  pageHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:32},
  backBtn:{background:"none",border:"1px solid #e2e8f0",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:13,color:"#64748b",marginBottom:8,display:"block"},
  pageTitle:{fontSize:32,fontWeight:800,color:"#0f172a",margin:0},
  pageSub:{fontSize:16,color:"#64748b",marginTop:4},
  headerRight:{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"},
  dlBtn:{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(245,158,11,0.3)"},
  dlBtnDisabled:{background:"#94a3b8",color:"white",border:"none",padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"not-allowed",whiteSpace:"nowrap",opacity:0.7},
  filterContainer:{display:"flex",gap:8,background:"white",padding:4,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.1)"},
  filterBtn:{padding:"8px 16px",border:"none",background:"transparent",color:"#64748b",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:500},
  filterBtnActive:{padding:"8px 16px",border:"none",background:"#f59e0b",color:"white",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20,marginBottom:24},
  statCard:{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",display:"flex",gap:16,alignItems:"flex-start"},
  statIcon:{width:52,height:52,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  statBody:{flex:1,display:"flex",flexDirection:"column",gap:4},
  statLabel:{fontSize:13,color:"#64748b",fontWeight:500},
  statVal:{fontSize:28,fontWeight:700,lineHeight:1},
  card:{background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:24},
  cardTitle:{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:20},
  letterGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:16},
  letterCard:{background:"#fafafa",borderRadius:14,padding:16,border:"1.5px solid #fee2e2",display:"flex",flexDirection:"column",gap:8,alignItems:"center"},
  bigLetter:{fontSize:48,fontWeight:800,lineHeight:1},
  strengthRow:{display:"flex",justifyContent:"space-between",width:"100%"},
  strengthLabel:{fontSize:12,color:"#64748b"},
  strengthVal:{fontSize:14,fontWeight:700},
  barBg:{width:"100%",height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden"},
  barFill:{height:"100%",borderRadius:3,transition:"width 0.3s"},
  attemptsLabel:{fontSize:11,color:"#94a3b8"},
  allLettersGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:10,marginBottom:20},
  miniLetterCard:{background:"white",borderRadius:10,padding:"12px 8px",border:"1.5px solid",display:"flex",flexDirection:"column",alignItems:"center",gap:4},
  miniLetter:{fontSize:28,fontWeight:800,lineHeight:1},
  miniStrength:{fontSize:12,fontWeight:700},
  miniBarBg:{width:"100%",height:4,background:"#e2e8f0",borderRadius:2,overflow:"hidden"},
  miniBarFill:{height:"100%",borderRadius:2},
  legend:{display:"flex",flexWrap:"wrap",gap:16},
  legendItem:{display:"flex",alignItems:"center",gap:6},
  legendLabel:{fontSize:12,color:"#64748b"},
  cta:{background:"linear-gradient(135deg,#d97706,#f59e0b)",borderRadius:20,padding:"28px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"white",flexWrap:"wrap",gap:16},
  ctaTitle:{fontSize:22,fontWeight:700,margin:"0 0 6px"},
  ctaText:{fontSize:14,opacity:0.9,margin:0},
  ctaBtn:{background:"white",color:"#d97706",border:"none",padding:"12px 24px",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"},
  empty:{textAlign:"center",padding:"80px 40px"},
  emptyIcon:{fontSize:64,marginBottom:20},
  emptyTitle:{fontSize:26,fontWeight:700,color:"#0f172a",marginBottom:10},
  emptyText:{fontSize:16,color:"#64748b",marginBottom:28},
  practiceBtn:{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",padding:"14px 28px",borderRadius:12,fontSize:16,fontWeight:600,cursor:"pointer"},
  center:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"},
  spinner:{width:48,height:48,border:"4px solid #e2e8f0",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 1s linear infinite"},
};

const ss = document.createElement("style");
ss.textContent = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(ss);