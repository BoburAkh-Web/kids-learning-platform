import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  rightSlot?: ReactNode;
}

export function Field({
  label,
  icon,
  rightSlot,
  id,
  ...inputProps
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/60">
          {icon}
        </span>
        <input
          id={id}
          {...inputProps}
          className="w-full rounded-full border border-ink/15 bg-cream/60 py-4 pl-13 pr-14 outline-none focus:border-ink/40"
        />
        {rightSlot && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}
