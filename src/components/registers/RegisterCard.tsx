import Badge from "@/components/ui/badge/Badge";
import type { RegisterSummary } from "@/lib/api/types";
import Link from "next/link";
import React from "react";

interface RegisterCardProps {
  register: RegisterSummary;
  onSetMain?: (register: RegisterSummary) => void;
}

export default function RegisterCard({ register, onSetMain }: RegisterCardProps) {
  return (
    <Link
      href={`/registers/${register.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 md:p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-center w-12 h-12 text-lg font-semibold rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
          {register.icon || register.name.charAt(0).toUpperCase()}
        </div>
        {register.is_main && <Badge color="success">Principal</Badge>}
      </div>

      <div className="mt-5">
        <h3 className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
          {register.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
          {register.description || "Aucune description"}
        </p>
      </div>

      <div className="flex items-center justify-between mt-5">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {register.fields_count}{" "}
            {register.fields_count > 1 ? "champs" : "champ"}
          </span>
          <span>
            {register.entries_count}{" "}
            {register.entries_count > 1 ? "entrées" : "entrée"}
          </span>
        </div>
        {!register.is_main && onSetMain && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetMain(register);
            }}
            className="text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            Définir comme principal
          </button>
        )}
      </div>
    </Link>
  );
}
