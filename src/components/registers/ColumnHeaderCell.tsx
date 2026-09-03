"use client";
import React, { useEffect, useRef, useState } from "react";

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.5 2.5h13L9.5 8.2v4.6l-3 1.7V8.2L1.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface ColumnFilterOption {
  value: string;
  label: string;
}

interface ColumnHeaderCellProps {
  label: string;
  width: number;
  onResize: (width: number) => void;
  /** "choice" shows a checklist of modalites (select/boolean fields);
   * "text" shows a single contains-text input (everything else). */
  filterKind: "choice" | "text";
  modalites?: ColumnFilterOption[];
  filterValue: string[] | string;
  onFilterChange: (value: string[] | string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_COLUMN_WIDTH = 80;

export default function ColumnHeaderCell({
  label,
  width,
  onResize,
  filterKind,
  modalites = [],
  filterValue,
  onFilterChange,
  isOpen,
  onOpenChange,
}: ColumnHeaderCellProps) {
  const [draftText, setDraftText] = useState(
    typeof filterValue === "string" ? filterValue : ""
  );
  const [draftChoices, setDraftChoices] = useState<string[]>(
    Array.isArray(filterValue) ? filterValue : []
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftText(typeof filterValue === "string" ? filterValue : "");
      setDraftChoices(Array.isArray(filterValue) ? filterValue : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onOpenChange]);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;

    function onMouseMove(moveEvent: MouseEvent) {
      const next = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX));
      onResize(next);
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function toggleChoice(value: string) {
    setDraftChoices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function applyFilter() {
    onFilterChange(filterKind === "choice" ? draftChoices : draftText.trim());
    onOpenChange(false);
  }

  function clearFilter() {
    setDraftText("");
    setDraftChoices([]);
    onFilterChange(filterKind === "choice" ? [] : "");
    onOpenChange(false);
  }

  const isActive =
    filterKind === "choice"
      ? Array.isArray(filterValue) && filterValue.length > 0
      : typeof filterValue === "string" && filterValue.trim() !== "";

  return (
    <div className="relative flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
        className={`shrink-0 rounded p-0.5 ${
          isActive
            ? "text-brand-500"
            : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
        }`}
        aria-label={`Filtrer ${label}`}
      >
        <FunnelIcon className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal normal-case shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filterKind === "choice" ? (
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {modalites.length === 0 && (
                <p className="text-gray-400">Aucune modalité.</p>
              )}
              {modalites.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draftChoices.includes(opt.value)}
                    onChange={() => toggleChoice(opt.value)}
                  />
                  <span className="truncate text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              autoFocus
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilter()}
              placeholder="Contient..."
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearFilter}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={applyFilter}
              className="rounded bg-brand-500 px-2.5 py-1 font-medium text-white hover:bg-brand-600"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      <div
        onMouseDown={startResize}
        className="absolute -right-2.5 top-0 h-full w-2.5 cursor-col-resize select-none"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionner la colonne ${label}`}
      />
    </div>
  );
}
