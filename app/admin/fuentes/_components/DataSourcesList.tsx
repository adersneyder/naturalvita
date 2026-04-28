"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createDataSource, toggleDataSource, testDataSourceConnection } from "../actions";

export type DataSourceRow = {
  id: string;
  name: string;
  type: string;
  base_url: string | null;
  catalog_url: string | null;
  scraper_strategy: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_products_found: number | null;
  laboratory_name: string;
  laboratory_slug: string;
  product_count: number;
  running_job: { id: string; status: string; last_offset: number } | null;
};

type SyncState =
  | { mode: "idle" }
  | { mode: "starting"; sourceId: string }
  | {
      mode: "running";
      sourceId: string;
      jobId: string;
      processed: number;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
      total: number | null;
      lastBatchErrors: Array<{ name: string; error: string }>;
      isResumed?: boolean;
    }
  | {
      mode: "completed";
      sourceId: string;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    }
  | {
      mode: "redownloading";
      sourceId: string;
      page: number;
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
      lastBatchErrors: Array<{ name: string; error: string }>;
    }
  | {
      mode: "redownloaded";
      sourceId: string;
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
    }
  | { mode: "error"; sourceId: string; message: string };

const TIME_BETWEEN_BATCHES_MS = 200;

export default function DataSourcesList({
  sources,
  canManage,
}: {
  sources: DataSourceRow[];
  canManage: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [sync, setSync] = useState<SyncState>({ mode: "idle" });
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Si cargamos la página y hay un job ya corriendo en otra pestaña o sesión, retomarlo automáticamente.
  // CRÍTICO: además de mostrar el modal, hay que arrancar el processLoop, sino la UI queda estática.
  useEffect(() => {
    const orphan = sources.find((s) => s.running_job);
    if (orphan && orphan.running_job && sync.mode === "idle") {
      const jobId = orphan.running_job.id;
      setSync({
        mode: "running",
        sourceId: orphan.id,
        jobId,
        processed: orphan.running_job.last_offset,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: null,
        lastBatchErrors: [],
        isResumed: true,
      });
      cancelledRef.current = false;
      abortRef.current = new AbortController();
      processLoop(jobId, orphan.id).catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          setSync({
            mode: "error",
            sourceId: orphan.id,
            message: "Sincronización cancelada por el usuario",
          });
          return;
        }
        setSync({
          mode: "error",
          sourceId: orphan.id,
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSync(source: DataSourceRow) {
    if (source.type === "csv_import") {
      setSync({
        mode: "error",
        sourceId: source.id,
        message: "Esta fuente requiere importación CSV (próximo hito)",
      });
      return;
    }

    setSync({ mode: "starting", sourceId: source.id });
    cancelledRef.current = false;
    abortRef.current = new AbortController();

    try {
      const startResp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          data_source_id: source.id,
        }),
        signal: abortRef.current.signal,
      });

      const startData = await startResp.json();

      if (!startResp.ok) {
        setSync({ mode: "error", sourceId: source.id, message: startData.error ?? "Error iniciando" });
        return;
      }

      const jobId = startData.job_id as string;
      const total = startData.estimated_total as number | null;

      setSync({
        mode: "running",
        sourceId: source.id,
        jobId,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total,
        lastBatchErrors: [],
      });

      // Loop de lotes
      await processLoop(jobId, source.id);
    } catch (error) {
      // Si fue aborto explícito del usuario, cancelar el job en backend y mostrar mensaje neutral
      if (error instanceof Error && error.name === "AbortError") {
        setSync({
          mode: "error",
          sourceId: source.id,
          message: "Sincronización cancelada por el usuario",
        });
        return;
      }
      setSync({
        mode: "error",
        sourceId: source.id,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      abortRef.current = null;
    }
  }

  async function processLoop(jobId: string, sourceId: string) {
    while (true) {
      if (cancelledRef.current) {
        // Best-effort: avisar al backend que cancele el job. No bloqueamos en este fetch.
        try {
          await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", job_id: jobId }),
          });
        } catch {
          // ignorar; el front ya decidió cancelar
        }
        setSync({
          mode: "error",
          sourceId,
          message: "Sincronización cancelada por el usuario",
        });
        return;
      }

      const resp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", job_id: jobId }),
        signal: abortRef.current?.signal,
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        setSync({
          mode: "error",
          sourceId,
          message: data.error ?? "Error procesando lote",
        });
        return;
      }

      setSync((prev) => {
        if (prev.mode !== "running" || prev.jobId !== jobId) return prev;
        return {
          ...prev,
          processed: data.progress.total_processed,
          created: data.totals.created,
          updated: data.totals.updated,
          skipped: data.totals.skipped,
          failed: data.totals.failed,
          lastBatchErrors: data.batch.errors ?? [],
        };
      });

      if (data.status === "completed") {
        setSync({
          mode: "completed",
          sourceId,
          created: data.totals.created,
          updated: data.totals.updated,
          skipped: data.totals.skipped,
          failed: data.totals.failed,
        });
        return;
      }

      // Pausa pequeña entre lotes para no saturar el lab
      await new Promise((r) => setTimeout(r, TIME_BETWEEN_BATCHES_MS));
    }
  }

  async function cancelSync() {
    cancelledRef.current = true;
    // Aborta el fetch en vuelo si lo hay; el catch en startSync/redownloadImages mostrará el mensaje
    abortRef.current?.abort();

    // Caso "orphan": el modal está montado pero no hay loop activo (la página se recargó
    // mientras un job seguía marcado como running en BD). Cancelar el job y cerrar el modal.
    const isOrphan =
      (sync.mode === "running" && !abortRef.current) ||
      (sync.mode === "redownloading" && !abortRef.current);

    if (isOrphan && sync.mode === "running" && sync.jobId) {
      try {
        await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel", job_id: sync.jobId }),
        });
      } catch {
        // ignorar; el front igual cierra el modal
      }
      setSync({ mode: "idle" });
    } else if (isOrphan) {
      // Re-descarga huérfana: simplemente cerrar el modal (no hay job persistido para re-descarga)
      setSync({ mode: "idle" });
    }
  }

  async function redownloadImages(source: DataSourceRow) {
    if (source.type !== "scraper") return;
    if (
      !confirm(
        `Re-descargar imágenes faltantes de "${source.laboratory_name}"?\n\nEsto recorrerá el catálogo completo y solo descargará imágenes para productos que no las tengan. Puede tardar varios minutos.`,
      )
    ) {
      return;
    }

    cancelledRef.current = false;
    abortRef.current = new AbortController();
    setSync({
      mode: "redownloading",
      sourceId: source.id,
      page: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      lastBatchErrors: [],
    });

    let page = 1;
    let totals = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

    try {
      while (true) {
        if (cancelledRef.current) {
          setSync({
            mode: "error",
            sourceId: source.id,
            message: "Re-descarga cancelada",
          });
          return;
        }

        const resp = await fetch("/api/products/redownload-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data_source_id: source.id,
            page,
            only_missing: true,
          }),
          signal: abortRef.current.signal,
        });
        const data = await resp.json();

        if (!resp.ok || data.error) {
          setSync({
            mode: "error",
            sourceId: source.id,
            message: data.error ?? "Error procesando lote",
          });
          return;
        }

        totals = {
          processed: totals.processed + data.batch.processed,
          succeeded: totals.succeeded + data.batch.succeeded,
          failed: totals.failed + data.batch.failed,
          skipped: totals.skipped + data.batch.skipped,
        };

        setSync({
          mode: "redownloading",
          sourceId: source.id,
          page,
          processed: totals.processed,
          succeeded: totals.succeeded,
          failed: totals.failed,
          skipped: totals.skipped,
          lastBatchErrors: data.batch.errors ?? [],
        });

        if (!data.has_more) {
          setSync({
            mode: "redownloaded",
            sourceId: source.id,
            processed: totals.processed,
            succeeded: totals.succeeded,
            failed: totals.failed,
            skipped: totals.skipped,
          });
          return;
        }

        page++;
        await new Promise((r) => setTimeout(r, TIME_BETWEEN_BATCHES_MS));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setSync({
          mode: "error",
          sourceId: source.id,
          message: "Re-descarga cancelada por el usuario",
        });
        return;
      }
      setSync({
        mode: "error",
        sourceId: source.id,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      abortRef.current = null;
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDataSource(formData);
      if (!result.success) {
        setCreateError(result.error ?? "Error desconocido");
        return;
      }
      setShowCreateModal(false);
    });
  }

  function handleToggle(id: string, currentlyActive: boolean) {
    startTransition(async () => {
      await toggleDataSource(id, !currentlyActive);
    });
  }

  async function handleTest(id: string) {
    setSync({ mode: "starting", sourceId: id });
    const result = await testDataSourceConnection(id);
    if (result.success) {
      const data = result.data as { message: string; total_products?: number };
      setSync({
        mode: "completed",
        sourceId: id,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      });
      alert(`Conexión OK · ${data.message}`);
    } else {
      setSync({
        mode: "error",
        sourceId: id,
        message: result.error ?? "Error desconocido",
      });
    }
  }

  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Fuentes de datos
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
            {sources.length} fuente{sources.length === 1 ? "" : "s"} · sincroniza productos de cada
            laboratorio
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="bg-[var(--color-leaf-700)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-leaf-900)] transition-colors"
          >
            + Agregar fuente
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_140px] gap-3 px-5 py-3 bg-[var(--color-earth-50)] text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)]">
          <span>Laboratorio</span>
          <span>Tipo</span>
          <span>Última sincronización</span>
          <span></span>
        </div>

        {sources.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-earth-700)]">
            No hay fuentes configuradas aún.
          </div>
        ) : (
          sources.map((source) => {
            const isThisSyncing =
              sync.mode === "running" && sync.sourceId === source.id;
            const isThisStarting =
              sync.mode === "starting" && sync.sourceId === source.id;
            const isThisRedownloading =
              sync.mode === "redownloading" && sync.sourceId === source.id;
            const isAnyOtherRunning =
              (sync.mode === "running" ||
                sync.mode === "starting" ||
                sync.mode === "redownloading") &&
              sync.sourceId !== source.id;

            return (
              <div
                key={source.id}
                className="grid grid-cols-[1fr_120px_140px_140px] gap-3 px-5 py-4 items-center border-b border-[#F0E9DB] last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
                      {source.laboratory_name}
                    </p>
                    {!source.is_active && (
                      <span className="text-[10px] font-medium bg-[#F0E9DB] text-[var(--color-earth-700)] px-2 py-0.5 rounded-full">
                        inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-earth-500)] m-0 font-mono">
                    {source.catalog_url ?? source.base_url ?? "sin URL"}
                  </p>
                  <p className="text-[11px] text-[var(--color-earth-700)] mt-1 m-0">
                    {source.product_count} producto{source.product_count === 1 ? "" : "s"} en BD
                  </p>
                </div>
                <div>
                  {source.type === "scraper" ? (
                    <span className="text-[10px] font-medium bg-[#EEEDFE] text-[#26215C] px-2 py-1 rounded-md uppercase">
                      {source.scraper_strategy}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B] px-2 py-1 rounded-md uppercase">
                      CSV
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--color-earth-700)]">
                  {source.last_run_at ? (
                    <>
                      <p className="m-0">{formatRelative(source.last_run_at)}</p>
                      <p className="text-[10px] text-[var(--color-earth-500)] m-0">
                        {source.last_run_products_found} traídos
                      </p>
                    </>
                  ) : (
                    <span className="text-[var(--color-earth-500)] italic">nunca</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {source.type === "scraper" && (
                    <>
                      <button
                        onClick={() => startSync(source)}
                        disabled={
                          !source.is_active ||
                          isThisStarting ||
                          isThisSyncing ||
                          isThisRedownloading ||
                          isAnyOtherRunning
                        }
                        className="text-xs font-medium text-white bg-[var(--color-leaf-700)] hover:bg-[var(--color-leaf-900)] px-3 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed w-full"
                      >
                        {isThisStarting
                          ? "Iniciando..."
                          : isThisSyncing
                            ? "En curso..."
                            : "Sincronizar"}
                      </button>
                      <button
                        onClick={() => handleTest(source.id)}
                        disabled={
                          !source.is_active ||
                          isThisStarting ||
                          isThisSyncing ||
                          isThisRedownloading ||
                          isAnyOtherRunning
                        }
                        className="text-[11px] text-[var(--color-leaf-700)] hover:text-[var(--color-leaf-900)] disabled:opacity-40"
                      >
                        Probar conexión
                      </button>
                      {canManage && (
                        <button
                          onClick={() => redownloadImages(source)}
                          disabled={
                            !source.is_active ||
                            isThisStarting ||
                            isThisSyncing ||
                            isThisRedownloading ||
                            isAnyOtherRunning
                          }
                          className="text-[11px] text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] disabled:opacity-40"
                          title="Descarga las imágenes de productos que no las tienen"
                        >
                          {isThisRedownloading ? "Re-descargando..." : "Re-descargar imágenes"}
                        </button>
                      )}
                    </>
                  )}
                  {source.type === "csv_import" && (
                    <span className="text-[11px] text-[var(--color-earth-500)] italic">
                      próximo hito
                    </span>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleToggle(source.id, source.is_active)}
                      disabled={isPending}
                      className="text-[11px] text-[var(--color-earth-700)] hover:text-[var(--color-earth-900)]"
                    >
                      {source.is_active ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de progreso */}
      {(sync.mode === "starting" || sync.mode === "running") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-2">
              {sync.mode === "starting" ? "Iniciando sincronización…" : "Sincronizando…"}
            </h2>

            {sync.mode === "running" ? (
              <>
                <p className="text-xs text-[var(--color-earth-700)] mb-4">
                  {sync.isResumed
                    ? "Retomando un job de sincronización abierto en otra sesión. Procesando producto por producto."
                    : "Procesando producto por producto. Puedes dejar esta ventana abierta o cancelar en cualquier momento."}
                </p>

                <div className="bg-[var(--color-earth-50)] rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs text-[var(--color-earth-700)]">Procesados</span>
                    <span className="font-serif text-2xl font-medium text-[var(--color-leaf-900)]">
                      {sync.processed}
                      {sync.total !== null && (
                        <span className="text-sm text-[var(--color-earth-500)]"> / {sync.total}</span>
                      )}
                    </span>
                  </div>
                  {sync.total !== null && sync.total > 0 && (
                    <div className="w-full h-1.5 bg-[var(--color-earth-100)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-leaf-700)] transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (sync.processed / sync.total) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-[#DBF0DD] rounded">
                    <p className="text-[10px] text-[#173404] m-0 uppercase font-medium">Nuevos</p>
                    <p className="font-serif text-lg text-[#173404] m-0">{sync.created}</p>
                  </div>
                  <div className="text-center p-2 bg-[#E6F1FB] rounded">
                    <p className="text-[10px] text-[#0C447C] m-0 uppercase font-medium">Actualizados</p>
                    <p className="font-serif text-lg text-[#0C447C] m-0">{sync.updated}</p>
                  </div>
                  <div className="text-center p-2 bg-[var(--color-earth-100)] rounded">
                    <p className="text-[10px] text-[var(--color-earth-700)] m-0 uppercase font-medium">
                      Saltados
                    </p>
                    <p className="font-serif text-lg text-[var(--color-earth-700)] m-0">
                      {sync.skipped}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-[#FCEBEB] rounded">
                    <p className="text-[10px] text-[#791F1F] m-0 uppercase font-medium">Errores</p>
                    <p className="font-serif text-lg text-[#791F1F] m-0">{sync.failed}</p>
                  </div>
                </div>

                {sync.lastBatchErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-xs text-red-700 font-medium mb-1">
                      Errores en último lote:
                    </p>
                    {sync.lastBatchErrors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-600 m-0 font-mono truncate">
                        {err.name}: {err.error}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={cancelSync}
                  className="w-full px-4 py-2 text-sm font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                >
                  Cancelar sincronización
                </button>
              </>
            ) : (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-leaf-700)] border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultado completado */}
      {sync.mode === "completed" && (sync.created > 0 || sync.updated > 0 || sync.failed > 0) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] mb-3 text-xl">
                ✓
              </div>
              <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0">
                Sincronización completa
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-[#DBF0DD] rounded-lg">
                <p className="text-xs text-[#173404] m-0 mb-1">Productos nuevos</p>
                <p className="font-serif text-2xl text-[#173404] m-0 font-medium">{sync.created}</p>
              </div>
              <div className="text-center p-3 bg-[#E6F1FB] rounded-lg">
                <p className="text-xs text-[#0C447C] m-0 mb-1">Actualizados</p>
                <p className="font-serif text-2xl text-[#0C447C] m-0 font-medium">{sync.updated}</p>
              </div>
            </div>
            {sync.failed > 0 && (
              <p className="text-xs text-red-600 text-center mb-3">
                {sync.failed} producto{sync.failed === 1 ? "" : "s"} fallaron
              </p>
            )}
            <p className="text-xs text-[var(--color-earth-700)] text-center mb-4">
              Los productos están en estado borrador. Revísalos en{" "}
              <a href="/admin/productos" className="text-[var(--color-leaf-700)] underline">
                Productos
              </a>
              .
            </p>
            <button
              onClick={() => {
                setSync({ mode: "idle" });
                window.location.reload();
              }}
              className="w-full px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de progreso re-descarga */}
      {sync.mode === "redownloading" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-2">
              Re-descargando imágenes…
            </h2>
            <p className="text-xs text-[var(--color-earth-700)] mb-4 m-0">
              Página {sync.page} · {sync.processed} producto{sync.processed === 1 ? "" : "s"} revisado{sync.processed === 1 ? "" : "s"}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-[#DBF0DD] rounded-lg">
                <p className="text-[10px] text-[#173404] m-0">Con imágenes</p>
                <p className="font-serif text-xl text-[#173404] m-0 font-medium">
                  {sync.succeeded}
                </p>
              </div>
              <div className="text-center p-2 bg-[#F0E9DB] rounded-lg">
                <p className="text-[10px] text-[var(--color-earth-700)] m-0">Saltados</p>
                <p className="font-serif text-xl text-[var(--color-earth-700)] m-0 font-medium">
                  {sync.skipped}
                </p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-[10px] text-red-700 m-0">Fallidos</p>
                <p className="font-serif text-xl text-red-700 m-0 font-medium">{sync.failed}</p>
              </div>
            </div>

            {sync.lastBatchErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-xs text-red-700 font-medium mb-1">Errores en último lote:</p>
                {sync.lastBatchErrors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-600 m-0 font-mono truncate">
                    {err.name}: {err.error}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={cancelSync}
              className="w-full px-4 py-2 text-sm font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              Cancelar re-descarga
            </button>
          </div>
        </div>
      )}

      {/* Resultado re-descarga */}
      {sync.mode === "redownloaded" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] mb-3 text-xl">
                ✓
              </div>
              <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0">
                Re-descarga completa
              </h2>
              <p className="text-xs text-[var(--color-earth-700)] mt-2 m-0">
                {sync.processed} producto{sync.processed === 1 ? "" : "s"} revisado
                {sync.processed === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-3 bg-[#DBF0DD] rounded-lg">
                <p className="text-xs text-[#173404] m-0 mb-1">Con imágenes</p>
                <p className="font-serif text-2xl text-[#173404] m-0 font-medium">
                  {sync.succeeded}
                </p>
              </div>
              <div className="text-center p-3 bg-[#F0E9DB] rounded-lg">
                <p className="text-xs text-[var(--color-earth-700)] m-0 mb-1">Saltados</p>
                <p className="font-serif text-2xl text-[var(--color-earth-700)] m-0 font-medium">
                  {sync.skipped}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700 m-0 mb-1">Fallidos</p>
                <p className="font-serif text-2xl text-red-700 m-0 font-medium">{sync.failed}</p>
              </div>
            </div>
            <p className="text-[11px] text-[var(--color-earth-500)] text-center mb-4 m-0">
              Los productos saltados ya tenían imágenes o no se encontraron en la fuente.
            </p>
            <button
              onClick={() => {
                setSync({ mode: "idle" });
                window.location.reload();
              }}
              className="w-full px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {sync.mode === "error" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-3 text-2xl">
                ⚠
              </div>
              <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-2">
                No se pudo sincronizar
              </h2>
              <p className="text-sm text-[var(--color-earth-700)]">{sync.message}</p>
            </div>
            <button
              onClick={() => setSync({ mode: "idle" })}
              className="w-full px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de crear fuente */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-medium text-[var(--color-leaf-900)] m-0 mb-4">
              Nueva fuente de datos
            </h2>
            <form onSubmit={handleCreate}>
              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Nombre del laboratorio *
              </label>
              <input
                name="laboratory_name"
                required
                placeholder="ej. Laboratorios Funat"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3"
                autoFocus
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Nombre de la fuente *
              </label>
              <input
                name="name"
                required
                placeholder="ej. Funat · Scraper"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3"
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Tipo de fuente *
              </label>
              <select
                name="type"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 bg-white"
                defaultValue="scraper"
              >
                <option value="scraper">Scraper automático</option>
                <option value="csv_import">Importación CSV (manual)</option>
              </select>

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                URL base del sitio
              </label>
              <input
                name="base_url"
                type="url"
                placeholder="https://ejemplo.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3"
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                URL del catálogo (opcional, si es subdominio distinto)
              </label>
              <input
                name="catalog_url"
                type="url"
                placeholder="https://tienda.ejemplo.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3"
              />

              <label className="block text-xs font-medium text-[var(--color-earth-700)] mb-1">
                Estrategia de scraping
              </label>
              <select
                name="scraper_strategy"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(47,98,56,0.2)] mb-3 bg-white"
                defaultValue="woocommerce"
              >
                <option value="woocommerce">WooCommerce (Store API)</option>
              </select>
              <p className="text-[10px] text-[var(--color-earth-500)] -mt-2 mb-3">
                Otras plataformas (Shopify, Magento) próximamente
              </p>

              {createError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {createError}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-earth-700)] hover:bg-[var(--color-earth-100)] rounded-lg"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium bg-[var(--color-leaf-700)] text-white rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear fuente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function formatRelative(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 24) return `hace ${diffHr}h`;
  if (diffDay < 7) return `hace ${diffDay}d`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
