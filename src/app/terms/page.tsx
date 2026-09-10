import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { LegalFooter } from "@/components/marketing/legal-footer";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Condições de uso do ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-heading text-lg font-medium">1. O que é o {siteConfig.name}</h2>
            <p className="mt-2 text-muted-foreground">
              O {siteConfig.name} ({siteConfig.fullName}) é um software como
              serviço (SaaS) para gestão de carteira de corretoras de seguros,
              operado por <strong>{siteConfig.legalName}</strong> (CNPJ{" "}
              {siteConfig.cnpj}). Ao
              criar uma conta, você concorda com estes Termos e com a nossa{" "}
              <a href="/privacy" className="underline underline-offset-2">
                Política de Privacidade
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">2. Cadastro e conta</h2>
            <p className="mt-2 text-muted-foreground">
              Ao criar uma conta, você cria uma corretora (tenant) e se torna o
              Admin dela, podendo convidar outros corretores para a mesma
              equipe. Você é responsável por manter suas credenciais em sigilo e
              por toda atividade realizada na sua conta.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">3. Assinatura e cobrança</h2>
            <p className="mt-2 text-muted-foreground">
              A assinatura é mensal, no valor de {siteConfig.price}{" "}
              {siteConfig.priceInterval}, cobrada por corretora (não por
              usuário) e processada pelo Stripe. Novas contas têm{" "}
              {siteConfig.trialDays} dias de teste grátis. Após o período de
              teste, sem uma assinatura ativa, o acesso à ferramenta fica
              bloqueado até a assinatura ser feita. Você pode cancelar a
              qualquer momento pelo painel de assinatura — o cancelamento vale
              até o fim do período já pago, sem reembolso proporcional.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">4. Responsabilidade pelos dados de clientes</h2>
            <p className="mt-2 text-muted-foreground">
              Os dados de clientes finais (nome, CPF/CNPJ, contato, apólices)
              que você insere na plataforma pertencem a terceiros que não têm
              relação direta com o {siteConfig.name}. Você é o controlador
              desses dados perante seus clientes, e é responsável por ter base
              legal para tratá-los (por exemplo, a relação de corretagem já
              existente). O {siteConfig.name} atua como operador,
              processando esses dados apenas para prestar o serviço contratado
              por você.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">5. Extração de dados por IA</h2>
            <p className="mt-2 text-muted-foreground">
              O cadastro automático de apólices usa inteligência artificial
              para ler documentos enviados por você. A extração pode conter
              erros — sempre confira os dados antes de confiar neles para
              decisões de negócio. Registros criados automaticamente ficam
              marcados como pendentes de revisão até você confirmá-los.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">6. Uso aceitável</h2>
            <p className="mt-2 text-muted-foreground">
              Você concorda em não usar a plataforma para fins ilícitos, não
              tentar acessar dados de outra corretora, não fazer engenharia
              reversa do sistema, e não sobrecarregar a infraestrutura de
              forma intencional.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">7. Limitação de responsabilidade</h2>
            <p className="mt-2 text-muted-foreground">
              O {siteConfig.name} é fornecido &quot;como está&quot;. Fazemos o possível
              para manter o serviço disponível e os dados extraídos por IA
              corretos, mas não garantimos disponibilidade ininterrupta nem
              precisão absoluta da extração automática — a conferência final é
              sempre sua.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">8. Alterações nestes termos</h2>
            <p className="mt-2 text-muted-foreground">
              Podemos atualizar estes Termos periodicamente. Mudanças
              relevantes serão comunicadas por e-mail ou dentro do próprio
              produto antes de entrarem em vigor.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">9. Contato</h2>
            <p className="mt-2 text-muted-foreground">
              Dúvidas sobre estes Termos:{" "}
              <a href={`mailto:${siteConfig.supportEmail}`} className="underline underline-offset-2">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
