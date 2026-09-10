import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers([["origin", "http://localhost:3000"]])),
}));

const logActivityMock = vi.fn();
vi.mock("@/lib/log-activity", () => ({ logActivity: logActivityMock }));

type RpcResponses = Record<string, unknown>;

function makeSupabaseStub(opts: {
  rpc?: RpcResponses;
  signInError?: { message: string } | null;
  signUpError?: { message: string } | null;
  resetError?: { message: string } | null;
  isPlatformAdmin?: boolean;
}) {
  const rpc = vi.fn(async (name: string) => opts.rpc?.[name] ?? { data: null, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.isPlatformAdmin ? { email: "admin@x.com" } : null,
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    rpc,
    from,
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: opts.signInError ?? null }),
      signUp: vi.fn().mockResolvedValue({ error: opts.signUpError ?? null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: opts.resetError ?? null }),
    },
  };
}

let supabaseStub: ReturnType<typeof makeSupabaseStub>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseStub),
}));

const { signInWithPassword, signUpWithPassword, requestPasswordReset } = await import("./actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInWithPassword", () => {
  it("bloqueia e loga quando há excesso de tentativas", async () => {
    supabaseStub = makeSupabaseStub({ rpc: { is_login_rate_limited: { data: true, error: null } } });
    const result = await signInWithPassword(
      { error: null },
      formData({ email: "a@b.com", password: "senha1234" })
    );
    expect(result.error).toBe("Muitas tentativas. Tente novamente em alguns minutos.");
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "login_rate_limited" })
    );
  });

  it("registra falha e retorna erro genérico em senha incorreta", async () => {
    supabaseStub = makeSupabaseStub({
      rpc: { is_login_rate_limited: { data: false, error: null } },
      signInError: { message: "Invalid login credentials" },
    });
    const result = await signInWithPassword(
      { error: null },
      formData({ email: "a@b.com", password: "senhaerrada" })
    );
    expect(result.error).toBe("E-mail ou senha inválidos.");
    expect(supabaseStub.rpc).toHaveBeenCalledWith("record_failed_login", { p_email: "a@b.com" });
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "login_failed" })
    );
  });

  it("redireciona pro /admin quando o e-mail é de platform admin", async () => {
    supabaseStub = makeSupabaseStub({
      rpc: { is_login_rate_limited: { data: false, error: null } },
      isPlatformAdmin: true,
    });
    await expect(
      signInWithPassword({ error: null }, formData({ email: "admin@x.com", password: "senha1234" }))
    ).rejects.toThrow("REDIRECT:/admin");
  });

  it("redireciona pro /dashboard pra usuário comum", async () => {
    supabaseStub = makeSupabaseStub({
      rpc: { is_login_rate_limited: { data: false, error: null } },
      isPlatformAdmin: false,
    });
    await expect(
      signInWithPassword({ error: null }, formData({ email: "user@x.com", password: "senha1234" }))
    ).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("signUpWithPassword", () => {
  const baseFields = {
    email: "novo@x.com",
    password: "senha1234",
    full_name: "Fulano",
    tenant_name: "Corretora X",
    terms_accepted: "on",
  };

  it("rejeita quando os termos não foram aceitos", async () => {
    supabaseStub = makeSupabaseStub({});
    const result = await signUpWithPassword(
      { error: null },
      formData({ ...baseFields, terms_accepted: "" })
    );
    expect(result.error).toContain("Termos de Uso");
  });

  it("identifica e-mail já cadastrado sem tratar como erro de sistema", async () => {
    supabaseStub = makeSupabaseStub({ signUpError: { message: "User already registered" } });
    const result = await signUpWithPassword({ error: null }, formData(baseFields));
    expect(result.error).toBe("Este e-mail já está cadastrado.");
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ category: "usuario", eventType: "signup_failed" })
    );
  });

  it("detecta limite de envio de e-mail atingido e loga de forma clara", async () => {
    supabaseStub = makeSupabaseStub({
      signUpError: { message: "Email rate limit exceeded" },
    });
    const result = await signUpWithPassword({ error: null }, formData(baseFields));
    expect(result.error).toBe("Não foi possível criar a conta.");
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "email_rate_limited", level: "erro" })
    );
  });

  it("redireciona pro login com confirm=1 em cadastro bem-sucedido", async () => {
    supabaseStub = makeSupabaseStub({});
    await expect(signUpWithPassword({ error: null }, formData(baseFields))).rejects.toThrow(
      "REDIRECT:/login?confirm=1"
    );
  });
});

describe("requestPasswordReset", () => {
  it("loga falha real do mailer sem revelar se o e-mail existe (sempre redireciona igual)", async () => {
    supabaseStub = makeSupabaseStub({ resetError: { message: "rate limit exceeded" } });
    await expect(
      requestPasswordReset({ error: null }, formData({ email: "a@b.com" }))
    ).rejects.toThrow("REDIRECT:/login?reset=requested");
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "email_rate_limited" })
    );
  });

  it("não loga nada quando o pedido é processado sem erro", async () => {
    supabaseStub = makeSupabaseStub({ resetError: null });
    await expect(
      requestPasswordReset({ error: null }, formData({ email: "a@b.com" }))
    ).rejects.toThrow("REDIRECT:/login?reset=requested");
    expect(logActivityMock).not.toHaveBeenCalled();
  });
});
