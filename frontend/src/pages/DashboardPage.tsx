import { useEffect, useState } from "react";
import { dashboard } from "../api/casegraph";
import type { Page } from "../App";
import type { DashboardSummary } from "../types/api";

type Props = {
  onNavigate: (page: Page) => void;
};

export function DashboardPage({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">Loading dashboard...</div>;

  const stats = [
    ["Total cases", data.total_cases],
    ["Active cases", data.active_cases],
    ["Closed cases", data.closed_cases],
    ["Assigned to me", data.assigned_cases],
    ["Persons", data.total_persons],
    ["Accused", data.total_accused],
    ["Suspects", data.total_suspects],
    ["Witnesses", data.total_witnesses],
    ["Mobiles", data.total_mobile_numbers],
    ["Bank accounts", data.total_bank_accounts],
    ["Evidence", data.total_evidence_items]
  ];

  return (
    <section className="stack">
      <div className="quick-actions">
        <button className="primary" type="button" onClick={() => onNavigate("cases")}>New Case</button>
        <button type="button" onClick={() => onNavigate("persons")}>Add Person</button>
        <button type="button" onClick={() => onNavigate("bank-accounts")}>Add Bank Account</button>
        <button type="button" onClick={() => onNavigate("mobile-numbers")}>Add Mobile Number</button>
        <button type="button" onClick={() => onNavigate("graph")}>Open Graph View</button>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <article className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="two-column">
        <section>
          <h2>Recently Updated Cases</h2>
          <div className="table">
            {data.recent_cases.map((item) => (
              <div className="table-row" key={item.id}>
                <strong>{item.case_number}</strong>
                <span>{item.case_title}</span>
                <span className="badge">{item.priority}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2>Recent Audit Activity</h2>
          <div className="table">
            {data.recent_audit_activity.map((item, index) => (
              <div className="table-row" key={index}>
                <strong>{item.action}</strong>
                <span>{item.username ?? "system"}</span>
                <span>{item.entity_type ?? ""}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
