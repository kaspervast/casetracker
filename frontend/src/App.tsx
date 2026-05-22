import { useEffect, useState } from "react";
import { Activity, FileText, GitBranch, LayoutDashboard, LogOut, Shield, Users } from "lucide-react";
import { clearToken, getToken, setToken } from "./api/client";
import { me } from "./api/casegraph";
import { AuditPage } from "./pages/AuditPage";
import { CasesPage } from "./pages/CasesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GraphPage } from "./pages/GraphPage";
import { LoginPage } from "./pages/LoginPage";
import { PersonsPage } from "./pages/PersonsPage";
import type { CurrentUser } from "./types/api";

type Page = "dashboard" | "cases" | "persons" | "graph" | "audit";

const nav = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "cases" as Page, label: "Cases", icon: FileText },
  { id: "persons" as Page, label: "Persons", icon: Users },
  { id: "graph" as Page, label: "Graph", icon: GitBranch },
  { id: "audit" as Page, label: "Audit", icon: Activity }
];

export function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(token: string) {
    setToken(token);
    setUser(await me());
  }

  function logout() {
    clearToken();
    setUser(null);
    setPage("dashboard");
  }

  if (loading) {
    return <main className="center-screen">Loading CaseGraph LE...</main>;
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={28} />
          <div>
            <strong>CaseGraph LE</strong>
            <span>Authorized official use only</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setPage(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="nav-item logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{nav.find((item) => item.id === page)?.label}</h1>
            <p>All access, exports, and evidence downloads are logged.</p>
          </div>
          <div className="user-pill">
            <strong>{user.full_name}</strong>
            <span>{user.roles.join(", ")}</span>
          </div>
        </header>
        {page === "dashboard" && <DashboardPage />}
        {page === "cases" && <CasesPage />}
        {page === "persons" && <PersonsPage />}
        {page === "graph" && <GraphPage />}
        {page === "audit" && <AuditPage />}
      </main>
    </div>
  );
}
