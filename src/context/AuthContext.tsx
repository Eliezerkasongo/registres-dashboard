"use client";

import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  registerTenant as apiRegisterTenant,
} from "@/lib/api/auth";
import { clearTokens, getAccessToken } from "@/lib/api/tokenStorage";
import type { AuthResponse, Tenant, User } from "@/lib/api/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  registerTenant: (input: {
    tenant_name: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateTenant: (tenant: Tenant) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiMe();
        if (!cancelled) {
          setUser(res.user);
          setTenant(res.tenant);
        }
      } catch {
        clearTokens();
        if (!cancelled) {
          setUser(null);
          setTenant(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.user);
    setTenant(res.tenant);
    return res;
  }, []);

  const registerTenant = useCallback(
    async (input: {
      tenant_name: string;
      name: string;
      email: string;
      password: string;
    }) => {
      const res = await apiRegisterTenant(input);
      setUser(res.user);
      setTenant(res.tenant);
      return res;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setTenant(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      isLoading,
      isAuthenticated: !!user,
      login,
      registerTenant,
      logout,
      updateUser: setUser,
      updateTenant: setTenant,
    }),
    [user, tenant, isLoading, login, registerTenant, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
