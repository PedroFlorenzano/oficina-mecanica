"use client";

import { useState } from "react";
import { MessageCircle, Mail, X } from "lucide-react";

const WHATSAPP = "5519994239392";
const EMAIL = "pedroflorenzano.dev@gmail.com";

export function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900">Suporte Operare</h4>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="space-y-2">
            <a href={`https://wa.me/${WHATSAPP}?text=Olá! Preciso de ajuda com o Operare.`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
              <MessageCircle size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">WhatsApp</p>
                <p className="text-xs text-green-600">(19) 99423-9392</p>
              </div>
            </a>
            <a href={`mailto:${EMAIL}?subject=Suporte Operare`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              <Mail size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">E-mail</p>
                <p className="text-xs text-blue-600">{EMAIL}</p>
              </div>
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">Seg–Sex, 8h–18h</p>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center">
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
