export type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  roles: string[];
  permissions: string[];
};

export type CaseRecord = {
  id: string;
  case_number: string;
  police_station?: string | null;
  district?: string | null;
  city?: string | null;
  case_title: string;
  case_type?: string | null;
  case_status: string;
  priority: string;
  short_summary?: string | null;
  confidentiality_level: string;
  created_at: string;
  updated_at: string;
};

export type PersonRecord = {
  id: string;
  full_name: string;
  alias_or_nickname?: string | null;
  father_name?: string | null;
  risk_level: string;
  verification_status: string;
  is_absconding: boolean;
  is_arrested: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  assigned_cases: number;
  total_persons: number;
  total_accused: number;
  total_suspects: number;
  total_complainants: number;
  total_witnesses: number;
  total_mobile_numbers: number;
  total_bank_accounts: number;
  total_evidence_items: number;
  recent_cases: CaseRecord[];
  recent_audit_activity: Array<Record<string, string | null>>;
};

export type GraphNode = {
  id: string;
  label: string;
  type: string;
  data: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: string;
  data: Record<string, unknown>;
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type AuditLog = {
  id: string;
  username?: string | null;
  role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  case_id?: string | null;
  timestamp: string;
  success: boolean;
  failure_reason?: string | null;
};
