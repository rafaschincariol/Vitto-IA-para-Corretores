import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { LegalFooter } from "@/components/marketing/legal-footer";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como a ${siteConfig.name} trata dados pessoais, em conformidade com a LGPD.`,
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-heading text-lg font-medium">1. Quem somos</h2>
            <p className="mt-2 text-muted-foreground">
              A {siteConfig.name} ({siteConfig.fullName}) é operada por{" "}
              <strong>[razão social e CNPJ da empresa]</strong>, controladora dos
              dados coletados diretamente do corretor cadastrado e operadora dos
              dados que o corretor insere sobre os clientes dele, conforme a Lei
              Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">2. Quais dados coletamos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                <strong>Dados de cadastro do corretor:</strong> nome, e-mail e senha
                (a senha nunca é armazenada em texto simples — o hash é feito pelo
                nosso provedor de autenticação).
              </li>
              <li>
                <strong>Dados da corretora:</strong> nome da empresa e dados de
                cobrança processados diretamente pelo Stripe (nunca armazenamos
                número de cartão).
              </li>
              <li>
                <strong>Dados de clientes da corretora:</strong> nome, CPF/CNPJ,
                contato e dados de apólices que o corretor insere manualmente, por
                planilha ou por upload de documento. Esses dados pertencem a
                terceiros que não têm relação direta com a {siteConfig.name} — o
                corretor é responsável por ter base legal para tratá-los (ver
                nossos{" "}
                <a href="/terms" className="underline underline-offset-2">
                  Termos de Uso
                </a>
                ).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">3. Para que usamos esses dados</h2>
            <p className="mt-2 text-muted-foreground">
              Exclusivamente para operar o serviço: autenticar o acesso, exibir a
              carteira do corretor, extrair automaticamente dados de apólices
              enviadas por IA, alimentar o assistente com IA e processar a
              cobrança da assinatura. Não vendemos nem compartilhamos dados com
              terceiros para fins de publicidade.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">4. Com quem compartilhamos dados</h2>
            <p className="mt-2 text-muted-foreground">
              Usamos os seguintes operadores para prestar o serviço — todos sob
              contrato, e alguns podem processar dados fora do Brasil:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li><strong>Supabase</strong> — banco de dados e autenticação.</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
              <li><strong>Anthropic (Claude)</strong> — leitura e extração de dados de documentos de apólice enviados, e respostas do assistente.</li>
              <li><strong>Voyage AI</strong> — geração de embeddings para busca do assistente.</li>
              <li><strong>Stripe</strong> — processamento de pagamento da assinatura.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">5. Como protegemos os dados</h2>
            <p className="mt-2 text-muted-foreground">
              Cada corretora só tem acesso aos próprios dados — isolamento
              aplicado no próprio banco de dados (Row Level Security), não numa
              configuração que pode ser desligada por engano. Login tem limite de
              tentativas, e a conexão é sempre criptografada (HTTPS). Detalhes
              técnicos ficam documentados publicamente no repositório do produto.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">6. Cookies e analytics</h2>
            <p className="mt-2 text-muted-foreground">
              Usamos apenas o cookie de sessão necessário para manter o login, e
              métricas de uso do site (páginas visitadas) que não identificam
              você individualmente nem usam cookies de rastreamento.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">7. Seus direitos</h2>
            <p className="mt-2 text-muted-foreground">
              Como titular de dados, você pode solicitar a qualquer momento:
              confirmação de tratamento, acesso, correção, anonimização,
              portabilidade, exclusão dos dados, e informação sobre com quem
              compartilhamos seus dados. Para exercer qualquer um desses
              direitos, escreva para{" "}
              <a href={`mailto:${siteConfig.supportEmail}`} className="underline underline-offset-2">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">8. Retenção e exclusão</h2>
            <p className="mt-2 text-muted-foreground">
              Mantemos os dados enquanto a conta estiver ativa. Ao cancelar a
              assinatura, os dados continuam disponíveis por um período razoável
              para reativação, e são excluídos mediante solicitação do corretor
              ou após encerramento definitivo da conta.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-medium">9. Contato</h2>
            <p className="mt-2 text-muted-foreground">
              Dúvidas sobre esta política ou sobre tratamento de dados:{" "}
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
