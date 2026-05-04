"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markOrderProcessing,
  markOrderShipped,
  markOrderDelivered,
  cancelOrder,
  markOrderRefunded,
  updateOrderNotes,
} from "../actions";

type Props = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  notes: string | null;
};

export default function OrderActions({
  orderId,
  orderNumber,
  status,
  paymentStatus,
  trackingNumber: initialTracking,
  notes: initialNotes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // UI state para forms
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking ?? "");
  const [carrier, setCarrier] = useState("");

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const [notes, setNotes] = useState(initialNotes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);

  function handleResult(res: { ok: boolean; message?: string; error?: string }) {
    if (res.ok) {
      setFeedback({ type: "ok", text: res.message ?? "Listo" });
      router.refresh();
    } else {
      setFeedback({ type: "error", text: res.error ?? "Error" });
    }
  }

  function runProcessing() {
    setFeedback(null);
    startTransition(async () => {
      handleResult(await markOrderProcessing(orderId));
    });
  }

  function runShip(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await markOrderShipped({
        orderId,
        trackingNumber: trackingNumber.trim() || "",
        carrier: carrier.trim() || "",
      });
      handleResult(res);
      if (res.ok) {
        setShowShipForm(false);
      }
    });
  }

  function runDelivered() {
    setFeedback(null);
    if (!confirm("¿Confirmas que el cliente recibió el pedido?")) return;
    startTransition(async () => {
      handleResult(await markOrderDelivered(orderId));
    });
  }

  function runCancel(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!confirm(`¿Cancelar el pedido ${orderNumber}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await cancelOrder({
        orderId,
        reason: cancelReason.trim() || "",
      });
      handleResult(res);
      if (res.ok) {
        setShowCancelForm(false);
        setCancelReason("");
      }
    });
  }

  function runRefund(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!confirm(`¿Marcar como reembolsado? Asegúrate de haber procesado el reembolso real en el panel de Bold antes.`)) return;
    startTransition(async () => {
      const res = await markOrderRefunded({
        orderId,
        reason: refundReason.trim() || "",
      });
      handleResult(res);
      if (res.ok) {
        setShowRefundForm(false);
        setRefundReason("");
      }
    });
  }

  function saveNotes() {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateOrderNotes({ orderId, notes });
      handleResult(res);
      if (res.ok) setNotesDirty(false);
    });
  }

  // Reglas: qué acciones permitir según el estado actual
  const isFinalized =
    status === "delivered" || status === "cancelled" || status === "refunded";
  const canMarkProcessing = status === "paid";
  const canMarkShipped = status === "paid" || status === "processing";
  const canMarkDelivered = status === "shipped";
  const canCancel = !isFinalized;
  const canRefund = paymentStatus === "paid" && status !== "refunded";

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            feedback.type === "ok"
              ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
              : "bg-[#FBE7E2] text-[#9A2A1F]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Acciones primarias según flujo */}
      <div className="space-y-2">
        {canMarkProcessing && (
          <button
            type="button"
            onClick={runProcessing}
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-leaf-700)] text-white text-sm font-medium hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
          >
            Marcar en preparación
          </button>
        )}

        {canMarkShipped && !showShipForm && (
          <button
            type="button"
            onClick={() => setShowShipForm(true)}
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
          >
            Marcar como enviado
          </button>
        )}

        {showShipForm && (
          <form
            onSubmit={runShip}
            className="p-3 rounded-lg bg-[#F8F6FC] border border-[var(--color-iris-700)]/30 space-y-2"
          >
            <p className="text-xs text-[var(--color-leaf-900)] font-medium">
              Enviar pedido
            </p>
            <p className="text-[11px] text-[var(--color-earth-700)]">
              Enviaremos un correo al cliente avisándole que su pedido va en
              camino.
            </p>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de guía (opcional)"
              maxLength={100}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm focus:border-[var(--color-iris-700)] focus:outline-none"
            />
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Transportadora (ej: Servientrega)"
              maxLength={60}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm focus:border-[var(--color-iris-700)] focus:outline-none"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-iris-700)] text-white text-xs font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
              >
                {isPending ? "Enviando…" : "Confirmar envío"}
              </button>
              <button
                type="button"
                onClick={() => setShowShipForm(false)}
                className="text-xs text-[var(--color-earth-700)] hover:underline"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {canMarkDelivered && (
          <button
            type="button"
            onClick={runDelivered}
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-leaf-700)] text-white text-sm font-medium hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
          >
            Marcar como entregado
          </button>
        )}
      </div>

      {/* Separador para acciones destructivas */}
      {(canCancel || canRefund) && (
        <div className="pt-3 border-t border-[var(--color-earth-100)] space-y-2">
          {canRefund && !showRefundForm && (
            <button
              type="button"
              onClick={() => setShowRefundForm(true)}
              disabled={isPending}
              className="w-full px-4 py-2 rounded-lg bg-white border border-[var(--color-earth-100)] text-sm text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] disabled:opacity-50"
            >
              Marcar como reembolsado
            </button>
          )}

          {showRefundForm && (
            <form
              onSubmit={runRefund}
              className="p-3 rounded-lg bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] space-y-2"
            >
              <p className="text-xs text-[var(--color-leaf-900)] font-medium">
                Marcar reembolso
              </p>
              <p className="text-[11px] text-[var(--color-earth-700)]">
                Procesa primero el reembolso real desde el panel de Bold. Esta
                acción solo registra el reembolso en el sistema.
              </p>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Motivo del reembolso (opcional, queda en notas)"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm focus:border-[var(--color-iris-700)] focus:outline-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-leaf-700)] text-white text-xs font-medium hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Confirmar reembolso"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefundForm(false)}
                  className="text-xs text-[var(--color-earth-700)] hover:underline"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {canCancel && !showCancelForm && (
            <button
              type="button"
              onClick={() => setShowCancelForm(true)}
              disabled={isPending}
              className="w-full px-4 py-2 rounded-lg bg-white border border-[var(--color-earth-100)] text-sm text-[#9A2A1F] hover:bg-[#FBE7E2] disabled:opacity-50"
            >
              Cancelar pedido
            </button>
          )}

          {showCancelForm && (
            <form
              onSubmit={runCancel}
              className="p-3 rounded-lg bg-[#FBE7E2]/40 border border-[#9A2A1F]/20 space-y-2"
            >
              <p className="text-xs text-[#9A2A1F] font-medium">
                Cancelar pedido
              </p>
              <p className="text-[11px] text-[var(--color-earth-700)]">
                Si el pedido ya fue pagado, el reembolso no es automático —
                debes procesarlo desde el panel de Bold.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo de la cancelación (opcional, queda en notas)"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm focus:border-[#9A2A1F] focus:outline-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-[#9A2A1F] text-white text-xs font-medium hover:bg-[#7d2218] disabled:opacity-50"
                >
                  {isPending ? "Cancelando…" : "Confirmar cancelación"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelForm(false)}
                  className="text-xs text-[var(--color-earth-700)] hover:underline"
                >
                  Volver
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Notas internas */}
      <div className="pt-3 border-t border-[var(--color-earth-100)]">
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-[var(--color-earth-700)] font-medium mb-1.5">
            Notas internas
          </span>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
            placeholder="Notas privadas del equipo (no visibles al cliente)"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-100)] bg-white text-sm focus:border-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/15"
          />
        </label>
        {notesDirty && (
          <button
            type="button"
            onClick={saveNotes}
            disabled={isPending}
            className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-leaf-700)] text-white text-xs font-medium hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar notas"}
          </button>
        )}
      </div>
    </div>
  );
}
