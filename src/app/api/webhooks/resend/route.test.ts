import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyMock = vi.fn();
vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(function () {
    return { verify: verifyMock };
  }),
}));

const insertEventsMock = vi.fn().mockResolvedValue({ error: null });
const upsertSuppressionsMock = vi.fn().mockResolvedValue({ error: null });
const maybeSingleMock = vi.fn();
const supabaseFromMock = vi.fn((table: string) => {
  if (table === "growth_outreach_drafts") {
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) })) })),
    };
  }
  if (table === "growth_outreach_events") {
    return { insert: insertEventsMock };
  }
  if (table === "growth_suppressions") {
    return { upsert: upsertSuppressionsMock };
  }
  throw new Error(`unexpected table ${table}`);
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: supabaseFromMock }) }));

const { POST } = await import("./route");

function makeRequest(body: string) {
  const headers = new Headers({ "svix-id": "id", "svix-timestamp": "1", "svix-signature": "sig" });
  return new Request("http://localhost/api/webhooks/resend", { method: "POST", body, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  maybeSingleMock.mockResolvedValue({ data: { id: "draft_1", lead: { email: "corretor@example.com" } } });
});

describe("POST /api/webhooks/resend", () => {
  it("rejeita quando a assinatura svix não bate", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("ignora tipos de evento que não mapeiam pra um event_type conhecido", async () => {
    verifyMock.mockReturnValue({ type: "email.something_else", data: { email_id: "msg_1" } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("ignora quando nenhum draft casa com o provider_message_id", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    verifyMock.mockReturnValue({ type: "email.delivered", data: { email_id: "msg_desconhecido" } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(insertEventsMock).not.toHaveBeenCalled();
  });

  it("grava evento de entrega sem mexer em supressão", async () => {
    verifyMock.mockReturnValue({ type: "email.delivered", data: { email_id: "msg_1" } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(insertEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({ draft_id: "draft_1", event_type: "delivered" })
    );
    expect(upsertSuppressionsMock).not.toHaveBeenCalled();
  });

  it("suprime o e-mail do lead em bounce", async () => {
    verifyMock.mockReturnValue({ type: "email.bounced", data: { email_id: "msg_1" } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(upsertSuppressionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "email", contact: "corretor@example.com", reason: "bounced" }),
      expect.anything()
    );
  });

  it("suprime o e-mail do lead em complaint", async () => {
    verifyMock.mockReturnValue({ type: "email.complained", data: { email_id: "msg_1" } });
    await POST(makeRequest("{}"));
    expect(upsertSuppressionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "complained" }),
      expect.anything()
    );
  });
});
