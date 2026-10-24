export type Role = "student" | "teacher";
export interface User {
  id: string;
  email: string;
  role: Role;
  nickname: string;
}
export interface LoginResponse {
  accessToken: string;
  user: User;
}
