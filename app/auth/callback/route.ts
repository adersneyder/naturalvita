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
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/mi-cuenta";

  // Detectar a qué tipo de login redirigir si hay error
  const isAdminFlow = next.startsWith("/admin");
  const loginUrl = isAdminFlow ? "/admin/login" : "/iniciar-sesion";

  if (error) {
    return NextResponse.redirect(
      `${origin}${loginUrl}?error=${encodeURIComponent(errorDescription ?? error)}`,
    );
  }

  if (!code) {
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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}${loginUrl}?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return response;
}
