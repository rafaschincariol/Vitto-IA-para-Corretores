import type { ReactNode } from "react";
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
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { LegalFooter } from "@/components/marketing/legal-footer";
import { siteConfig } from "@/lib/site-config";

const FEATURES: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  visual?: ReactNode;
}[] = [
  {
    icon: Sparkles,
    title: "Assistente de IA para sua carteira",
    description:
      "Pergunte em linguagem natural sobre apólices e condições de seguros, e receba resposta com a fonte citada — sem precisar procurar em PDF nenhum.",
  },
  {
    icon: Users,
    title: "Sua carteira, fora da planilha",
    description:
      "Ache qualquer cliente ou apólice em segundos, por nome, CPF/CNPJ, e-mail ou telefone — sem rolar planilha nem abrir pasta atrás de pasta.",
  },
  {
    icon: CalendarClock,
    title: "Painel de vencimentos",
    description:
      "Veja o que vence em 30, 60 e 90 dias antes que o cliente esqueça de renovar — e antes que a concorrência ligue primeiro.",
  },
  {
    icon: ScanText,
    title: "Cadastro automático por IA",
    description:
      "Envie o PDF ou a foto da apólice. O Vitto lê o documento, identifica o cliente e a apólice e preenche tudo sozinho — você só confere.",
    visual: <HeroMockup />,
  },
  {
    icon: UsersRound,
    title: "Equipe sem limite de usuários",
    description:
      "Convide corretores pra sua equipe. Cada um vê só os clientes atribuídos a ele; o Admin vê a carteira inteira.",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados, só seus",
    description:
      "Nenhuma outra corretora no Vitto acessa seus clientes, suas apólices ou seus números — essa separação é garantida por trás dos panos, não depende de ninguém marcar uma caixinha certa.",
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
    a: "Não. Se você sabe enviar um PDF por e-mail, sabe usar o Vitto. O cadastro de apólices é automático — você só confere o que a IA extraiu.",
  },
  {
    q: "Meus dados e os dos meus clientes ficam seguros?",
    a: "Sim. Cada corretora só enxerga os próprios dados, isolado no banco de dados — não depende de nenhuma configuração manual. Veja mais na nossa Política de Privacidade.",
  },
  {
    q: "Funciona com qualquer seguradora?",
    a: "Funciona com qualquer seguradora, sem exceção. A IA lê o PDF ou a foto da apólice diretamente — o Vitto não empurra cotação nem venda de nenhuma seguradora específica, é só o sistema da sua carteira.",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.fullName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    url: siteConfig.url,
    offers: {
      "@type": "Offer",
      price: siteConfig.price.replace(/[^\d,]/g, "").replace(",", "."),
      priceCurrency: "BRL",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: siteConfig.price.replace(/[^\d,]/g, "").replace(",", "."),
        priceCurrency: "BRL",
        unitText: "MONTH",
      },
    },
  };

  // FAQPage: ajuda o Google a mostrar as perguntas direto no resultado de
  // busca (rich snippet) — mesmo conteúdo do FAQ_ITEMS renderizado abaixo.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="flex min-h-full flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5">
              Sistema com IA para corretora de seguros
            </Badge>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Chega de planilha. Sua carteira de seguros, organizada por uma IA.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
              O {siteConfig.name} lê o PDF ou a foto da apólice e cadastra sozinho —
              você só confere. Também avisa o que vence antes que o cliente esqueça,
              e responde qualquer pergunta sobre sua carteira.
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
            <p className="mt-1.5 text-sm text-muted-foreground">
              Funciona com qualquer seguradora — o Vitto não vende seguro nem tem
              parceria com nenhuma, é só o sistema da sua carteira.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                Empresa registrada no Brasil — CNPJ {siteConfig.cnpj}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                Dados isolados por corretora, conforme a LGPD
              </span>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <BrowserFrame
              src="/marketing/dashboard.png"
              alt="Dashboard do Vitto mostrando apólices ativas, prêmio total, taxa de renovação e o painel de vencimentos da carteira"
              width={1440}
              height={900}
              priority
            />
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Tudo que sua corretora de seguros precisa, num painel só
              </h2>
              <p className="mt-3 text-muted-foreground">
                Construído em cima do que consome mais tempo numa corretora:
                acompanhar a carteira, correr atrás de vencimento e digitar apólice.
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
                    {feature.visual && <div className="mt-4">{feature.visual}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Product tour */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Veja o Vitto cuidando da carteira de verdade
              </h2>
            </div>

            <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                  Toda a sua carteira, buscável em segundos
                </h3>
                <p className="mt-3 text-muted-foreground">
                  Clientes, apólices, prêmios e vencimentos num só lugar — busque por
                  nome, CPF/CNPJ, e-mail ou telefone e encontre o que precisa na
                  hora, sem abrir planilha nenhuma.
                </p>
              </div>
              <BrowserFrame
                src="/marketing/clients.png"
                alt="Tela de clientes do Vitto mostrando a carteira completa de uma corretora, com busca e dados de contato"
                width={1440}
                height={900}
              />
            </div>

            <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <BrowserFrame
                src="/marketing/assistant.png"
                alt="Assistente de IA do Vitto respondendo, com dados reais da carteira, quais apólices vencem nos próximos 30 dias"
                width={1440}
                height={900}
                className="lg:order-2"
              />
              <div className="lg:order-1">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                  Pergunte, não procure
                </h3>
                <p className="mt-3 text-muted-foreground">
                  O assistente de IA responde com dados reais da sua carteira —
                  quem vence, quando e com qual seguradora — e também sobre
                  condições gerais de seguros, sempre citando a fonte.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="py-20 sm:py-24">
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
        <section id="faq" className="py-20 sm:py-24">
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
              Pare de perder vencimento. Pare de digitar apólice.
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
