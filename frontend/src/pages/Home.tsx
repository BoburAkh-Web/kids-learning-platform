import { useState, type ReactNode, type SubmitEvent } from "react";
import { Keyboard, Grid3x3, Terminal } from "lucide-react";
import useAuth from "../auth/useAuth";

interface GameCardProps {
  className: string;
  accent: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}

function GameCard({
  className,
  accent,
  icon,
  title,
  description,
  badge,
  children,
}: GameCardProps) {
  return (
    <section className={`rounded-4xl p-7 ${className}`}>
      <div className="flex items-center justify-between">
        <span
          className={`flex size-16 items-center justify-center rounded-full bg-white ${accent}`}
        >
          {icon}
        </span>
        {badge && (
          <span
            className={`rounded-full bg-white px-3 py-1 font-display text-sm font-semibold ${accent}`}
          >
            {badge}
          </span>
        )}
      </div>
      <h2 className="mt-4 font-display text-3xl font-semibold">{title}</h2>
      <p className={`mt-2 ${accent}`}>{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");

  function handleRoomSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <div>
      <h1 className="font-display text-5xl font-bold">
        Salom{user ? `, ${user.nickname}` : ""}!
      </h1>
      <p className="mt-2 text-xl text-ink/80">Bugun nima o'ynaymiz?</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <GameCard
          className="bg-[#cfe5f6]"
          accent="text-[#1f4e79]"
          icon={<Keyboard className="size-6" />}
          title="Typing Race"
          description="Tez va aniq yozishni mashq qil"
        >
          <button
            type="button"
            className="rounded-full bg-ink px-6 py-3 font-display font-semibold text-white hover:bg-ink/90"
          >
            Boshlash
          </button>
        </GameCard>

        <GameCard
          className="bg-[#ceeadb]"
          accent="text-[#1f5c45]"
          icon={<Grid3x3 className="size-6" />}
          title="Xonaga kirish"
          description="Ustoz bergan 6 xonali kodni kiriting"
        >
          <form onSubmit={handleRoomSubmit} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6 xonali raqam"
              aria-label="Xona kodi"
              className="min-w-0 flex-1 rounded-full bg-white px-5 py-4 outline-none placeholder:text-ink/50 focus:ring-2 focus:ring-ink/20"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-6 font-display font-semibold text-white hover:bg-ink/90"
            >
              Kirish
            </button>
          </form>
        </GameCard>

        <GameCard
          className="bg-[#ddd3f5]"
          accent="text-[#4b3a8c]"
          icon={<Terminal className="size-6" />}
          title="IT darslari"
          description="Qisqa darslar va testlar"
          badge="Yangi"
        />
      </div>
    </div>
  );
}
