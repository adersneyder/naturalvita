import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Auth callback de Supabase para flujos de magic link.
 *
 * Recibe `code` desde el email y lo intercambia por sesión. Después
 * redirige a la ruta `next` que viene en el querystring.
 *
 * El parámetro `next` se establece desde quien inició el login:
 *   - `/admin/login` → next=/admin (o ruta admin específica)
 *   - `/iniciar-sesion` → next=/mi-cuenta (o ruta cliente específica)
 *
 * En caso de error, redirigimos al login que corresponda según `next`:
 *   - Si `next` empieza con `/admin` → /admin/login
 *   - Si `next` empieza con cualquier otra cosa → /iniciar-sesion
 *
 * Default si no hay `next`: /mi-cuenta (cliente, no admin).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Dos flujos soportados:
  //   PKCE  → ?code=...                            (OAuth Google, signup confirmación)
  //   OTP   → ?token_hash=...&type=magiclink|...   (magic link generado por admin)
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "magiclink"
    | "recovery"
    | "invite"
    | "signup"
    | "email_change"
    | "email"
    | null;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/mi-cuenta";

  const isAdminFlow = next.startsWith("/admin");
  // Si el flujo viene de un destino admin, los errores vuelven a /login
  // (entry del equipo). Si es de cliente, vuelven a /iniciar-sesion. Esto
  // mantiene el contexto: un admin no acaba en el form de cliente y
  // viceversa, aunque el callback intermedio sea el mismo.
  const loginUrl = isAdminFlow ? "/login" : "/iniciar-sesion";

  if (error) {
    return NextResponse.redirect(
      `${origin}${loginUrl}?error=${encodeURIComponent(errorDescription ?? error)}`,
    );
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}${loginUrl}?error=no_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Role-routing post-auth: si nadie pidió destino concreto (next default),
  // el equipo va a /admin y los clientes a /mi-cuenta. Mutamos el header
  // Location del response ya creado para conservar las cookies de sesión
  // que Supabase fue seteando en él.
  async function applyRoleRouting() {
    if (next !== "/mi-cuenta") return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (adminUser?.is_active) {
        response.headers.set("Location", `${origin}/admin`);
      }
    } catch {
      /* role-routing es best-effort; el default /mi-cuenta siempre sirve */
    }
  }

  // Flujo OTP (magic link no-PKCE): no requiere code_verifier en cookie, así
  // que funciona aunque el correo se abra en otro navegador/dispositivo.
  if (tokenHash) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: type ?? "magiclink",
      token_hash: tokenHash,
    });
    if (verifyError) {
      return NextResponse.redirect(
        `${origin}${loginUrl}?error=${encodeURIComponent(verifyError.message)}`,
      );
    }
    await applyRoleRouting();
    return response;
  }

  // Flujo PKCE (OAuth, confirmación de signup).
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code!);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}${loginUrl}?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  await applyRoleRouting();
  return response;
}
