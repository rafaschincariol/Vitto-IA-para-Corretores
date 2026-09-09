import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ScanText,
  Users,
  CalendarClock,
  Sparkles,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { LegalFooter } from "@/components/marketing/legal-footer";
import { siteConfig } from "@/lib/site-config";

const FEATURES = [
  {
    icon: ScanText,
    title: "Cadastro automático por IA",
    description:
      "Envie o PDF ou a foto da apólice. A Vitto lê o documento, identifica o cliente e a apólice e preenche tudo sozinha — você só confere.",
  },
  {
    icon: Users,
    title: "CRM completo da carteira",
    description:
      "Clientes, apólices, prêmios e vencimentos num só lugar, buscável por nome, CPF/CNPJ, e-mail ou telefone.",
  },
  {
    icon: CalendarClock,
    title: "Painel de vencimentos",
    description:
      "Veja o que vence em 30, 60 e 90 dias antes que o cliente esqueça de renovar — e antes que a concorrência ligue primeiro.",
  },
  {
    icon: Sparkles,
    title: "Assistente com IA",
    description:
      "Pergunte em linguagem natural sobre sua carteira ou sobre condições gerais de seguros, e receba resposta com a fonte citada.",
  },
  {
    icon: UsersRound,
    title: "Equipe sem limite de usuários",
    description:
      "Convide corretores pra sua equipe. Cada um vê só os clientes atribuídos a ele; o Admin vê a carteira inteira.",
  },
  {
    icon: ShieldCheck,
    title: "Isolamento de verdade",
    description:
      "Cada corretora só enxerga os próprios dados — isolado no banco, não é uma configuração que pode ser esquecida.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Crie sua conta",
    description: `${siteConfig.trialDays} dias grátis pra testar, sem cartão de crédito.`,
  },
  {
    number: "2",
    title: "Envie as apólices",
    description: "Em lote, PDF ou foto. A IA cadastra cliente e apólice sozinha.",
  },
  {
    number: "3",
    title: "Gerencie e venda mais",
    description: "Vencimentos, equipe e assistente, tudo num painel só.",
  },
];

const PRICING_ITEMS = [
  `${siteConfig.trialDays} dias grátis pra testar, sem cartão`,
  "Equipe sem limite de usuários",
  "Cadastro automático de apólices por IA",
  "Assistente com IA incluso",
  "Cancele quando quiser, direto pelo painel",
];

const FAQ_ITEMS = [
  {
    q: "Preciso saber mexer em sistema pra usar?",
    a: "Não. Se você sabe enviar um PDF por e-mail, sabe usar a Vitto. O cadastro de apólices é automático — você só confere o que a IA extraiu.",
  },
  {
    q: "Meus dados e os dos meus clientes ficam seguros?",
    a: "Sim. Cada corretora só enxerga os próprios dados, isolado no banco de dados — não depende de nenhuma configuração manual. Veja mais na nossa Política de Privacidade.",
  },
  {
    q: "Funciona com qualquer seguradora?",
    a: "Funciona com qualquer apólice em PDF ou foto — a IA lê o documento diretamente, não depende de integração com nenhuma seguradora específica.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, direto pelo painel de assinatura, sem precisar entrar em contato ou justificar.",
  },
  {
    q: "E se eu tiver mais de um corretor na equipe?",
    a: "Sem custo extra. A assinatura é por corretora, não por usuário — convide quantos corretores quiser.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5">
              Software para corretoras de seguros
            </Badge>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Cadastre uma apólice em segundos. Não em vinte minutos.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
              Envie o PDF da apólice e a {siteConfig.name} cadastra o cliente e a
              apólice sozinha, com IA. Sua equipe só confere e segue vendendo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-6 text-base">
                <Link href="/signup">
                  Começar teste grátis de {siteConfig.trialDays} dias
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem cartão de crédito para testar · Cancele quando quiser
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-2xl">
            <HeroMockup />
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Tudo que sua corretora precisa, num painel só
              </h2>
              <p className="mt-3 text-muted-foreground">
                Construído em cima do que consome mais tempo numa corretora: digitar
                apólice e correr atrás de vencimento.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent>
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <feature.icon className="size-4.5" />
                    </div>
                    <h3 className="font-heading text-base font-medium">{feature.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Do zero à carteira organizada em três passos
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number} className="text-center sm:text-left">
                  <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground sm:mx-0">
                    {step.number}
                  </div>
                  <h3 className="mt-4 font-heading text-base font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="preco" className="border-t bg-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Um preço, sem letra miúda
              </h2>
              <p className="mt-3 text-muted-foreground">
                Uma assinatura por corretora libera o acesso pra toda a equipe.
              </p>
            </div>

            <Card className="mx-auto mt-10 max-w-md">
              <CardContent>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-semibold tracking-tight">
                    {siteConfig.price}
                  </span>
                  <span className="text-muted-foreground">{siteConfig.priceInterval}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {PRICING_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" className="mt-7 w-full">
                  <Link href="/signup">
                    Começar agora
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-balance">
              Perguntas frequentes
            </h2>
            <dl className="mt-10 divide-y">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="font-heading font-medium">{item.q}</dt>
                  <dd className="mt-1.5 text-sm text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t py-20 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Pare de digitar apólice
            </h2>
            <p className="mt-3 text-muted-foreground">
              {siteConfig.trialDays} dias grátis, sem cartão de crédito. Cancele quando quiser.
            </p>
            <Button asChild size="lg" className="mt-7 h-11 px-6 text-base">
              <Link href="/signup">
                Começar teste grátis
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
