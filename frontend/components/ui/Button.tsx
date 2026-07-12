import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:opacity-90 disabled:opacity-50",
  secondary:
    "border-2 border-ink text-ink hover:bg-ink hover:text-bg disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink",
  ghost:
    "text-ink-muted hover:text-ink disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold",
  md: "px-4 py-2.5 text-sm font-semibold",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base = "rounded-md transition-colors";
  return (
    <button
      className={`${base} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
