import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const draftMaybeSingleMock = vi.fn();
const insertEventsMock = vi.fn().mockResolvedValue({ error: null });
const upsertSuppressionsMock = vi.fn().mockResolvedValue({ error: null });
const leadsNotMock = vi.fn();
const draftsLimitMaybeSingleMock = vi.fn();

// query builder encadeável: qualquer sequência de .eq() leva a um objeto que
// ainda oferece .eq()/.maybeSingle()/.order() — os dois pontos de entrada
// (busca por provider_message_id, busca por lead_id+channel+status) usam
// profundidades de encadeamento diferentes.
function makeDraftsQueryChain(): unknown {
  const node: Record<string, unknown> = {
    maybeSingle: draftMaybeSingleMock,
    order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: draftsLimitMaybeSingleMock })) })),
  };
  node.eq = vi.fn(() => makeDraftsQueryChain());
  return node;
}

const supabaseFromMock = vi.fn((table: string) => {
  if (table === "growth_outreach_drafts") {
    return { select: vi.fn(() => makeDraftsQueryChain()) };
  }
  if (table === "growth_outreach_events") return { insert: insertEventsMock };
  if (table === "growth_suppressions") return { upsert: upsertSuppressionsMock };
  if (table === "growth_leads") return { select: vi.fn(() => ({ not: leadsNotMock })) };
  throw new Error(`unexpected table ${table}`);
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: supabaseFromMock }) }));

const { GET, POST } = await import("./route");

function sign(body: string, secret: string) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: string, signature: string | null) {
  const headers = new Headers();
  if (signature !== null) headers.set("x-hub-signature-256", signature);
  return new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.META_APP_SECRET = "app_secret_test";
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify_token_test";
  draftMaybeSingleMock.mockResolvedValue({ data: { id: "draft_1" } });
  leadsNotMock.mockResolvedValue({ data: [] });
});

describe("GET /api/webhooks/whatsapp (handshake)", () => {
  it("ecoa hub.challenge quando o verify_token bate", async () => {
    const url = "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify_token_test&hub.challenge=123";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("123");
  });

  it("rejeita quando o verify_token não bate", async () => {
    const url = "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123";
    const res = await GET(new Request(url));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/webhooks/whatsapp", () => {
  it("rejeita requisição sem assinatura", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("rejeita quando a assinatura não bate", async () => {
    const res = await POST(makeRequest("{}", "sha256=" + "0".repeat(64)));
    expect(res.status).toBe(400);
  });

  it("grava evento de status e ignora quando nenhum draft casa", async () => {
    draftMaybeSingleMock.mockResolvedValue({ data: null });
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid_1", status: "delivered", recipient_id: "5511999999999" }] } }] }],
    });
    const res = await POST(makeRequest(body, sign(body, "app_secret_test")));
    expect(res.status).toBe(200);
    expect(insertEventsMock).not.toHaveBeenCalled();
  });

  it("grava evento delivered quando o draft casa por provider_message_id", async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid_1", status: "delivered", recipient_id: "5511999999999" }] } }] }],
    });
    const res = await POST(makeRequest(body, sign(body, "app_secret_test")));
    expect(res.status).toBe(200);
    expect(insertEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({ draft_id: "draft_1", event_type: "delivered" })
    );
    expect(upsertSuppressionsMock).not.toHaveBeenCalled();
  });

  it("suprime o telefone em status failed", async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid_1", status: "failed", recipient_id: "5511999999999" }] } }] }],
    });
    await POST(makeRequest(body, sign(body, "app_secret_test")));
    expect(upsertSuppressionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "whatsapp", contact: "5511999999999", reason: "failed" }),
      expect.anything()
    );
  });

  it("registra replied casando o telefone normalizado com um lead", async () => {
    leadsNotMock.mockResolvedValue({ data: [{ id: "lead_1", phone: "(11) 99999-9999" }] });
    draftsLimitMaybeSingleMock.mockResolvedValue({ data: { id: "draft_2" } });
    const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "5511999999999" }] } }] }] });
    const res = await POST(makeRequest(body, sign(body, "app_secret_test")));
    expect(res.status).toBe(200);
    expect(insertEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({ draft_id: "draft_2", event_type: "replied" })
    );
  });
});
