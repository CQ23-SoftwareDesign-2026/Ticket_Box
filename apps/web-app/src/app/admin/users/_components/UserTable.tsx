import { Activity } from "lucide-react";
import { type AdminUserListItem } from "@/services/admin-user.service";
import { StatusBadge } from "../../_components/StatusBadge";
import { Pagination } from "../../_components/Pagination";

const ROLE_CLASSES: Record<string, string> = {
  Admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Checker: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Organizer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Audience: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface UserTableProps {
  users: AdminUserListItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
  onViewDetail: (id: string) => void;
}

export function UserTable({
  users,
  isLoading,
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  onViewDetail,
}: UserTableProps) {
  return (
    <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Danh sách tài khoản
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="font-body text-xs">
                Đang tải danh sách người dùng...
              </span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground font-body text-sm border border-border/50 rounded-xl bg-background/20">
            Không tìm thấy người dùng nào khớp bộ lọc.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50 font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 rounded-tl-xl">Người dùng</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4 text-center">Đơn hàng</th>
                <th className="p-4 text-center">Vé đã mua</th>
                <th className="p-4">Ngày tham gia</th>
                <th className="p-4 text-center rounded-tr-xl">Thao tác</th>
              </tr>
            </thead>
            <tbody className="font-body text-xs divide-y divide-border/50">
              {users.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-surface-high/20 transition-colors"
                >
                  <td className="p-4 font-semibold text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {item.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground leading-tight">
                          {item.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                          {item.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <StatusBadge status={item.status} variant="user" />
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((r) => (
                        <span
                          key={r}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ROLE_CLASSES[r] ?? "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-4 text-center font-bold text-foreground font-mono">
                    {item.order_count.toLocaleString("vi-VN")}
                  </td>

                  <td className="p-4 text-center font-bold text-foreground font-mono">
                    {item.ticket_count.toLocaleString("vi-VN")}
                  </td>

                  <td className="p-4 text-muted-foreground font-semibold">
                    {new Date(item.created_at).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => onViewDetail(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary hover:bg-primary hover:text-white font-body text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200 cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && (totalPages > 1 || totalItems > 0) && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          itemLabel="tài khoản"
        />
      )}
    </section>
  );
}
