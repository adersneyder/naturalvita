/**
 * Mini parser de user-agent. Devuelve etiquetas de baja cardinalidad
 * (mobile/desktop/tablet, chrome/firefox/safari/edge/other,
 * android/ios/windows/macos/linux/other) en vez del UA literal.
 *
 * Por qué: el UA literal es un identificador con alta entropía (puede
 * ser usado para fingerprinting). Quedarnos con familias mantiene la
 * utilidad analítica sin recolectar PII potencial.
 *
 * Implementación intencionalmente simple — no compite con ua-parser-js
 * en exactitud, pero evita una dependencia más y es suficiente para
 * reportes de "qué dispositivo usa la gente".
 */

export type UAParts = {
  device_type: "mobile" | "tablet" | "desktop";
  browser: "chrome" | "firefox" | "safari" | "edge" | "other";
  os: "android" | "ios" | "windows" | "macos" | "linux" | "other";
};

export function parseUserAgent(ua: string | null): UAParts {
  if (!ua) {
    return { device_type: "desktop", browser: "other", os: "other" };
  }
  const lower = ua.toLowerCase();

  // OS — chequear antes para no confundir Android con Linux.
  let os: UAParts["os"] = "other";
  if (lower.includes("android")) os = "android";
  else if (
    lower.includes("iphone") ||
    lower.includes("ipad") ||
    lower.includes("ipod")
  )
    os = "ios";
  else if (lower.includes("windows")) os = "windows";
  else if (lower.includes("mac os") || lower.includes("macintosh"))
    os = "macos";
  else if (lower.includes("linux")) os = "linux";

  // Device type — tablet antes que mobile (un iPad contiene "mobile" en algunos UAs).
  let device_type: UAParts["device_type"] = "desktop";
  if (lower.includes("ipad") || lower.includes("tablet")) {
    device_type = "tablet";
  } else if (
    lower.includes("mobile") ||
    lower.includes("iphone") ||
    lower.includes("android")
  ) {
    device_type = "mobile";
  }

  // Browser — Edge contiene "Chrome" en su UA, así que se chequea primero.
  let browser: UAParts["browser"] = "other";
  if (lower.includes("edg/")) browser = "edge";
  else if (lower.includes("firefox/")) browser = "firefox";
  else if (lower.includes("chrome/")) browser = "chrome";
  else if (lower.includes("safari/")) browser = "safari";

  return { device_type, browser, os };
}
