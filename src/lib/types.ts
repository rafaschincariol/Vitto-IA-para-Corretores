export type PolicyStatus = "ativo" | "em_renovacao" | "cancelado" | "vencido";

export type DocumentStatus = "manual" | "pending_ai" | "extracted" | "error";

export type UserRole = "owner" | "member";

export type Tenant = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  tenant_id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
};

export type Client = {
  id: string;
  tenant_id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  assigned_to: string | null;
  ai_created: boolean;
  reviewed: boolean;
  created_by: string | null;
  created_at: string;
};

export type Policy = {
  id: string;
  tenant_id: string;
  client_id: string;
  insurer: string;
  policy_number: string;
  policy_type: string | null;
  premium_total: number | null;
  start_date: string;
  end_date: string;
  status: PolicyStatus;
  notes: string | null;
  ai_created: boolean;
  reviewed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PolicyWithClient = Policy & {
  client: Pick<Client, "id" | "name">;
};

export type Document = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  policy_id: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  extracted_data: unknown;
  uploaded_by: string | null;
  created_at: string;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type TenantSubscription = {
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  updated_at: string;
};

export type TenantInvite = {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
};

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  ativo: "Ativo",
  em_renovacao: "Em Renovação",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Admin",
  member: "Corretor",
};
