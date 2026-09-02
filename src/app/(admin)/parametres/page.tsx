"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import OrganizationSettingsForm from "@/components/settings/OrganizationSettingsForm";
import ProfileSettingsForm from "@/components/settings/ProfileSettingsForm";
import { useAuth } from "@/context/AuthContext";
import React from "react";

export default function ParametresPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageBreadcrumb pageTitle="Paramètres" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {user?.role === "admin" && <OrganizationSettingsForm />}
        <ProfileSettingsForm />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
