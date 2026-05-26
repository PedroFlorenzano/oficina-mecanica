"use client";

import { useState, useEffect } from "react";

interface Mechanic {
  id: string;
  name: string;
}

interface PistaFiltersProps {
  value: string;
  onChange: (value: string) => void;
}

export function PistaFilters({ value, onChange }: PistaFiltersProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  useEffect(() => {
    fetch("/api/users?role=MECHANIC")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Mechanic[]) => setMechanics(data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3 mb-4">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        aria-label="Filtrar por mecânico"
      >
        <option value="">Todos os mecânicos</option>
        {mechanics.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
