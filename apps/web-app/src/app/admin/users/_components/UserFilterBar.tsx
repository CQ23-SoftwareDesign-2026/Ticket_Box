import { Search } from "lucide-react";

interface UserFilterBarProps {
  search: string;
  status: string;
  role: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onRoleChange: (v: string) => void;
}

export function UserFilterBar({
  search,
  status,
  role,
  onSearchChange,
  onStatusChange,
  onRoleChange,
}: UserFilterBarProps) {
  return (
    <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Search */}
        <div className="flex flex-col gap-2 md:col-span-6">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Search Users
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full h-11 transition-all"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-2 md:col-span-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Filter by Status
          </span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full h-11 transition-all cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BANNED">BANNED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        {/* Role filter */}
        <div className="flex flex-col gap-2 md:col-span-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Filter by Role
          </span>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full h-11 transition-all cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Audience">Audience</option>
            <option value="Admin">Admin</option>
            <option value="Checker">Checker</option>
            <option value="Organizer">Organizer</option>
          </select>
        </div>
      </div>
    </section>
  );
}
