"use client";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }
    if (user?.role !== "superadmin") {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  async function handleLogout() {
    await logout();
    router.replace("/signin");
  }

  if (isLoading || !isAuthenticated || user?.role !== "superadmin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Support Logistique - Administration
        </span>
        <Button size="sm" variant="outline" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </header>
      <main className="mx-auto max-w-(--breakpoint-xl) p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
