"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Users,
  Car,
  ClipboardList,
  Package,
  Wrench,
  LayoutDashboard,
  LayoutGrid,
  UserCog,
  User,
  DollarSign,
  BarChart3,
  MessageCircle,
  FileText,
} from "lucide-react";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Ordens de Serviço", icon: ClipboardList },
  { href: "/dashboard/pista", label: "Pista", icon: LayoutGrid },
];

const cadastrosNav = [
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/vehicles", label: "Veículos", icon: Car },
  { href: "/dashboard/stock", label: "Estoque", icon: Package },
  { href: "/dashboard/services", label: "Catálogo de Serviços", icon: Wrench },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  alertCount?: number;
}

function NavItem({ href, label, icon: Icon, alertCount = 0 }: NavItemProps) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative
        ${
          active
            ? "bg-blue-50 text-blue-700 font-medium border-l-3 border-blue-600 ml-0"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      <div className="relative">
        <Icon size={18} className={active ? "text-blue-600" : "text-slate-400"} />
        {href === "/dashboard/stock" && alertCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold
                       rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5"
          >
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </div>
      {label}
    </Link>
  );
}

interface SidebarProps {
  role?: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/stock/alerts")
      .then((r) => r.json())
      .then((data: unknown[]) => setAlertCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {}); // falha silenciosa — não bloquear navegação
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Oficina</h1>
            <p className="text-xs text-slate-400">Sistema de Gestão</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Main */}
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          {(role === "ADMIN" || role === "MECHANIC") && (
            <NavItem href="/dashboard/commissions" label="Comissões" icon={DollarSign} />
          )}
          {role === "ADMIN" && (
            <NavItem href="/dashboard/reports" label="Relatórios" icon={BarChart3} />
          )}
          {role === "ADMIN" && (
            <NavItem href="/dashboard/whatsapp" label="WhatsApp" icon={MessageCircle} />
          )}
          {role === "ADMIN" && (
            <NavItem href="/dashboard/fiscal/invoices" label="Notas Fiscais" icon={FileText} />
          )}
        </div>

        {/* Cadastros */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cadastros
          </p>
          <div className="space-y-1">
            {cadastrosNav.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                alertCount={item.href === "/dashboard/stock" ? alertCount : 0}
              />
            ))}
          </div>
        </div>

        {/* Conta */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Conta
          </p>
          <div className="space-y-1">
            {role === "ADMIN" && (
              <NavItem href="/dashboard/users" label="Usuários" icon={UserCog} />
            )}
            <NavItem href="/dashboard/profile" label="Meu Perfil" icon={User} />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-500 truncate">Paiffer Bosch Car Service</p>
        <p className="text-xs text-slate-400 mt-0.5">Plano Profissional</p>
      </div>
    </aside>
  );
}
