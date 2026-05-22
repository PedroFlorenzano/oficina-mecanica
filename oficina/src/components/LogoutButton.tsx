"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800
        px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      title="Sair"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
