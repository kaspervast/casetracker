import { FormEvent, useEffect, useState } from "react";
import { createPerson, deletePerson, listPersons, updatePerson } from "../api/casegraph";
import type { PersonRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function PersonsPage() {
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function load() {
    setPersons(await listPersons());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createPerson({ full_name: fullName, father_name: fatherName });
      setFullName("");
      setFatherName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person creation failed");
    }
  }

  async function removePerson(person: PersonRecord) {
    const reason = window.prompt(`Reason for deleting person ${person.full_name}`);
    if (!reason?.trim()) return;
    setError("");
    try {
      await deletePerson(person.id, reason.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person delete failed");
    }
  }

  async function editPerson(person: PersonRecord) {
    const fullName = window.prompt("Full name", person.full_name);
    if (fullName === null) return;
    const fatherName = window.prompt("Father name", person.father_name ?? "");
    if (fatherName === null) return;
    const riskLevel = window.prompt("Risk level", person.risk_level);
    if (riskLevel === null) return;
    const verificationStatus = window.prompt("Verification status", person.verification_status);
    if (verificationStatus === null) return;
    setError("");
    try {
      await updatePerson(person.id, {
        full_name: fullName.trim(),
        father_name: fatherName.trim() || null,
        risk_level: riskLevel.trim(),
        verification_status: verificationStatus.trim()
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person update failed");
    }
  }

  function dropOn(targetId: string) {
    if (!draggedId) return;
    setPersons((items) => moveById(items, draggedId, targetId));
    setDraggedId(null);
  }

  return (
    <section className="stack">
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        <input placeholder="Father name" value={fatherName} onChange={(event) => setFatherName(event.target.value)} />
        <button className="primary">Create Person</button>
      </form>
      {error && <div className="error">{error}</div>}
      <div className="records">
        {persons.map((person) => (
          <article
            className="record draggable-record"
            draggable
            key={person.id}
            onDragStart={() => setDraggedId(person.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(person.id)}
          >
            <div>
              <span className="drag-handle">Drag to reorder</span>
              <strong>{person.full_name}</strong>
              <p>Father: {person.father_name ?? "Not recorded"}</p>
            </div>
            <div className="badges">
              <span className="badge">{person.risk_level}</span>
              <span className="badge">{person.verification_status}</span>
              {person.is_arrested && <span className="badge danger">Arrested</span>}
              <button className="secondary-button" type="button" onClick={() => editPerson(person)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removePerson(person)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
