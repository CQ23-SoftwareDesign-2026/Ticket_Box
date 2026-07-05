type StatusBadgeVariant = "user" | "concert" | "order";

interface StatusBadgeProps {
  status: string;
  variant?: StatusBadgeVariant;
  size?: "xs" | "sm";
}

const userStatusClasses: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  INACTIVE: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  BANNED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const concertStatusClasses: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const orderStatusClasses: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function StatusBadge({
  status,
  variant = "user",
  size = "xs",
}: StatusBadgeProps) {
  const map =
    variant === "concert"
      ? concertStatusClasses
      : variant === "order"
        ? orderStatusClasses
        : userStatusClasses;

  const colorClass =
    map[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  const sizeClass =
    size === "xs" ? "text-[9px] px-2 py-0.5" : "text-[8px] px-1.5 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-body font-bold border uppercase tracking-wider ${sizeClass} ${colorClass}`}
    >
      {status}
    </span>
  );
}
