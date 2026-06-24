"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/billing").then(r => r.json()).then(data => {
      if (data?.plan === "trial" && data?.planExpiresAt) {
        const diff = Math.ceil((new Date(data.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff <= 5) setDaysLeft(diff);
      }
    }).catch(() => {});
  }, []);

  if (daysLeft === null || dismissed) return null;

  const urgent = daysLeft <= 2;
  const bg = urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const text = urgent ? "text-red-800" : "text-amber-800";
  const icon = urgent ? "text-red-500" : "text-amber-500";

  return (
    <div className={`${bg} border rounded-lg px-4 py-3 mb-6 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className={icon} />
        <p className={`text-sm font-medium ${text}`}>
          {daysLeft <= 0
            ? "Seu período de teste expirou. Assine um plano para continuar usando o sistema."
            : `Seu período de teste expira em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}. Assine um plano para não perder acesso.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/dashboard/billing" className={`text-sm font-semibold ${urgent ? "text-red-700 hover:text-red-900" : "text-amber-700 hover:text-amber-900"} underline`}>
          Ver planos
        </Link>
        <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 ml-2 text-lg">×</button>
      </div>
    </div>
  );
}
