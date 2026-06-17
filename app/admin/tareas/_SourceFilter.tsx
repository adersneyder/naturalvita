"use client";

import { useRouter } from "next/navigation";
import { TASK_SOURCE_LABELS } from "@/lib/tasks/types";

export default function SourceFilter({
  current,
  status,
}: {
  current: string;
  status: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams();
        if (status) next.set("status", status);
        if (e.target.value) next.set("source", e.target.value);
        router.push(`/admin/tareas${next.toString() ? `?${next}` : ""}`);
      }}
      className="ml-auto px-3 py-1.5 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)]"
    >
      <option value="">Todas las fuentes</option>
      {Object.entries(TASK_SOURCE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
