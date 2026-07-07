"use client";

interface RevenueFilterBarProps {
  tempFromDate: string;
  tempToDate: string;
  tempGroupBy: "day" | "week" | "month";
  fromDateRef: React.RefObject<HTMLInputElement | null>;
  toDateRef: React.RefObject<HTMLInputElement | null>;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onGroupByChange: (v: "day" | "week" | "month") => void;
  onApply: () => void;
  onReset: () => void;
}

export function RevenueFilterBar({
  tempFromDate,
  tempToDate,
  tempGroupBy,
  fromDateRef,
  toDateRef,
  onFromDateChange,
  onToDateChange,
  onGroupByChange,
  onApply,
  onReset,
}: RevenueFilterBarProps) {
  return (
    <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        {/* Date Range */}
        <div className="flex flex-col gap-2 md:col-span-5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Khoảng thời gian
          </span>
          <div
            onClick={() => fromDateRef.current?.showPicker()}
            className="flex items-center justify-start gap-1 bg-background border border-border rounded-xl px-2.5 py-2 text-sm text-foreground hover:border-primary/50 transition-colors h-11 w-full cursor-pointer"
          >
            <input
              ref={fromDateRef}
              type="date"
              value={tempFromDate}
              onClick={(e) => {
                e.stopPropagation();
                fromDateRef.current?.showPicker();
              }}
              onChange={(e) => onFromDateChange(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-transparent text-foreground focus:outline-none w-[110px] min-w-0 font-body text-xs cursor-pointer text-center px-1"
            />
            <span className="text-muted-foreground font-semibold shrink-0 select-none">
              →
            </span>
            <input
              ref={toDateRef}
              type="date"
              value={tempToDate}
              onClick={(e) => {
                e.stopPropagation();
                toDateRef.current?.showPicker();
              }}
              onChange={(e) => onToDateChange(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-transparent text-foreground focus:outline-none w-[110px] min-w-0 font-body text-xs cursor-pointer text-center px-1"
            />
          </div>
        </div>

        {/* Group By */}
        <div className="flex flex-col gap-2 md:col-span-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Nhóm theo
          </span>
          <select
            value={tempGroupBy}
            onChange={(e) =>
              onGroupByChange(e.target.value as "day" | "week" | "month")
            }
            className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full h-11 transition-all cursor-pointer"
          >
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end h-11 md:col-span-4">
          <button
            onClick={onReset}
            className="flex-1 bg-background hover:bg-surface-low border border-border text-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:border-foreground/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
          >
            Đặt lại
          </button>
          <button
            onClick={onApply}
            className="flex-1 bg-primary hover:bg-primary-container text-white font-body text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </section>
  );
}
