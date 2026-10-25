import { useState } from "react";
import { Link } from "react-router";
import {
  UserRound,
  Mail,
  Lock,
  Eye,
  School,
  BookOpen,
  Briefcase,
  Users,
} from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { Field } from "../components/Field";
import type { Role } from "../types/auth";

export default function Register() {
  const [role, setRole] = useState<Role>("student");

  const tabClass = (active: boolean) =>
    `rounded-full py-3 font-display font-semibold transition ${
      active ? "bg-ink text-white" : "text-ink hover:bg-white"
    }`;

  return (
    <AuthLayout>
      <form className="rounded-3xl border border-ink/10 bg-white p-7">
        <h2 className="font-display text-2xl font-semibold">
          Ro'yxatdan o'tish
        </h2>

        <div className="mt-5 grid grid-cols-2 rounded-full border border-ink/10 bg-cream/60 p-1">
          <button
            type="button"
            aria-pressed={role === "student"}
            onClick={() => setRole("student")}
            className={tabClass(role === "student")}
          >
            O'quvchi
          </button>
          <button
            type="button"
            aria-pressed={role === "teacher"}
            onClick={() => setRole("teacher")}
            className={tabClass(role === "teacher")}
          >
            Ustoz
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <Field
            id="nickname"
            label="Nikneym"
            icon={<UserRound className="size-5" />}
            placeholder="Masalan, Ali"
          />
          <Field
            id="email"
            type="email"
            label="Email"
            icon={<Mail className="size-5" />}
            placeholder="Email manzilingiz"
          />
          <Field
            id="password"
            type="password"
            label="Parol"
            icon={<Lock className="size-5" />}
            placeholder="Kamida 8 belgi"
            rightSlot={
              <button
                type="button"
                aria-label="Parolni ko'rsatish"
                className="text-ink/60 hover:text-ink"
              >
                <Eye className="size-5" />
              </button>
            }
          />
        </div>

        {role === "teacher" && (
          <div className="mt-5 space-y-5 rounded-3xl bg-violet-50 p-4">
            <h3 className="text-sm font-bold text-violet-700">
              Ustoz ma'lumotlari
            </h3>
            <Field
              id="full_name"
              label="To'liq ism"
              icon={<UserRound className="size-5" />}
              placeholder="Ism va familiya"
            />
            <Field
              id="school"
              label="Maktab / markaz"
              icon={<School className="size-5" />}
              placeholder="Ixtiyoriy"
            />
            <Field
              id="subjects"
              label="Fanlar"
              icon={<BookOpen className="size-5" />}
              placeholder="math, it"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="experience_years"
                type="number"
                min={0}
                label="Tajriba (yil)"
                icon={<Briefcase className="size-5" />}
                placeholder="0"
              />
              <Field
                id="age_group"
                label="Yosh guruhi"
                icon={<Users className="size-5" />}
                placeholder="7-9"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-ink py-4 font-display text-lg font-semibold text-white hover:bg-ink/90"
        >
          Ro'yxatdan o'tish
        </button>
      </form>

      <p className="mt-5 text-center text-ink/80">
        Hisobingiz bormi?{" "}
        <Link to="/login" className="font-bold text-ink">
          Kirish
        </Link>
      </p>
    </AuthLayout>
  );
}
