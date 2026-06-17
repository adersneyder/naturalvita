"use client";

import { useState, useTransition } from "react";
import { setRoleCapability } from "../actions";

type Capability = {
  code: string;
  category: string;
  description: string;
};

type Group = {
  category: string;
  label: string;
  capabilities: Capability[];
};

const ROLES = ["admin", "editor", "cashier", "warehouse"] as const;
type AssignableRole = (typeof ROLES)[number];

const ROLE_LABELS: Record<AssignableRole, string> = {
  admin: "Admin",
  editor: "Editor",
  cashier: "Caja",
  warehouse: "Bodega",
};

/**
 * Matriz editable de capabilities × roles. Cada celda es un checkbox
 * que dispara setRoleCapability optimista — si falla, revertimos.
 *
 * Owner no aparece como columna: tiene wildcard implícito en BD y no
 * se edita por UI.
 */
export default function CapabilityMatrix({
  groups,
  byRole,
}: {
  groups: Group[];
  byRole: Record<string, string[]>;
}) {
  const [state, setState] = useState<Record<AssignableRole, Set<string>>>(
    () => {
      const initial: Record<AssignableRole, Set<string>> = {
        admin: new Set(),
        editor: new Set(),
        cashier: new Set(),
        warehouse: new Set(),
      };
      for (const role of ROLES) {
        for (const code of byRole[role] ?? []) {
          initial[role].add(code);
        }
      }
      return initial;
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(role: AssignableRole, code: string) {
    setError(null);
    const has = state[role].has(code);
    const newGranted = !has;

    // Optimista
    setState((prev) => {
      const next = { ...prev };
      const set = new Set(next[role]);
      if (newGranted) set.add(code);
      else set.delete(code);
      next[role] = set;
      return next;
    });

    startTransition(async () => {
      const res = await setRoleCapability({
        role,
        capability_code: code,
        granted: newGranted,
      });
      if (!res.ok) {
        // Revert
        setState((prev) => {
          const next = { ...prev };
          const set = new Set(next[role]);
          if (newGranted) set.delete(code);
          else set.add(code);
          next[role] = set;
          return next;
        });
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-[#B23A1F] bg-[#FCE9E5] p-2 rounded-lg m-0">
          {error}
        </p>
      )}
      {groups.map((g) => (
        <section
          key={g.category}
          className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto"
        >
          <div className="px-4 py-2 border-b border-[rgba(47,98,56,0.06)] bg-[var(--color-earth-50)]/40">
            <h2 className="font-serif text-sm text-[var(--color-leaf-900)] m-0">
              {g.label}
            </h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.06)]">
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)]">
                  Capacidad
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className="px-3 py-2 text-center text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)]"
                  >
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {g.capabilities.map((cap) => (
                <tr key={cap.code} className="hover:bg-[var(--color-earth-50)]/40">
                  <td className="px-3 py-2">
                    <p className="text-[var(--color-leaf-900)] m-0">
                      {cap.description}
                    </p>
                    <p className="text-[10px] text-[var(--color-earth-500)] font-mono m-0">
                      {cap.code}
                    </p>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={state[r].has(cap.code)}
                        onChange={() => toggle(r, cap.code)}
                        disabled={pending}
                        className="w-4 h-4 accent-[var(--color-leaf-700)] cursor-pointer disabled:opacity-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
