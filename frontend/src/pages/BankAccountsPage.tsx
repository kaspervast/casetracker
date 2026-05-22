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

  async function editAccount(account: BankAccountRecord) {
    const accountNumber = window.prompt("Account number", account.account_number);
    if (accountNumber === null) return;
    const holder = window.prompt("Account holder", account.account_holder_name ?? "");
    if (holder === null) return;
    const bank = window.prompt("Bank name", account.bank_name ?? "");
    if (bank === null) return;
    const ifsc = window.prompt("IFSC", account.ifsc ?? "");
    if (ifsc === null) return;
    setError("");
    try {
      await updateBankAccount(account.id, {
        account_number: accountNumber.trim(),
        account_holder_name: holder.trim() || null,
        bank_name: bank.trim() || null,
        ifsc: ifsc.trim().toUpperCase() || null
      });
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
              <button className="secondary-button" type="button" onClick={() => editAccount(account)}>
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
