"use client";
import RegisterWorkspace from "@/components/registers/RegisterWorkspace";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

export default function RegisterDetailPage() {
  const params = useParams<{ id: string }>();
  const registerId = Number(params.id);

  return (
    <div>
      <Link
        href="/registers"
        className="mb-2 inline-block text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400"
      >
        ← Mes registres
      </Link>
      <RegisterWorkspace registerId={registerId} />
    </div>
  );
}
