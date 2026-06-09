import { createContext, useContext } from "react";

export type AdminAuthContextValue = {
  adminToken: string;
};

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthContext");
  }

  return context;
}
