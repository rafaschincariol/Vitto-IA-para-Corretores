import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const constructEventMock = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({ webhooks: { constructEvent: constructEventMock } }),
}));

const updateEqMock = vi.fn();
const supabaseFromMock = vi.fn(() => ({
  update: vi.fn(() => ({ eq: updateEqMock })),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: supabaseFromMock })),
}));

const logActivityMock = vi.fn();
vi.mock("@/lib/log-activity", () => ({ logActivity: logActivityMock }));

// Import depois dos mocks (hoisted pelo vitest) pra pegar as versões mockadas.
const { POST } = await import("./route");

function makeRequest(body: string, signature: string | null) {
  const headers = new Headers();
  if (signature !== null) headers.set("stripe-signature", signature);
  return new Request("http://localhost/api/webhooks/stripe", { method: "POST", body, headers });
}

function makeSubscriptionEvent(type: string, overrides: Partial<Stripe.Subscription> = {}) {
  return {
    type,
    data: {
      object: {
        id: "sub_123",
        customer: "cus_123",
        status: "active",
        items: { data: [{ current_period_end: 1_700_000_000 }] },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  updateEqMock.mockResolvedValue({ error: null });
});

describe("POST /api/webhooks/stripe", () => {
  it("rejeita requisição sem header de assinatura", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("rejeita quando a assinatura não bate (constructEvent lança)", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const res = await POST(makeRequest("{}", "sig_invalid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Assinatura inválida.");
  });

  it("ignora eventos que não são relevantes pra assinatura", async () => {
    constructEventMock.mockReturnValue(makeSubscriptionEvent("invoice.paid"));
    const res = await POST(makeRequest("{}", "sig_valid"));
    expect(res.status).toBe(200);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("atualiza a assinatura do tenant em evento relevante", async () => {
    constructEventMock.mockReturnValue(makeSubscriptionEvent("customer.subscription.updated"));
    const res = await POST(makeRequest("{}", "sig_valid"));

    expect(res.status).toBe(200);
    expect(supabaseFromMock).toHaveBeenCalledWith("tenant_subscriptions");
    expect(updateEqMock).toHaveBeenCalledWith("stripe_customer_id", "cus_123");
    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it("resolve o customer id quando ele vem como objeto expandido", async () => {
    constructEventMock.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.updated", {
        customer: { id: "cus_expanded" } as unknown as string,
      })
    );
    await POST(makeRequest("{}", "sig_valid"));
    expect(updateEqMock).toHaveBeenCalledWith("stripe_customer_id", "cus_expanded");
  });

  it("loga e retorna 500 quando a atualização no banco falha", async () => {
    constructEventMock.mockReturnValue(makeSubscriptionEvent("customer.subscription.deleted"));
    updateEqMock.mockResolvedValue({ error: { message: "db down" } });

    const res = await POST(makeRequest("{}", "sig_valid"));

    expect(res.status).toBe(500);
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "stripe_webhook_failed", level: "erro" })
    );
  });
});
