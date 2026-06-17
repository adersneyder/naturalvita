"use client";

import { useState, useTransition } from "react";
import { changeRole, setAdminActive } from "./actions";

type UserData = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
};

const ASSIGNABLE = ["admin", "editor", "cashier", "warehouse"] as const;
type AssignableRole = (typeof ASSIGNABLE)[number];

export default function UserRow({
  user,
  isSelf,
  roleLabels,
}: {
  user: UserData;
  isSelf: boolean;
  roleLabels: Record<string, string>;
}) {
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOwner = user.role === "owner";
  const lockedReason = isSelf
    ? "Tu propia cuenta"
    : isOwner
      ? "El owner se administra solo desde BD"
      : null;

  function onRoleChange(value: string) {
    if (!ASSIGNABLE.includes(value as AssignableRole)) return;
    setError(null);
    const prev = role;
    setRole(value);
    startTransition(async () => {
      const res = await changeRole({ user_id: user.id, role: value as AssignableRole });
      if (!res.ok) {
        setRole(prev);
        setError(res.error);
      }
    });
  }

  function onToggleActive() {
    if (!confirm(active ? "¿Desactivar a este miembro?" : "¿Reactivar a este miembro?")) {
      return;
    }
    setError(null);
    const prev = active;
    setActive(!prev);
    startTransition(async () => {
      const res = await setAdminActive(user.id, !prev);
      if (!res.ok) {
        setActive(prev);
        setError(res.error);
      }
    });
  }

  const last = user.last_login_at
    ? new Date(user.last_login_at).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <>
      <tr className={active ? "" : "opacity-60"}>
        <td className="px-3 py-2">
          <p className="text-[var(--color-leaf-900)] m-0 font-medium truncate">
            {user.full_name ?? user.email}
            {isSelf && (
              <span className="ml-1.5 text-[10px] text-[var(--color-earth-500)] font-normal">
                (tú)
              </span>
            )}
          </p>
          <p className="text-[10px] text-[var(--color-earth-500)] m-0 truncate">
            {user.email}
          </p>
        </td>
        <td className="px-3 py-2">
          {lockedReason ? (
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium bg-[var(--color-earth-100)] text-[var(--color-earth-700)]"
              title={lockedReason}
            >
              {roleLabels[user.role] ?? user.role}
            </span>
          ) : (
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              disabled={pending}
              className="px-2 py-1 rounded-lg border border-[rgba(47,98,56,0.15)] text-xs bg-white focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
            >
              {ASSIGNABLE.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r] ?? r}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="px-3 py-2">
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${
              active
                ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
                : "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]"
            }`}
          >
            {active ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td className="px-3 py-2 text-[10px] text-[var(--color-earth-500)] tabular-nums">
          {last}
        </td>
        <td className="px-3 py-2 text-right">
          {!lockedReason && (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={pending}
              className="text-[var(--color-iris-700)] hover:underline disabled:opacity-50"
            >
              {active ? "Desactivar" : "Reactivar"}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5} className="px-3 py-1">
            <p className="text-[10px] text-[#B23A1F] m-0">{error}</p>
          </td>
        </tr>
      )}
    </>
  );
}
