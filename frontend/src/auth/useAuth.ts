import { useContext } from "react";
import { AuthContext } from "./AuthContext";

function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth faqat AuthProvider ichida ishlatiladi");
  }
  return auth;
}

export default useAuth;
