"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ScanText, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage, getCitationUrl } from "./chat-actions";
import type { Citation, ChatMessage } from "@/lib/ai/assistant";
import { cn } from "@/lib/utils";

type DisplayMessage = ChatMessage & { citations?: Citation[] };

const SUGGESTIONS = [
  "Quais apólices vencem nos próximos 30 dias?",
  "Qual o prêmio total da minha carteira ativa?",
  "O que geralmente cobre um seguro residencial contra incêndio?",
];

export function AssistantChat({ hasPolicies = true }: { hasPolicies?: boolean }) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  // Chegada vinda do cartão "Pergunte ao Vitto" no Dashboard (?q=...) —
  // dispara a pergunta automaticamente uma única vez ao montar.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function send(question: string) {
    if (!question.trim() || pending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setPending(true);

    try {
      const result = await sendChatMessage(question, history);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, citations: result.citations }]);
    } catch {
      toast.error("Não foi possível falar com o assistente agora.");
    } finally {
      setPending(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  async function openCitation(citation: Citation) {
    if (!citation.documentId) {
      toast.info(`Fonte: ${citation.label} (base geral)`);
      return;
    }
    const url = await getCitationUrl(citation.documentId);
    if (!url) {
      toast.error("Não foi possível abrir a fonte.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-lg border">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !hasPolicies && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <ScanText className="size-8 text-primary" />
            <div className="max-w-sm">
              <p className="font-medium text-foreground">Ainda não tenho dados da sua carteira</p>
              <p className="text-sm">
                Cadastre sua primeira apólice (PDF ou foto) e eu passo a responder com dados reais —
                quem vence, quando e com qual seguradora.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/documents">Enviar apólice agora</Link>
            </Button>
            <p className="text-xs">Ou pergunte algo geral sobre seguros enquanto isso:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.filter((s) => !s.toLowerCase().includes("carteira") && !s.toLowerCase().includes("vencem")).map((s) => (
                <Button key={s} type="button" variant="outline" size="sm" onClick={() => void send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && hasPolicies && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <Sparkles className="size-8" />
            <div>
              <p className="font-medium text-foreground">Pergunte sobre sua carteira ou sobre seguros em geral</p>
              <p className="text-sm">O assistente busca na sua base privada e na base geral de condições.</p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} type="button" variant="outline" size="sm" onClick={() => void send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div key={i} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {message.content}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.citations.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => void openCitation(c)}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Pergunte algo sobre sua carteira..."
          className="min-h-10 resize-none"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
