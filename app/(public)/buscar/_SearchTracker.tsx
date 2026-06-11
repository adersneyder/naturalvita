"use client";

import { useEffect } from "react";
import { track } from "@/lib/savia/tracker";

/**
 * Dispara `search_performed` cuando el usuario llega con una query nueva.
 * Re-corre si cambia `query`. La paginación dentro de la misma búsqueda
 * no emite un nuevo evento porque solo paramos `query` y `results_count`
 * como deps — el page param no genera un nuevo "search".
 */
export default function SearchTracker({
  query,
  resultsCount,
}: {
  query: string;
  resultsCount: number;
}) {
  useEffect(() => {
    if (!query.trim()) return;
    track("search_performed", {
      query: query.trim(),
      results_count: resultsCount,
    });
  }, [query, resultsCount]);

  return null;
}
