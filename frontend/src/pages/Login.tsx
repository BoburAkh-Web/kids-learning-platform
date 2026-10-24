import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import {
  CodeXml,
  Keyboard,
  Grid3x3,
  Terminal,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { APP_NAME } from "../config";
import { login } from "../api/auth";
import { ApiError } from "../api/client";
import { useToast } from "../hooks/useToast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log(email, password);
    setLoading(true);
    try {
      const data = await login(email, password);
      console.log("Kirdi : ", data);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Email yoki parol noto'g'ri");
      } else {
        console.log("server bilan boglanib bolmadi");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleShowPassword() {
    setShowPassword((prev) => !prev);
  }
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-4 py-10 md:grid-cols-2">
        {/* Chap tomon: brend */}
        <section>
          <div className="flex size-24 items-center justify-center rounded-3xl bg-sun">
            <CodeXml className="size-10" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 font-display text-6xl font-bold">{APP_NAME}</h1>
          <p className="mt-3 text-xl text-ink/80">
            O'yin orqali mantiqiy fikrlashni o'rgan
          </p>
          <div className="mt-5 flex gap-3">
            <span className="flex size-14 items-center justify-center rounded-full bg-sky-100">
              <Keyboard className="size-6" />
            </span>
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100">
              <Grid3x3 className="size-6" />
            </span>
            <span className="flex size-14 items-center justify-center rounded-full bg-violet-100">
              <Terminal className="size-6" />
            </span>
          </div>
        </section>

        <section>
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-ink/10 bg-white p-7"
          >
            <h2 className="font-display text-2xl font-semibold">Kirish</h2>

            <label htmlFor="email" className="mt-5 block text-sm font-bold">
              Email
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink/60" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email manzilingiz"
                className="w-full rounded-full border border-ink/15 bg-cream/60 py-4 pl-13 pr-5 outline-none focus:border-ink/40"
              />
            </div>

            <label htmlFor="password" className="mt-5 block text-sm font-bold">
              Parol
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink/60" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni yozing"
                className="w-full rounded-full border border-ink/15 bg-cream/60 py-4 pl-13 pr-14 outline-none focus:border-ink/40"
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"
                }
                onClick={toggleShowPassword}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-ink py-4 font-display text-lg font-semibold text-white hover:bg-ink/90"
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>

          <Link
            to="/guest"
            className="mt-5 block rounded-full border border-ink/15 py-4 text-center font-semibold hover:bg-white"
          >
            Mehmon sifatida mashq qilish
          </Link>

          <p className="mt-5 text-center text-ink/80">
            Hisobingiz yo'qmi?{" "}
            <Link to="/register" className="font-bold text-ink">
              Ro'yxatdan o'tish
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
