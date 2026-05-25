"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
  rightLabel?: string;
  rightSublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  allowFreeText?: boolean;
}

export default function Combobox({
  options,
  value,
  onChange,
  onSelect,
  placeholder = "Buscar...",
  label,
  required,
  disabled,
  className = "",
  emptyMessage = "Nenhum resultado",
  allowFreeText = false,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(value.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(value.toLowerCase()))
  );

  // Update dropdown position when open
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setHighlightedIndex(0);
          } else {
            setHighlightedIndex((prev) =>
              prev < filtered.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filtered.length - 1
            );
          }
          break;
        case "Enter":
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
            handleSelect(filtered[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, highlightedIndex, filtered, disabled]
  );

  const handleSelect = (option: ComboboxOption) => {
    onSelect(option);
    onChange(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-16 border border-slate-300 rounded-lg text-sm 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            transition-colors`}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
              tabIndex={-1}
              aria-label="Limpar"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown via portal to escape overflow:hidden containers */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          className="z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg 
            max-h-60 overflow-y-auto overscroll-contain custom-scrollbar"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-400 text-center">
              {value ? emptyMessage : "Digite para buscar..."}
              {allowFreeText && value && (
                <span className="block text-xs text-blue-600 mt-1">
                  Pressione Enter para usar &ldquo;{value}&rdquo;
                </span>
              )}
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.id}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2.5 cursor-pointer text-sm flex items-center justify-between
                  border-b border-slate-50 last:border-b-0
                  ${highlightedIndex === index ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800 block truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs text-slate-400 block truncate">{option.sublabel}</span>
                  )}
                </div>
                {(option.rightLabel || option.rightSublabel) && (
                  <div className="text-right ml-3 flex-shrink-0">
                    {option.rightLabel && (
                      <span className="text-sm font-medium text-green-600">{option.rightLabel}</span>
                    )}
                    {option.rightSublabel && (
                      <span className="text-xs text-slate-400 block">{option.rightSublabel}</span>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>,
        document.body
      )}
    </div>
  );
}
