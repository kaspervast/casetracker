import { FormEvent, useEffect, useState } from "react";
import { createBankAccount, listBankAccounts } from "../api/casegraph";
import type { BankAccountRecord } from "../types/api";

export function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [error, setError] = useState("");

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
          <article className="record" key={account.id}>
            <div>
              <strong>{account.account_number}</strong>
              <h2>{account.account_holder_name ?? "Unknown holder"}</h2>
              <p>{account.bank_name ?? "Bank not recorded"} {account.ifsc ? `- ${account.ifsc}` : ""}</p>
            </div>
            <div className="badges">
              <span className="badge">{account.current_status}</span>
              <span className="badge">{account.source ?? "Manual entry"}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
