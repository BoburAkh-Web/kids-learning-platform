import { request } from "./client";
import type { LoginResponse } from "../types/auth";
export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
