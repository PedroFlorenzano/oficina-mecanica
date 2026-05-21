"use client";

interface PistaFiltersProps {
  value: string;
  onChange: (value: string) => void;
}

export function PistaFilters({ value, onChange }: PistaFiltersProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrar por profissional..."
        className="min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        aria-label="Filtrar por profissional"
      />
    </div>
  );
}
