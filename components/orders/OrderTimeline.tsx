import type { TimelineStage } from "@/lib/checkout/customer-orders";

/**
 * Timeline visual del pedido. Renderiza las cuatro etapas
 * (placed → paid → shipped → delivered) con un punto coloreado por
 * estado y la fecha alineada.
 *
 * Estados visuales:
 *   - done: punto leaf relleno + línea conectora leaf
 *   - current: punto iris pulse
 *   - pending: punto earth-100 vacío + línea earth-100
 *   - skipped: punto tachado (cuando hubo cancelación o reembolso)
 */
export function OrderTimeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <ol className="relative">
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const dotClass = dotClassFor(stage.state);
        const lineClass = lineClassFor(stage.state, stages[idx + 1]?.state);
        return (
          <li key={stage.key} className="relative pl-9 pb-6 last:pb-0">
            {/* Línea vertical conectora */}
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-5 w-px h-full ${lineClass}`}
              />
            )}
            {/* Punto */}
            <span
              aria-hidden
              className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full ${dotClass}`}
            />
            <p
              className={`text-[13px] font-medium ${
                stage.state === "skipped"
                  ? "text-[var(--color-earth-500)] line-through"
                  : "text-[var(--color-leaf-900)]"
              }`}
            >
              {stage.label}
            </p>
            <p className="text-[12px] text-[var(--color-earth-700)] mt-0.5">
              {stage.description}
            </p>
            {stage.date && stage.state !== "pending" && (
              <p className="text-[11px] text-[var(--color-earth-500)] mt-1 tabular-nums">
                {formatDateLong(stage.date)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function dotClassFor(state: TimelineStage["state"]): string {
  switch (state) {
    case "done":
      return "bg-[var(--color-leaf-700)] ring-4 ring-[var(--color-leaf-100)]";
    case "current":
      return "bg-[var(--color-iris-700)] ring-4 ring-[#E6E2F5] animate-pulse";
    case "skipped":
      return "bg-[var(--color-earth-100)] ring-1 ring-[var(--color-earth-500)] ring-inset";
    default:
      return "bg-white border border-[var(--color-earth-100)] ring-2 ring-white";
  }
}

function lineClassFor(
  current: TimelineStage["state"],
  next: TimelineStage["state"] | undefined,
): string {
  if (current === "done" && (next === "done" || next === "current")) {
    return "bg-[var(--color-leaf-700)]";
  }
  return "bg-[var(--color-earth-100)]";
}

function formatDateLong(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
