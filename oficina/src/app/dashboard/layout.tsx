import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import RemountOnNavigate from "@/components/RemountOnNavigate";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  MECHANIC: "Mecânico",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { name, role } = session.user;
  const initials = getInitials(name ?? "U");
  const label = roleLabel[role] ?? role;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-slate-400">
            {/* Breadcrumb placeholder */}
          </div>
          <div className="flex items-center gap-3">
            {/* User info */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-800 leading-none">{name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <RemountOnNavigate>
              {children}
            </RemountOnNavigate>
          </div>
        </main>
      </div>
    </div>
  );
}
