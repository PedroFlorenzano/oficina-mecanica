"use client";

import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";

export interface MultiSelectItem {
  id: string;
  label: string;
  sublabel?: string;
  rightLabel?: string;
}

interface MultiSelectModalProps {
  title: string;
  items: MultiSelectItem[];
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
  excludeIds?: string[];
}

export default function MultiSelectModal({ title, items, onConfirm, onClose, excludeIds = [] }: MultiSelectModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const available = items.filter((i) => !excludeIds.includes(i.id));
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter((i) => i.label.toLowerCase().includes(q) || i.sublabel?.toLowerCase().includes(q));
  }, [items, search, excludeIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {selected.size > 0 && (
            <p className="text-xs text-blue-600 mt-2">{selected.size} selecionado(s)</p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum item encontrado</p>
          ) : (
            filtered.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-slate-400 truncate">{item.sublabel}</p>}
                  </div>
                  {item.rightLabel && <span className="text-sm font-medium text-green-700 flex-shrink-0">{item.rightLabel}</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Adicionar {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
