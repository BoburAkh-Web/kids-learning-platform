import { Link, Outlet } from "react-router";
import { APP_NAME } from "../config";
import useAuth from "../auth/useAuth";

function Layout() {
  const { user } = useAuth();
  return (
    <div>
      <header className="flex justify-between px-8">
        <Link to="/">{APP_NAME}</Link>
        <h1>{user ? user.nickname : ""}</h1>
        <Link to="/login">Kirish</Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
