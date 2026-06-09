import { httpClient } from "./httpClient";

export const adminOptionService = {
  services<T>(providerId: string, adminToken: string) {
    return httpClient<T>(`/admin/options/providers/${providerId}/services`, { headers: authHeaders(adminToken) });
  },
  countries<T>(providerId: string, adminToken: string) {
    return httpClient<T>(`/admin/options/providers/${providerId}/countries`, { headers: authHeaders(adminToken) });
  },
  prices<T>(providerId: string, serviceCode: string, countryCode: string, adminToken: string) {
    const params = new URLSearchParams({ serviceCode, countryCode });
    return httpClient<T>(`/admin/options/providers/${providerId}/prices?${params.toString()}`, { headers: authHeaders(adminToken) });
  }
};

function authHeaders(adminToken: string): HeadersInit {
  return { Authorization: `Bearer ${adminToken}` };
}
