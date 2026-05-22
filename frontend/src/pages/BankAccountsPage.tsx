import { FormEvent, useEffect, useState } from "react";
import { createBankAccount, deleteBankAccount, listBankAccounts, updateBankAccount } from "../api/casegraph";
import type { BankAccountRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BankAccountRecord | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function load() {
    setAccounts(await listBankAccounts());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createBankAccount({
        account_number: accountNumber,
        account_holder_name: holderName || null,
        bank_name: bankName || null,
        ifsc: ifsc || null,
        current_status: "Unknown",
        source: "Manual entry"
      });
      setAccountNumber("");
      setHolderName("");
      setBankName("");
      setIfsc("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bank account creation failed");
    }
  }

  async function removeAccount(account: BankAccountRecord) {
    const reason = window.prompt(`Reason for deleting bank account ${account.account_number}`);
    if (!reason?.trim()) return;
    setError("");
    try {
      await deleteBankAccount(account.id, reason.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bank account delete failed");
    }
  }

  function startEdit(account: BankAccountRecord) {
    setEditing(account);
    setEditForm({
      account_number: account.account_number,
      account_holder_name: account.account_holder_name ?? "",
      bank_name: account.bank_name ?? "",
      branch_name: account.branch_name ?? "",
      ifsc: account.ifsc ?? "",
      account_type: account.account_type ?? "",
      current_status: account.current_status,
      freeze_amount: account.freeze_amount?.toString() ?? "",
      source: account.source ?? "",
      notes: account.notes ?? ""
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await updateBankAccount(editing.id, {
        account_number: editForm.account_number?.trim(),
        account_holder_name: editForm.account_holder_name?.trim() || null,
        bank_name: editForm.bank_name?.trim() || null,
        branch_name: editForm.branch_name?.trim() || null,
        ifsc: editForm.ifsc?.trim().toUpperCase() || null,
        account_type: editForm.account_type?.trim() || null,
        current_status: editForm.current_status?.trim() || "Unknown",
        freeze_amount: editForm.freeze_amount ? Number(editForm.freeze_amount) : null,
        source: editForm.source?.trim() || null,
        notes: editForm.notes?.trim() || null
      });
      setEditing(null);
      setEditForm({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bank account update failed");
    }
  }

  function dropOn(targetId: string) {
    if (!draggedId) return;
    setAccounts((items) => moveById(items, draggedId, targetId));
    setDraggedId(null);
  }

  return (
    <section className="stack">
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
        <input placeholder="Account holder" value={holderName} onChange={(event) => setHolderName(event.target.value)} />
        <input placeholder="Bank name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
        <input placeholder="IFSC" value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} />
        <button className="primary">Create Bank Account</button>
      </form>
      {editing && (
        <form className="edit-panel" onSubmit={saveEdit}>
          <h2>Edit Bank Account</h2>
          <div className="edit-grid">
            <input placeholder="Account number" value={editForm.account_number ?? ""} onChange={(event) => setEditForm({ ...editForm, account_number: event.target.value })} />
            <input placeholder="Account holder" value={editForm.account_holder_name ?? ""} onChange={(event) => setEditForm({ ...editForm, account_holder_name: event.target.value })} />
            <input placeholder="Bank name" value={editForm.bank_name ?? ""} onChange={(event) => setEditForm({ ...editForm, bank_name: event.target.value })} />
            <input placeholder="Branch name" value={editForm.branch_name ?? ""} onChange={(event) => setEditForm({ ...editForm, branch_name: event.target.value })} />
            <input placeholder="IFSC" value={editForm.ifsc ?? ""} onChange={(event) => setEditForm({ ...editForm, ifsc: event.target.value.toUpperCase() })} />
            <input placeholder="Account type" value={editForm.account_type ?? ""} onChange={(event) => setEditForm({ ...editForm, account_type: event.target.value })} />
            <input placeholder="Current status" value={editForm.current_status ?? ""} onChange={(event) => setEditForm({ ...editForm, current_status: event.target.value })} />
            <input placeholder="Freeze amount" type="number" value={editForm.freeze_amount ?? ""} onChange={(event) => setEditForm({ ...editForm, freeze_amount: event.target.value })} />
            <input placeholder="Source" value={editForm.source ?? ""} onChange={(event) => setEditForm({ ...editForm, source: event.target.value })} />
            <input placeholder="Notes" value={editForm.notes ?? ""} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
          </div>
          <div className="form-actions">
            <button className="primary">Save Changes</button>
            <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="records">
        {accounts.map((account) => (
          <article
            className="record draggable-record"
            draggable
            key={account.id}
            onDragStart={() => setDraggedId(account.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(account.id)}
          >
            <div>
              <span className="drag-handle">Drag to reorder</span>
              <strong>{account.account_number}</strong>
              <h2>{account.account_holder_name ?? "Unknown holder"}</h2>
              <p>{account.bank_name ?? "Bank not recorded"} {account.ifsc ? `- ${account.ifsc}` : ""}</p>
            </div>
            <div className="badges">
              <span className="badge">{account.current_status}</span>
              <span className="badge">{account.source ?? "Manual entry"}</span>
              <button className="secondary-button" type="button" onClick={() => startEdit(account)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removeAccount(account)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
