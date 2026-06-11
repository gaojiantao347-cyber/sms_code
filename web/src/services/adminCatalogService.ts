import { httpClient } from "./httpClient";

export const adminCatalogService = {
  platforms<T>(enabledOnly: boolean, adminToken: string) {
    const query = enabledOnly ? "?enabledOnly=true" : "";
    return httpClient<T>(`/admin/catalog/platforms${query}`, { headers: authHeaders(adminToken) });
  },
  countries<T>(enabledOnly: boolean, adminToken: string) {
    const query = enabledOnly ? "?enabledOnly=true" : "";
    return httpClient<T>(`/admin/catalog/countries${query}`, { headers: authHeaders(adminToken) });
  },
  sync<T>(providerId: string, adminToken: string) {
    return httpClient<T>("/admin/catalog/sync", { method: "POST", body: { providerId }, headers: authHeaders(adminToken) });
  }
};

function authHeaders(adminToken: string): HeadersInit {
  return { Authorization: `Bearer ${adminToken}` };
}
