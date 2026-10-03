"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ApiTokensSettings from "@/components/settings/ApiTokensSettings";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import OrganizationSettingsForm from "@/components/settings/OrganizationSettingsForm";
import ProfileSettingsForm from "@/components/settings/ProfileSettingsForm";
import TeamSettings from "@/components/settings/TeamSettings";
import { useAuth } from "@/context/AuthContext";
import { BoxCubeIcon, GroupIcon, LockIcon, PlugInIcon, UserIcon } from "@/icons";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

type SettingsTabKey = "profile" | "organization" | "team" | "password" | "api-tokens";

interface SettingsTab {
  key: SettingsTabKey;
  label: string;
  icon: React.ReactNode;
}

// Organisation/Équipe/Tokens API only exist for an admin - a member's ?tab=
// pointing at one of those (a stale link, a typed URL) falls back to Profil
// rather than showing an empty pane.
function isValidTabKey(key: string | null, isAdmin: boolean): key is SettingsTabKey {
  if (key === "profile" || key === "password") return true;
  if (key === "organization" || key === "team" || key === "api-tokens") return isAdmin;
  return false;
}

// Explicit width/height (SVGR spreads props onto the root <svg>, overriding
// each icon's own native 20px/24px default) so every tab icon renders at the
// same size regardless of which source icon is used. Set to the largest
// native size among them (BoxCubeIcon/GroupIcon/PlugInIcon are 24px) so none
// of them is ever shrunk below its native size - only enlarged (UserIcon/
// LockIcon, both natively 20px) - shrinking a shared icon below its native
// size is what caused it to render clipped elsewhere in the app.
const ICON_SIZE = 24;

function ParametresPageContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const router = useRouter();
  const searchParams = useSearchParams();

  // "Mon profil" (user menu) links here with ?tab=profile, the sidebar's
  // "Paramètres" with ?tab=organization (or ?tab=password for a member) -
  // so the two no longer land on the exact same tab. Falls back to Profil
  // for a missing/invalid/not-allowed tab param.
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(() => {
    const requested = searchParams.get("tab");
    return requested && isValidTabKey(requested, isAdmin) ? requested : "profile";
  });

  useEffect(() => {
    const requested = searchParams.get("tab");
    setActiveTab(requested && isValidTabKey(requested, isAdmin) ? requested : "profile");
  }, [searchParams, isAdmin]);

  function selectTab(key: SettingsTabKey) {
    setActiveTab(key);
    router.replace(`/parametres?tab=${key}`);
  }

  // Only two tabs are always available - Organisation, Équipe and Tokens API
  // are admin-only, same restriction the underlying forms/endpoints already
  // enforce, just reflected here so a non-admin never sees an empty tab.
  const tabs: SettingsTab[] = [
    { key: "profile", label: "Profil", icon: <UserIcon width={ICON_SIZE} height={ICON_SIZE} /> },
    ...(isAdmin
      ? [
          {
            key: "organization" as const,
            label: "Organisation",
            icon: <BoxCubeIcon width={ICON_SIZE} height={ICON_SIZE} />,
          },
          {
            key: "team" as const,
            label: "Équipe",
            icon: <GroupIcon width={ICON_SIZE} height={ICON_SIZE} />,
          },
        ]
      : []),
    { key: "password", label: "Mot de passe", icon: <LockIcon width={ICON_SIZE} height={ICON_SIZE} /> },
    ...(isAdmin
      ? [
          {
            key: "api-tokens" as const,
            label: "Tokens API",
            icon: <PlugInIcon width={ICON_SIZE} height={ICON_SIZE} />,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Paramètres" />
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex flex-wrap gap-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {activeTab === "profile" && <ProfileSettingsForm />}
        {activeTab === "organization" && isAdmin && <OrganizationSettingsForm />}
        {activeTab === "team" && isAdmin && <TeamSettings />}
        {activeTab === "password" && <ChangePasswordForm />}
        {activeTab === "api-tokens" && isAdmin && <ApiTokensSettings />}
      </div>
    </div>
  );
}

export default function ParametresPage() {
  return (
    <Suspense fallback={null}>
      <ParametresPageContent />
    </Suspense>
  );
}
