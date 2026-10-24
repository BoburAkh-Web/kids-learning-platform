import { createContext } from "react";
import { type User } from "../types/auth";
export interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
