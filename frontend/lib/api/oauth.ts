import { api } from "@/lib/api/client";

export function googleOauthStatus() {
  return api.get<{ connected: boolean }>("/oauth/google/status");
}

export function googleOauthStart() {
  return api.get<{ auth_url: string }>("/oauth/google/start");
}
