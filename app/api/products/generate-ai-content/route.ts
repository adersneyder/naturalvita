import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin-auth";
import {
  generateContentForProduct,
  applyContentToProduct,
} from "@/lib/anthropic/content-generator";
import type { AiContentFields } from "@/lib/ai-content";

export const maxDuration = 60;

type RequestBody =
  | {
      // Modo "generate": llama a la IA, valida, persiste log, devuelve resultado al cliente
      // SIN aplicar al producto. El cliente decide aplicar después con apply_immediately o apply.
      action: "generate";
      product_id: string;
      apply_immediately?: boolean; // Si true y status=success, aplica sin pasar por preview
    }
  | {
      // Modo "apply": el cliente ya revisó la generación previa y quiere aplicarla
      // (posiblemente con ediciones manuales) al producto.
      action: "apply";
      product_id: string;
      fields: AiContentFields;
      template_id: string;
      model: string;
      regulatory_check_passed: boolean;
    };

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!["owner", "admin", "editor"].includes(adminUser.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;
    const supabase = await createClient();

    if (body.action === "generate") {
      if (!body.product_id) {
        return NextResponse.json({ error: "product_id requerido" }, { status: 400 });
      }

      const result = await generateContentForProduct(supabase, body.product_id, adminUser.id);

      // Si el caller pidió aplicar inmediato y la generación fue exitosa, aplicamos
      if (
        body.apply_immediately &&
        result.status === "success" &&
        result.output_parsed
      ) {
        const apply = await applyContentToProduct(supabase, body.product_id, result.output_parsed, {
          template_id: result.template_id,
          model: result.model,
          regulatory_check_passed: true,
        });
        if (!apply.success) {
          return NextResponse.json({
            ...result,
            applied: false,
            apply_error: apply.error,
          });
        }
        return NextResponse.json({ ...result, applied: true });
      }

      return NextResponse.json({ ...result, applied: false });
    }

    if (body.action === "apply") {
      if (!body.product_id || !body.fields) {
        return NextResponse.json({ error: "product_id y fields requeridos" }, { status: 400 });
      }

      const apply = await applyContentToProduct(supabase, body.product_id, body.fields, {
        template_id: body.template_id,
        model: body.model,
        regulatory_check_passed: body.regulatory_check_passed,
      });

      if (!apply.success) {
        return NextResponse.json({ error: apply.error }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[/api/products/generate-ai-content] Error no controlado:", error);
    return NextResponse.json(
      { error: `Falló la generación: ${message}` },
      { status: 500 },
    );
  }
}
