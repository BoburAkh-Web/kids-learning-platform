import { Link, Outlet } from "react-router";
import { APP_NAME } from "../config";

function Layout() {
  return (
    <div>
      <header className="flex justify-between px-8">
        <Link to="/">{APP_NAME}</Link>
        <Link to="/login">Kirish</Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
