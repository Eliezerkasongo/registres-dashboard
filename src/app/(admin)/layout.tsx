"use client";

import CreateRegisterModal from "@/components/registers/CreateRegisterModal";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    isCreateRegisterOpen,
    closeCreateRegisterModal,
  } = useSidebar();
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[230px]"
    : "lg:ml-[72px]";

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`min-w-0 flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>

      {/* Rendered here, not inside AppSidebar - the sidebar's <aside> always
       * has an active `transform` (its slide-in/out translate-x-* classes),
       * which makes it the containing block for any `position: fixed`
       * descendant, so a modal nested inside it would render confined to
       * the sidebar's own narrow box instead of the full screen. */}
      <CreateRegisterModal
        isOpen={isCreateRegisterOpen}
        onClose={closeCreateRegisterModal}
        onCreated={(register) => {
          closeCreateRegisterModal();
          router.push(`/registers/${register.id}`);
        }}
      />
    </div>
  );
}
