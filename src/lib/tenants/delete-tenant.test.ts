import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scheduleTenantDeletion, purgeTenant } from "./delete-tenant";

const cancelMock = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({ subscriptions: { cancel: cancelMock } }),
}));

const createAdminClientMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClientMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeScheduleSupabaseStub(opts: {
  subscriptionId: string | null;
  rpcError?: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.subscriptionId ? { stripe_subscription_id: opts.subscriptionId } : null,
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn().mockResolvedValue({ error: opts.rpcError ?? null });
  return { from, rpc } as unknown as SupabaseClient;
}

describe("scheduleTenantDeletion", () => {
  it("cancela a assinatura no Stripe quando o tenant tem uma ativa", async () => {
    const supabase = makeScheduleSupabaseStub({ subscriptionId: "sub_123" });
    await scheduleTenantDeletion(supabase, "tenant-1", "schedule_own_tenant_deletion");
    expect(cancelMock).toHaveBeenCalledWith("sub_123");
  });

  it("não chama o Stripe quando o tenant não tem assinatura", async () => {
    const supabase = makeScheduleSupabaseStub({ subscriptionId: null });
    await scheduleTenantDeletion(supabase, "tenant-1", "schedule_own_tenant_deletion");
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("segue com o agendamento mesmo se o cancelamento no Stripe falhar", async () => {
    cancelMock.mockRejectedValueOnce(new Error("stripe indisponível"));
    const supabase = makeScheduleSupabaseStub({ subscriptionId: "sub_123" });
    await expect(
      scheduleTenantDeletion(supabase, "tenant-1", "schedule_own_tenant_deletion")
    ).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith("schedule_own_tenant_deletion", { p_tenant_id: "tenant-1" });
  });

  it("lança erro quando o RPC de agendamento falha", async () => {
    const supabase = makeScheduleSupabaseStub({
      subscriptionId: null,
      rpcError: { message: "boom" },
    });
    await expect(
      scheduleTenantDeletion(supabase, "tenant-1", "admin_schedule_tenant_deletion")
    ).rejects.toThrow("schedule_deletion_failed");
  });
});

function makeAdminStub(opts: { members: { id: string }[]; deleteTenantError?: { message: string } | null }) {
  const membersEq = vi.fn().mockResolvedValue({ data: opts.members, error: null });
  const membersSelect = vi.fn(() => ({ eq: membersEq }));
  const tenantsEq = vi.fn().mockResolvedValue({ error: opts.deleteTenantError ?? null });
  const tenantsDelete = vi.fn(() => ({ eq: tenantsEq }));
  const from = vi.fn((table: string) => {
    if (table === "profiles") return { select: membersSelect };
    if (table === "tenants") return { delete: tenantsDelete };
    throw new Error(`tabela inesperada no teste: ${table}`);
  });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  return { from, auth: { admin: { deleteUser } } };
}

describe("purgeTenant", () => {
  it("apaga o tenant e a conta de cada membro", async () => {
    const admin = makeAdminStub({ members: [{ id: "user-1" }, { id: "user-2" }] });
    createAdminClientMock.mockReturnValue(admin);

    await purgeTenant("tenant-1");

    expect(admin.from).toHaveBeenCalledWith("tenants");
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("user-2");
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledTimes(2);
  });

  it("lança erro e não tenta apagar usuários se a exclusão do tenant falhar", async () => {
    const admin = makeAdminStub({
      members: [{ id: "user-1" }],
      deleteTenantError: { message: "fk violation" },
    });
    createAdminClientMock.mockReturnValue(admin);

    await expect(purgeTenant("tenant-1")).rejects.toThrow("purge_tenant_failed");
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
