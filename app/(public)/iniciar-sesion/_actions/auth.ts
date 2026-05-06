"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { publicApiRatelimit, getClientIpFromHeaders } from "@/lib/ratelimit";

/**
 * Server actions de autenticación de cliente.
 *
 * Métodos soportados:
 *   1. Google OAuth (más rápido, recomendado al usuario)
 *   2. Email + password (control total)
 *   3. Magic link (sin password, fricción cero pero requiere check de email)
 *
 * Diseño de identidades:
 *   - Un email = un user en auth.users.
 *   - Si el cliente se registró con password y después usa Google con el
 *     mismo email, Supabase vincula automáticamente las identidades al
 *     mismo user_id. La fila customers se mantiene única.
 *   - Auto-onboarding crea fila en public.customers en el primer login
 *     con cualquier método (lib/auth/customer-auth.ts).
 *
 * Rate limit:
 *   - Login con password: 10 intentos/min por IP (Upstash).
 *   - Signup: 5/min por IP.
 *   - Reset password request: 3/min por IP (anti-abuse).
 */

export type AuthState = {
  ok: boolean;
  message?: string;
};

const PASSWORD_MIN_LENGTH = 10;

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";
}

async function getOriginFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "naturalvita.co";
  return `${proto}://${host}`;
}

// ─── Google OAuth ───────────────────────────────────────────────────────────

/**
 * Genera URL de OAuth Google y redirige al cliente. Después de autenticar
 * en Google, el usuario regresa a /auth/callback que intercambia code por
 * sesión.
 */
export async function signInWithGoogleAction(formData: FormData) {
  const next = formData.get("next")?.toString() ?? "/mi-cuenta";
  const supabase = await createClient();
  const origin = await getOriginFromHeaders();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    console.error("[auth] signInWithGoogleAction:", error);
    redirect(
      `/iniciar-sesion?error=${encodeURIComponent("No pudimos iniciar sesión con Google")}`,
    );
  }

  if (data?.url) {
    redirect(data.url);
  }

  redirect("/iniciar-sesion?error=oauth_no_url");
}

// ─── Email + password (login) ───────────────────────────────────────────────

export async function signInWithPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const next = formData.get("next")?.toString() ?? "/mi-cuenta";

  if (!email || !password) {
    return { ok: false, message: "Ingresa correo y contraseña" };
  }

  // Rate limit por IP (anti brute-force)
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`auth-login:${ip}`);
    if (!success) {
      return {
        ok: false,
        message: "Demasiados intentos. Espera unos minutos.",
      };
    }
  } catch (err) {
    console.warn("[auth] ratelimit no disponible:", err);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico para no revelar si el email existe o no (defensa
    // contra enumeración de cuentas)
    return {
      ok: false,
      message: "Correo o contraseña incorrectos",
    };
  }

  redirect(next);
}

// ─── Email + password (signup) ──────────────────────────────────────────────

export async function signUpWithPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const fullName = formData.get("full_name")?.toString().trim() ?? "";
  const next = formData.get("next")?.toString() ?? "/mi-cuenta";

  if (!email || !password || !fullName) {
    return { ok: false, message: "Completa todos los campos" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    };
  }
  if (fullName.length < 2) {
    return { ok: false, message: "Ingresa tu nombre completo" };
  }

  // Rate limit
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`auth-signup:${ip}`);
    if (!success) {
      return {
        ok: false,
        message: "Demasiadas solicitudes. Intenta en unos minutos.",
      };
    }
  } catch (err) {
    console.warn("[auth] ratelimit no disponible:", err);
  }

  const supabase = await createClient();
  const origin = await getOriginFromHeaders();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    // Caso especial: si el email ya tiene cuenta, Supabase devuelve un
    // mensaje específico que podemos transformar a algo más amigable.
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("user already")
    ) {
      return {
        ok: false,
        message:
          "Este correo ya tiene cuenta. Inicia sesión o recupera tu contraseña.",
      };
    }
    console.error("[auth] signUp error:", error.message);
    return { ok: false, message: "No pudimos crear la cuenta" };
  }

  // Si Supabase tiene "Confirm email" ON (recomendado), data.session será
  // null hasta que el usuario haga click en el email de confirmación.
  if (!data.session) {
    return {
      ok: true,
      message:
        "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja.",
    };
  }

  // Si la sesión se creó inmediatamente (Confirm email OFF), redirigimos
  redirect(next);
}

// ─── Magic link ─────────────────────────────────────────────────────────────

export async function signInWithMagicLinkAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const next = formData.get("next")?.toString() ?? "/mi-cuenta";

  if (!email) return { ok: false, message: "Ingresa tu correo" };

  // Rate limit (más permisivo porque magic link es legítimo)
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`auth-magic:${ip}`);
    if (!success) {
      return {
        ok: false,
        message: "Demasiadas solicitudes. Espera unos minutos.",
      };
    }
  } catch (err) {
    console.warn("[auth] ratelimit no disponible:", err);
  }

  const supabase = await createClient();
  const origin = await getOriginFromHeaders();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // si no existe, crea cuenta automáticamente
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("[auth] magicLink error:", error.message);
    return {
      ok: false,
      message: "No pudimos enviar el enlace. Intenta de nuevo.",
    };
  }

  return {
    ok: true,
    message: "Enviamos un enlace a tu correo. Revisa tu bandeja.",
  };
}

// ─── Recuperar contraseña ───────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!email) return { ok: false, message: "Ingresa tu correo" };

  // Rate limit MÁS estricto en reset (anti-abuse de envío masivo)
  try {
    const ip = await getClientIpFromHeaders();
    const { success } = await publicApiRatelimit.limit(`auth-reset:${ip}`);
    if (!success) {
      return {
        ok: false,
        message: "Demasiadas solicitudes. Espera unos minutos.",
      };
    }
  } catch (err) {
    console.warn("[auth] ratelimit no disponible:", err);
  }

  const supabase = await createClient();
  const origin = await getOriginFromHeaders();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/restablecer-contrasena`,
  });

  // Respondemos con éxito SIEMPRE (no revelamos si el email existe).
  // Si existe, llega correo. Si no, silencio. Esto evita enumeración.
  if (error) {
    console.error("[auth] resetPasswordForEmail error:", error.message);
  }

  return {
    ok: true,
    message:
      "Si el correo existe en nuestro sistema, recibirás un enlace en tu bandeja.",
  };
}

// ─── Restablecer contraseña con token ───────────────────────────────────────

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password")?.toString() ?? "";
  const passwordConfirm = formData.get("password_confirm")?.toString() ?? "";

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    };
  }
  if (password !== passwordConfirm) {
    return { ok: false, message: "Las contraseñas no coinciden" };
  }

  const supabase = await createClient();

  // Aquí la sesión debe existir porque el cliente vino del link del email
  // que ya intercambió code por sesión recovery.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[auth] updateUser error:", error.message);
    return {
      ok: false,
      message:
        "No pudimos cambiar la contraseña. Solicita un nuevo enlace de recuperación.",
    };
  }

  redirect("/mi-cuenta?reset=ok");
}
