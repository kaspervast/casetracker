import { FormEvent, useEffect, useState } from "react";
import { createCase, listCases } from "../api/casegraph";
import type { CaseRecord } from "../types/api";

export function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setCases(await listCases());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createCase({
        case_number: caseNumber,
        case_title: caseTitle,
        case_status: "Draft",
        priority: "Medium",
        confidentiality_level: "Normal"
      });
      setCaseNumber("");
      setCaseTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Case creation failed");
    }
  }

  return (
    <section className="stack">
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="FIR/CR number" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} />
        <input placeholder="Case title" value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} />
        <button className="primary">Create Case</button>
      </form>
      {error && <div className="error">{error}</div>}
      <div className="records">
        {cases.map((item) => (
          <article className="record" key={item.id}>
            <div>
              <strong>{item.case_number}</strong>
              <h2>{item.case_title}</h2>
              <p>{item.short_summary ?? "No summary recorded."}</p>
            </div>
            <div className="badges">
              <span className="badge">{item.case_status}</span>
              <span className="badge">{item.priority}</span>
              <span className="badge">{item.confidentiality_level}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
