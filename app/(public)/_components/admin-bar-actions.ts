"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "nv:hide-admin-bar";

/**
 * Toggle de visibilidad de la admin bar en el sitio público.
 *
 * Solo cosmético — esconderla NO desactiva la sesión ni cambia permisos.
 * Útil cuando el equipo necesita tomar capturas del sitio "como cliente"
 * o demostraciones sin la barra superpuesta.
 *
 * La barra vuelve a aparecer en el siguiente login o al ejecutar este
 * action con `hide=false`.
 */
export async function setAdminBarVisibility(hide: boolean) {
  const c = await cookies();
  if (hide) {
    c.set(COOKIE_NAME, "1", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    c.delete(COOKIE_NAME);
  }
  revalidatePath("/");
}

export async function isAdminBarHidden(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value === "1";
}
