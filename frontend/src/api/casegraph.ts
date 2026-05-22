import { api } from "./client";
import type {
  AuditLog,
  BankAccountRecord,
  CaseRecord,
  CurrentUser,
  DashboardSummary,
  GraphResponse,
  MobileNumberRecord,
  PersonRecord
} from "../types/api";

export function login(username: string, password: string) {
  return api<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function me() {
  return api<CurrentUser>("/auth/me");
}

export function dashboard() {
  return api<DashboardSummary>("/dashboard");
}

export function listCases() {
  return api<CaseRecord[]>("/cases");
}

export function createCase(payload: Partial<CaseRecord>) {
  return api<CaseRecord>("/cases", { method: "POST", body: JSON.stringify(payload) });
}

export function updateCase(caseId: string, payload: Partial<CaseRecord>) {
  return api<CaseRecord>(`/cases/${caseId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteCase(caseId: string, deleteReason: string) {
  return api<{ ok: boolean }>(`/cases/${caseId}`, {
    method: "DELETE",
    body: JSON.stringify({ delete_reason: deleteReason })
  });
}

export function listPersons() {
  return api<PersonRecord[]>("/persons");
}

export function createPerson(payload: Record<string, unknown>) {
  return api<PersonRecord>("/persons", { method: "POST", body: JSON.stringify(payload) });
}

export function updatePerson(personId: string, payload: Record<string, unknown>) {
  return api<PersonRecord>(`/persons/${personId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deletePerson(personId: string, deleteReason: string) {
  return api<{ ok: boolean }>(`/persons/${personId}`, {
    method: "DELETE",
    body: JSON.stringify({ delete_reason: deleteReason })
  });
}

export function listMobileNumbers() {
  return api<MobileNumberRecord[]>("/mobile-numbers");
}

export function createMobileNumber(payload: Record<string, unknown>) {
  return api<MobileNumberRecord>("/mobile-numbers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateMobileNumber(mobileId: string, payload: Record<string, unknown>) {
  return api<MobileNumberRecord>(`/mobile-numbers/${mobileId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteMobileNumber(mobileId: string, deleteReason: string) {
  return api<{ ok: boolean }>(`/mobile-numbers/${mobileId}`, {
    method: "DELETE",
    body: JSON.stringify({ delete_reason: deleteReason })
  });
}

export function listBankAccounts() {
  return api<BankAccountRecord[]>("/bank-accounts");
}

export function createBankAccount(payload: Record<string, unknown>) {
  return api<BankAccountRecord>("/bank-accounts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateBankAccount(accountId: string, payload: Record<string, unknown>) {
  return api<BankAccountRecord>(`/bank-accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteBankAccount(accountId: string, deleteReason: string) {
  return api<{ ok: boolean }>(`/bank-accounts/${accountId}`, {
    method: "DELETE",
    body: JSON.stringify({ delete_reason: deleteReason })
  });
}

export function caseGraph(caseId: string) {
  return api<GraphResponse>(`/graph/case/${caseId}`);
}

export function auditLogs() {
  return api<AuditLog[]>("/audit-logs");
}
