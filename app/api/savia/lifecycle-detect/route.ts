/**
 * app/api/savia/lifecycle-detect/route.ts
 *
 * Cron diario de Savia: detecta momentos del ciclo de vida post-compra y
 * enrola en los flows correspondientes.
 *   - repurchase-30d  : ultimo pedido pagado hace 30-37 dias.
 *   - reactivation-60d: ultimo pedido pagado hace 60-74 dias.
 *
 * Auth: Bearer SAVIA_DISPATCH_TOKEN (mismo secreto del resto de Savia).
 *
 * Idempotencia: enrollmentRef = order:{lastOrderId}. El mismo pedido
 * disparador solo enrola una vez por flow, aunque caiga varios dias en su
 * ventana. Las ventanas de repurchase y reactivation son disjuntas (37 < 60),
 * asi que un cliente nunca entra a ambas el mismo dia.
 */

import { NextResponse, type NextRequest } from "next/server";
import { enrollInFlow } from "@/lib/savia/enroll";
import {
  detectLifecycleCandidates,
  type LifecycleKind,
} from "@/lib/savia/lifecycle-detection";
import { resolveUnsubscribeToken } from "@/lib/savia/unsubscribe-token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FLOW_BY_KIND: Record<LifecycleKind, string> = {
  repurchase: "repurchase-30d",
  reactivation: "reactivation-60d",
};

async function runKind(kind: LifecycleKind) {
  const flow = FLOW_BY_KIND[kind];
  const candidates = await detectLifecycleCandidates(kind);

  let enrolled = 0;
  let alreadyEnrolled = 0;
  let suppressed = 0;
  let skipped = 0;

  for (const c of candidates) {
    const unsubscribeToken = await resolveUnsubscribeToken(c.email);
    const result = await enrollInFlow(
      flow,
      { email: c.email, unsubscribeToken, customerName: c.customerName },
      { products: c.products, kind },
      { enrollmentRef: c.refId },
    );
    if (!result.ok) {
      if (result.reason === "suppressed") suppressed++;
      else skipped++;
      continue;
    }
    if (result.enrolled === 0) alreadyEnrolled++;
    else enrolled++;
  }

  return { candidates: candidates.length, enrolled, alreadyEnrolled, suppressed, skipped };
}

export async function POST(request: NextRequest) {
  const token = process.env.SAVIA_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [repurchase, reactivation] = await Promise.all([
    runKind("repurchase"),
    runKind("reactivation"),
  ]);

  return NextResponse.json({ status: "ok", repurchase, reactivation });
}
