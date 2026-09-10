import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback do OAuth (Google / LinkedIn) e de confirmação de e-mail: troca o
// "code" da URL por uma sessão e redireciona para dentro do app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");
  const next = explicitNext ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sem "next" explícito, só a confirmação de e-mail de cadastro cai
      // aqui (reset de senha e outros fluxos sempre passam "next") — marca
      // pro dashboard disparar o evento de funil "email_confirmed" uma vez.
      const suffix = explicitNext ? "" : "?welcome=1";
      return NextResponse.redirect(`${origin}${next}${suffix}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
