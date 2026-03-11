import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function GuardianLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.left}>
          <div
            style={styles.logo}
            onClick={() => navigate("/")}
          >
            LexCura
          </div>

          <button
            onClick={() => navigate("/guardian/dashboard")}
            style={styles.dashboardBtn}
          >
            Dashboard
          </button>
        </div>

        <div style={styles.userInfo}>
          <span style={styles.userName}>{user?.name || "Guardian"}</span>
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      {/* Page Content */}
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

/* =========================
   Styles
========================== */
const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    background: "white",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1e40af",
    cursor: "pointer",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  dashboardBtn: {
    background: "transparent",
    border: "1px solid #c7d2fe",
    color: "#1e40af",
    padding: "6px 14px",
    borderRadius: 999,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userName: {
    color: "#64748b",
    fontWeight: 500,
    fontSize: 14,
  },
  logoutBtn: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  content: {
    padding: 32,
    maxWidth: 1200,
    margin: "0 auto",
  },
};