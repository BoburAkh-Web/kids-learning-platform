import { Link, Outlet } from "react-router";
import { CodeXml } from "lucide-react";
import { APP_NAME } from "../config";
import useAuth from "../auth/useAuth";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sun">
            <CodeXml className="size-6" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl font-bold">{APP_NAME}</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white py-1.5 pl-1.5 pr-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-sun font-display font-bold">
                {user.nickname.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold">{user.nickname}</span>
            </div>
            <button
              type="button"
              className="rounded-full border border-ink/15 px-6 py-3 font-display font-semibold hover:bg-white"
            >
              Chiqish
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-full bg-ink px-6 py-3 font-display font-semibold text-white"
          >
            Kirish
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <Outlet />
      </main>
    </div>
  );
}
