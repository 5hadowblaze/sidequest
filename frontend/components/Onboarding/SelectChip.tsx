"use client";

interface SelectChipProps {
  label: string;
  emoji?: string;
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SelectChip({
  label,
  emoji,
  active,
  onClick,
  size = "md",
  className = "",
}: SelectChipProps) {
  const sizeClass =
    size === "lg"
      ? "px-5 py-3 text-base"
      : size === "sm"
        ? "px-3 py-1.5 text-xs"
        : "px-4 py-2.5 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`onboarding-chip btn-press inline-flex items-center gap-2 rounded-full border font-medium transition ${
        active
          ? "onboarding-chip--active animate-chip-pop border-purple bg-purple text-white shadow-md"
          : "border-border bg-surface text-foreground hover:border-purple/40 hover:bg-purple-soft/30"
      } ${sizeClass} ${className}`}
    >
      {emoji && (
        <span
          className={`text-base leading-none ${active ? "animate-wiggle-once" : ""}`}
          aria-hidden
        >
          {emoji}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
