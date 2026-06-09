import { httpClient } from "./httpClient";

export const adminProviderService = {
  list<T>(query = "", adminToken: string) {
    return httpClient<T>(`/admin/providers${query}`, { headers: authHeaders(adminToken) });
  },
  create<T>(body: unknown, adminToken: string) {
    return httpClient<T>("/admin/providers", { method: "POST", body, headers: authHeaders(adminToken) });
  },
  update<T>(id: string, body: unknown, adminToken: string) {
    return httpClient<T>(`/admin/providers/${id}`, { method: "PATCH", body, headers: authHeaders(adminToken) });
  },
  disable<T>(id: string, adminToken: string) {
    return httpClient<T>(`/admin/providers/${id}/disable`, { method: "POST", headers: authHeaders(adminToken) });
  }
};

function authHeaders(adminToken: string): HeadersInit {
  return { Authorization: `Bearer ${adminToken}` };
}
