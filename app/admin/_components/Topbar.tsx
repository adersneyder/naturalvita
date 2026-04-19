import { signOut } from "../actions";

type TopbarProps = {
  userName: string;
  userEmail: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Topbar({ userName, userEmail }: TopbarProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
        {greeting()}, {userName.split(" ")[0]}
      </h1>
      <div className="flex items-center gap-3">
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
        <div
          title={userEmail}
          className="w-8 h-8 rounded-full bg-[var(--color-leaf-700)] text-white flex items-center justify-center text-[11px] font-medium"
        >
          {getInitials(userName)}
        </div>
      </div>
    </div>
  );
}
