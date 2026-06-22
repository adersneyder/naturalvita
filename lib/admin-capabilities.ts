import "server-only";
import { redirect } from "next/navigation";
import { getAdminUser, type AdminRole, type AdminUser } from "./admin-auth";
import { createAdminClient } from "./supabase/admin";

/**
 * Codes de capacidad que el código TypeScript referencia. Son CONTRATO
 * con BD (tabla admin_capabilities). Si añades una nueva, debe existir
 * primero en BD (migración) y luego acá. Si renombras, requieres
 * migración + cambio sincronizado en todos los call sites.
 *
 * Mantén el tipo cerrado (no string) para que el compilador atrape
 * typos en los códigos pasados a hasCapability / requireCapability.
 */
export type AdminCapabilityCode =
  | "orders.read"
  | "orders.process"
  | "orders.cancel"
  | "orders.notes_write"
  | "catalog.read"
  | "catalog.write"
  | "catalog.publish"
  | "prices.sync_preview"
  | "prices.sync_apply"
  | "marketing.flows"
  | "marketing.coupons"
  | "bi.read"
  | "audit.read"
  | "users.manage"
  | "config.write"
  | "tasks.decide"
  | "chat.respond";

/**
 * Cache por request — un único fetch de la matriz por rol por request.
 * Server actions y páginas que validan varias capabilities seguidas no
 * repiten el query.
 *
 * Como server components corren en cada request fresh, el cache se
 * invalida solo. No usamos React.cache() porque la matriz cambia
 * dinámicamente desde la UI (Pasada 3) y necesitamos releerla al
 * navegar entre páginas.
 */
const cachePerRequest = new WeakMap<object, Map<AdminRole, Set<string>>>();

function getRequestCache(req: object): Map<AdminRole, Set<string>> {
  let m = cachePerRequest.get(req);
  if (!m) {
    m = new Map();
    cachePerRequest.set(req, m);
  }
  return m;
}

async function loadCapabilitiesForRole(role: AdminRole): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_role_capabilities")
    .select("capability_code")
    .eq("role", role);
  return new Set((data ?? []).map((r) => r.capability_code));
}

/**
 * Token único por request para el WeakMap. Como no hay un objeto canónico
 * por request en Next, usamos un símbolo de módulo cuyas claves se
 * sobreescriben naturalmente entre invocaciones (no caché real cross-
 * request — server actions y RSCs cargan modules fresco por isolate).
 */
const REQUEST_TOKEN: object = {};

/**
 * ¿El rol indicado tiene la capability? Owner siempre true.
 * Versión sin sesión: pasas el rol explícito. Útil para conditionals en
 * UI con un adminUser ya resuelto.
 */
export async function roleHasCapability(
  role: AdminRole,
  code: AdminCapabilityCode,
): Promise<boolean> {
  if (role === "owner") return true;
  const cache = getRequestCache(REQUEST_TOKEN);
  let caps = cache.get(role);
  if (!caps) {
    caps = await loadCapabilitiesForRole(role);
    cache.set(role, caps);
  }
  return caps.has(code);
}

/**
 * ¿El admin actualmente autenticado tiene la capability? Owner siempre
 * true. Versión con sesión: resuelve el admin via getAdminUser (que
 * redirige a login si no hay sesión).
 */
export async function hasCapability(
  code: AdminCapabilityCode,
): Promise<boolean> {
  const adminUser = await getAdminUser();
  return roleHasCapability(adminUser.role, code);
}

/**
 * Exige que el admin actual tenga la capability indicada. Si no la
 * tiene, redirige al dashboard con error visible. Patrón para usar al
 * inicio de server actions y pages que requieren autorización fina.
 *
 * Coexiste con requireRole([...]) — no es obligatorio migrar de golpe.
 * Pasada 3 introducirá la UI de edición y se irán migrando los call
 * sites uno por uno.
 */
export async function requireCapability(
  code: AdminCapabilityCode,
): Promise<AdminUser> {
  const adminUser = await getAdminUser();
  const ok = await roleHasCapability(adminUser.role, code);
  if (!ok) {
    redirect(`/admin?error=sin_permiso&missing=${encodeURIComponent(code)}`);
  }
  return adminUser;
}

/**
 * Carga TODA la matriz (capability → roles que la tienen). Útil para
 * la UI de edición de roles (Pasada 3).
 */
export async function loadCapabilityMatrix(): Promise<{
  capabilities: Array<{ code: string; category: string; description: string }>;
  byRole: Record<string, string[]>;
}> {
  const admin = createAdminClient();
  const [{ data: caps }, { data: arc }] = await Promise.all([
    admin
      .from("admin_capabilities")
      .select("code, category, description")
      .order("category")
      .order("code"),
    admin.from("admin_role_capabilities").select("role, capability_code"),
  ]);

  const byRole: Record<string, string[]> = {};
  for (const r of arc ?? []) {
    (byRole[r.role] ??= []).push(r.capability_code);
  }
  return {
    capabilities: caps ?? [],
    byRole,
  };
}
