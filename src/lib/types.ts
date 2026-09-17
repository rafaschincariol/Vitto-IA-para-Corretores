export type PolicyStatus = "ativo" | "em_renovacao" | "cancelado" | "vencido";

export type DocumentStatus = "manual" | "pending_ai" | "extracted" | "error";

export type UserRole = "owner" | "member";

export type Tenant = {
  id: string;
  name: string;
  created_at: string;
  pending_deletion_at: string | null;
  onboarding_asked_assistant: boolean;
  onboarding_dismissed: boolean;
  first_policy_event_sent: boolean;
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
  renewal_contact_marked_at: string | null;
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
  paid_conversion_tracked: boolean;
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

export type PipelineStage = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
};

export type Prospect = {
  id: string;
  tenant_id: string;
  stage_id: string;
  client_id: string | null;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  estimated_value: number | null;
  insurance_type: string | null;
  notes: string | null;
  lost_reason: string | null;
  position: number;
  assigned_to: string | null;
  created_by: string | null;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
};

export type ProspectWithStage = Prospect & {
  stage: Pick<PipelineStage, "id" | "name" | "is_won" | "is_lost">;
};

export type ProspectStageHistoryEntry = {
  id: string;
  tenant_id: string;
  prospect_id: string;
  from_stage_id: string | null;
  from_stage_name: string | null;
  to_stage_id: string | null;
  to_stage_name: string;
  changed_by: string | null;
  changed_at: string;
};

export type SucessaoSimulacao = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name: string;
  assets: import("./sucessao/types").Asset[];
  marital_regime: import("./sucessao/types").MaritalRegime;
  existing_protection: number;
  monthly_maintenance: number;
  custom_duration_months: number;
  scenario: "min" | "max";
  notes: string | null;
  result: import("./sucessao/types").SimulationResult;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProtecaoInssSimulacao = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name: string;
  contribution_salary: number;
  dependents_count: number;
  family_monthly_income: number;
  dependency_years: number;
  notes: string | null;
  result: import("./protecao-inss/types").InssGapResult;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VidaSimulacao = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name: string;
  monthly_income: number;
  dependency_years: number;
  debts: import("./vida/types").Debt[];
  children: import("./vida/types").Child[];
  current_investments: number;
  monthly_contribution: number;
  existing_insurance: number;
  real_return_rate: number;
  final_costs: number;
  notes: string | null;
  result: import("./vida/types").VidaResult;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
