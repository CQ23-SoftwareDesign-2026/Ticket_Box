import { Users, UserCheck, Shield, ShieldAlert } from "lucide-react";

interface UserStatsCardsProps {
  stats: { total: number; active: number; admin: number; blocked: number };
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Tổng người dùng
          </p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {stats.total}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Tài khoản hoạt động
          </p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {stats.active}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Quản trị viên
          </p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {stats.admin}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Bị khoá / Tạm dừng
          </p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {stats.blocked}
          </p>
        </div>
      </div>
    </div>
  );
}
