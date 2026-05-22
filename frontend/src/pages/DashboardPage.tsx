import { useEffect, useState } from "react";
import { dashboard } from "../api/casegraph";
import type { Page } from "../App";
import type { ChartDatum, DashboardSummary, PendingCaseDatum } from "../types/api";

type Props = {
  onNavigate: (page: Page) => void;
};

const chartColors = ["#0f766e", "#2563eb", "#c2410c", "#9333ea", "#be123c", "#64748b"];

function total(items: ChartDatum[]) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

function countBy(items: string[]) {
  return Object.entries(
    items.reduce<Record<string, number>>((counts, label) => {
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    }, {})
  ).map(([label, value]) => ({ label, value }));
}

function pendingCasesFromRecentCases(cases: DashboardSummary["recent_cases"]): PendingCaseDatum[] {
  return cases
    .map((item) => {
      let daysPending: number | null = null;
      if (item.date_of_registration) {
        const filedAt = new Date(`${item.date_of_registration}T00:00:00`);
        if (!Number.isNaN(filedAt.getTime())) {
          daysPending = Math.max(0, Math.floor((Date.now() - filedAt.getTime()) / 86_400_000));
        }
      }
      return {
        id: item.id,
        case_number: item.case_number,
        case_title: item.case_title,
        days_pending: daysPending,
        pending_limit_days: item.pending_limit_days,
        date_of_registration: item.date_of_registration
      };
    })
    .sort((left, right) => (right.days_pending ?? -1) - (left.days_pending ?? -1));
}

function pendingCaseClassName(item: PendingCaseDatum) {
  if (item.days_pending === null) return "pending-case-row";
  if (item.days_pending >= item.pending_limit_days) return "pending-case-row danger";
  if (item.days_pending >= Math.min(60, item.pending_limit_days * 0.75)) return "pending-case-row warning";
  if (item.days_pending >= Math.min(30, item.pending_limit_days * 0.5)) return "pending-case-row notice";
  return "pending-case-row success";
}

function PendingCasesCard({ items }: { items: PendingCaseDatum[] }) {
  return (
    <section className="chart-card pending-card">
      <h2>Case Wise Pending Since FIR</h2>
      <div className="pending-case-list">
        {items.map((item) => (
          <div className={pendingCaseClassName(item)} key={item.id}>
            <div>
              <strong>{item.case_number}</strong>
              <span>{item.case_title}</span>
            </div>
            <strong>
              {item.days_pending === null ? "FIR date pending" : `${item.days_pending} days pending`}
            </strong>
          </div>
        ))}
        {!items.length && <div className="empty compact-empty">No pending case data.</div>}
      </div>
    </section>
  );
}

function BarChartCard({ title, items }: { title: string; items: ChartDatum[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      <div className="bar-chart">
        {items.map((item, index) => (
          <div className="bar-row" key={item.label}>
            <div className="bar-label">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="bar-track">
              <span
                className="bar-fill"
                style={{
                  background: chartColors[index % chartColors.length],
                  width: `${(item.value / max) * 100}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DonutChartCard({ title, items }: { title: string; items: ChartDatum[] }) {
  const rawTotal = total(items);
  const sum = Math.max(1, rawTotal);
  let start = 0;
  const segments = items.map((item, index) => {
    const end = start + (item.value / sum) * 100;
    const segment = `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
    start = end;
    return segment;
  });
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      <div className="donut-layout">
        <div className="donut-chart" style={{ background: rawTotal ? `conic-gradient(${segments.join(", ")})` : "#e2e8f0" }}>
          <strong>{rawTotal}</strong>
          <span>Total</span>
        </div>
        <div className="chart-legend">
          {items.map((item, index) => (
            <div className="legend-row" key={item.label}>
              <span className="legend-dot" style={{ background: chartColors[index % chartColors.length] }} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardPage({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">Loading dashboard...</div>;

  const casesByStatus = data.cases_by_status ?? [
    { label: "Active", value: data.active_cases },
    { label: "Closed", value: data.closed_cases }
  ];
  const casesByPriority = data.cases_by_priority ?? countBy(data.recent_cases.map((item) => item.priority));
  const pendingCases = data.pending_cases ?? pendingCasesFromRecentCases(data.recent_cases);
  const accusedArrestStatus = data.accused_arrest_status ?? [{ label: "Accused", value: data.total_accused }];

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
      <div className="charts-grid">
        <BarChartCard title="Cases By Status" items={casesByStatus} />
        <BarChartCard title="Cases By Priority" items={casesByPriority} />
        <PendingCasesCard items={pendingCases} />
        <DonutChartCard title="Accused Arrest Status" items={accusedArrestStatus} />
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
