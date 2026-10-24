import { useState, type ReactNode } from "react";
import { login as apiLogin } from "../api/auth";
import type { User } from "../types/auth";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    setUser(data.user);
  }

  return <AuthContext value={{ user, login }}>{children}</AuthContext>;
}
