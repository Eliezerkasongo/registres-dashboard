"use client";

import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import Image from "next/image";
import Link from "next/link";
import React from "react";

// No session exists yet on the sign-in/sign-up pages, so the tenant's own
// logo (normally read from useAuth().tenant.logo_url) isn't available here -
// this deployment serves a single organization, so its branding is fixed.
const ORG_LOGO_PATH = "/uploads/logos/4f5c3c2cacbc8a8efb2ae4a2693febf5.png";
const ORG_NAME = "AIDPROFEN";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="mb-4 flex flex-col items-center gap-3">
                  <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white/10">
                    <Image
                      src={resolveAssetUrl(ORG_LOGO_PATH) ?? ORG_LOGO_PATH}
                      alt={ORG_NAME}
                      fill
                      unoptimized
                      className="object-contain p-1.5"
                    />
                  </span>
                  <span className="text-2xl font-semibold tracking-wide text-white">
                    {ORG_NAME}
                  </span>
                  <span className="text-sm font-medium text-gray-300 dark:text-white/70">
                    Support logistique
                  </span>
                </Link>
                <p className="text-center text-gray-400 dark:text-white/60">
                  La plateforme de gestion de vos registres
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
