import type { ReactNode } from "react";
import { CodeXml, Keyboard, Grid3x3, Terminal } from "lucide-react";
import { APP_NAME } from "../config";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-12 px-4 py-20 md:grid-cols-2">
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

        <section>{children}</section>
      </div>
    </div>
  );
}
