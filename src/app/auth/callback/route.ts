import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback do OAuth (Google / LinkedIn) e de confirmação de e-mail: troca o
// "code" da URL por uma sessão e redireciona para dentro do app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
