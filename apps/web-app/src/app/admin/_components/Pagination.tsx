import { ChevronLeft, ChevronRight } from "lucide-react";

const getPageNumbers = (
  currentPage: number,
  totalPages: number,
): (number | string)[] => {
  const pages: (number | string)[] = [];
  const neighborCount = 1;

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - neighborCount);
    const end = Math.min(totalPages - 1, currentPage + neighborCount);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
};

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "items",
}: PaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50 text-xs">
      <span className="text-muted-foreground font-semibold">
        Showing {(page - 1) * itemsPerPage + 1} to{" "}
        {Math.min(page * itemsPerPage, totalItems)} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          className="p-1.5 border border-border rounded-lg bg-background hover:bg-surface-low text-foreground disabled:opacity-40 disabled:hover:bg-background disabled:hover:border-border disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers(page, totalPages).map((pageNumber, idx) => {
          if (pageNumber === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 font-bold text-muted-foreground"
              >
                ...
              </span>
            );
          }
          const isSelected = pageNumber === page;
          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber as number)}
              className={`w-8 h-8 font-bold border rounded-lg transition-all active:scale-95 duration-150 ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                  : "border-border bg-background hover:bg-surface-low text-foreground hover:border-primary/50 hover:-translate-y-0.5"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          className="p-1.5 border border-border rounded-lg bg-background hover:bg-surface-low text-foreground disabled:opacity-40 disabled:hover:bg-background disabled:hover:border-border disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
