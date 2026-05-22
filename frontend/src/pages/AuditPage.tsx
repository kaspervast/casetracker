import { useEffect, useState } from "react";
import { auditLogs } from "../api/casegraph";
import type { AuditLog } from "../types/api";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    auditLogs().then(setLogs).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <section className="table audit-table">
      <div className="table-head">
        <span>Time</span>
        <span>User</span>
        <span>Action</span>
        <span>Entity</span>
        <span>Status</span>
      </div>
      {logs.map((log) => (
        <div className="table-row" key={log.id}>
          <span>{new Date(log.timestamp).toLocaleString()}</span>
          <strong>{log.username ?? "system"}</strong>
          <span>{log.action}</span>
          <span>{log.entity_type ?? ""}</span>
          <span className={log.success ? "badge" : "badge danger"}>
            {log.success ? "success" : "failed"}
          </span>
        </div>
      ))}
    </section>
  );
}
