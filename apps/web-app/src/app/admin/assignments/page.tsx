"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  createCheckerAssignment,
  deleteCheckerAssignment,
  getAssignmentCheckers,
  getAssignmentConcerts,
  getAvailableAssignmentGates,
  getCheckerAssignments,
  updateCheckerAssignment,
} from "@/services/checker-assignment.service";
import type {
  ActiveCheckerOption,
  ActiveConcertOption,
  CheckerAssignmentItem,
  PaginationMeta,
} from "@/types/checker-assignment.types";
import { getErrorMessage } from "@/utils/error.utils";
import { Pagination } from "../_components/Pagination";
import { useToast } from "@/context/ToastContext";

const DEFAULT_META: PaginationMeta = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 10,
  totalPages: 0,
  currentPage: 1,
};

function formatConcertTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

interface AssignmentModalProps {
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function AssignmentModal({
  title,
  description,
  isOpen,
  onClose,
  children,
}: AssignmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-low/50 px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground font-body">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg hover:bg-surface-high p-1.5 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4 relative z-10">
        <div className="space-y-2 font-body text-xs">
          <h3 className="font-display text-base font-bold text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-surface-low cursor-pointer active:scale-95"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 hover:shadow-lg hover:shadow-rose-600/20"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  tint: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md ${tint}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background ${tone}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const {
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
  } = useToast();

  const [assignments, setAssignments] = useState<CheckerAssignmentItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [concerts, setConcerts] = useState<ActiveConcertOption[]>([]);
  const [checkers, setCheckers] = useState<ActiveCheckerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [concertFilter, setConcertFilter] = useState("");
  const [checkerFilter, setCheckerFilter] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCreateGates, setIsLoadingCreateGates] = useState(false);
  const [createGates, setCreateGates] = useState<number[]>([]);
  const [createConcertId, setCreateConcertId] = useState("");
  const [createCheckerId, setCreateCheckerId] = useState("");
  const [createGateNumber, setCreateGateNumber] = useState("");

  const [editTarget, setEditTarget] = useState<CheckerAssignmentItem | null>(
    null,
  );
  const [editGateNumber, setEditGateNumber] = useState("");
  const [editGates, setEditGates] = useState<number[]>([]);
  const [isLoadingEditGates, setIsLoadingEditGates] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CheckerAssignmentItem | null>(null);

  const concertMap = useMemo(
    () => new Map(concerts.map((concert) => [concert.id, concert])),
    [concerts],
  );

  const selectedConcertForCreate = createConcertId
    ? concertMap.get(createConcertId)
    : null;

  const summaryItems = [
    {
      label: "Tổng phân công",
      value: meta.totalItems.toString(),
      icon: ClipboardCheck,
      tone: "text-primary",
      tint: "bg-primary/5",
    },
    {
      label: "Tổng số sự kiện",
      value: concerts.length.toString(),
      icon: CalendarDays,
      tone: "text-amber-400",
      tint: "bg-amber-500/5",
    },
    {
      label: "Nhân viên soát vé",
      value: checkers.length.toString(),
      icon: UserRound,
      tone: "text-emerald-400",
      tint: "bg-emerald-500/5",
    },
    {
      label: "Kết quả lọc",
      value: meta.itemCount.toString(),
      icon: ShieldCheck,
      tone: "text-sky-400",
      tint: "bg-sky-500/5",
    },
  ];

  const loadBootstrapData = useCallback(async () => {
    const [concertData, checkerData] = await Promise.all([
      getAssignmentConcerts(),
      getAssignmentCheckers(),
    ]);

    return { concertData, checkerData };
  }, []);

  const loadAssignments = useCallback(
    async (
      nextPage: number,
      nextLimit: number,
      nextConcertFilter: string,
      nextCheckerFilter: string,
    ) => {
      return getCheckerAssignments({
        page: nextPage,
        limit: nextLimit,
        concert_id: nextConcertFilter || undefined,
        checker_id: nextCheckerFilter || undefined,
      });
    },
    [],
  );

  // Bootstrap Page Data
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setBootstrapping(true);
      try {
        const { concertData, checkerData } = await loadBootstrapData();
        if (!active) return;
        setConcerts(concertData);
        setCheckers(checkerData);
      } catch (error: unknown) {
        if (!active) return;
        toastError(getErrorMessage(error));
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loadBootstrapData, toastError]);

  // Load Paginated Assignments List
  useEffect(() => {
    let active = true;

    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const response = await loadAssignments(
          page,
          limit,
          concertFilter,
          checkerFilter,
        );

        if (!active) return;

        setAssignments(response.data);
        setMeta(response.meta);
      } catch (error: unknown) {
        if (!active) return;
        setAssignments([]);
        setMeta(DEFAULT_META);
        toastError(getErrorMessage(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchAssignments();

    return () => {
      active = false;
    };
  }, [page, limit, concertFilter, checkerFilter, loadAssignments, toastError]);

  const resetCreateForm = () => {
    setCreateConcertId("");
    setCreateCheckerId("");
    setCreateGateNumber("");
    setCreateGates([]);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const handleConcertChangeForCreate = async (concertId: string) => {
    setCreateConcertId(concertId);
    setCreateGateNumber("");
    setCreateGates([]);

    if (!concertId) return;

    setIsLoadingCreateGates(true);
    try {
      const gates = await getAvailableAssignmentGates(concertId);
      setCreateGates(gates);
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setIsLoadingCreateGates(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createConcertId || !createCheckerId || !createGateNumber) {
      toastWarning("Vui lòng chọn đầy đủ sự kiện, nhân viên soát vé và cổng.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCheckerAssignment({
        concert_id: createConcertId,
        checker_id: createCheckerId,
        gate_number: Number(createGateNumber),
      });

      setIsCreateOpen(false);
      resetCreateForm();
      toastSuccess("Tạo phân công thành công!");
      await loadAssignments(page, limit, concertFilter, checkerFilter);
      await loadBootstrapData();
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = async (assignment: CheckerAssignmentItem) => {
    setEditTarget(assignment);
    setEditGateNumber(String(assignment.gate_number));
    setEditGates([assignment.gate_number]);
    setIsLoadingEditGates(true);

    try {
      const availableGates = await getAvailableAssignmentGates(
        assignment.concert_id,
      );
      const merged = Array.from(
        new Set([assignment.gate_number, ...availableGates]),
      ).sort((a, b) => a - b);
      setEditGates(merged);
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setIsLoadingEditGates(false);
    }
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditGateNumber("");
    setEditGates([]);
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTarget || !editGateNumber) {
      toastWarning("Vui lòng chọn cổng soát vé.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCheckerAssignment(editTarget.id, {
        gate_number: Number(editGateNumber),
      });
      closeEditModal();
      toastSuccess("Cập nhật phân công thành công!");
      await loadAssignments(page, limit, concertFilter, checkerFilter);
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await deleteCheckerAssignment(deleteTarget.id);
      toastSuccess("Hủy phân công soát vé thành công!");
      setDeleteTarget(null);
      await loadAssignments(page, limit, concertFilter, checkerFilter);
      await loadBootstrapData();
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBootstrapData(),
        loadAssignments(page, limit, concertFilter, checkerFilter),
      ]);
      toastSuccess("Làm mới dữ liệu thành công!");
    } catch (error: unknown) {
      toastError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const currentPageAssignments = assignments.map((assignment) => ({
    ...assignment,
    concertDetails: concertMap.get(assignment.concert_id),
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-body text-xs">
      {/* Title Header area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Phân công soát vé
          </h1>
          <p className="text-muted-foreground text-sm">
            Chỉ định nhân viên soát vé phụ trách từng cổng tại các sự kiện.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => void handleRefresh()}
            className="bg-background border border-border hover:bg-surface-low text-foreground font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 duration-200"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 duration-200 hover:shadow-lg hover:shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Thêm phân công
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="flex flex-col gap-2 md:col-span-5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Lọc theo sự kiện
          </span>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300" />
            <select
              value={concertFilter}
              onChange={(e) => {
                setConcertFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary text-xs w-full h-11 transition-all text-foreground cursor-pointer"
            >
              <option value="">Tất cả sự kiện</option>
              {concerts.map((concert) => (
                <option key={concert.id} value={concert.id}>
                  {concert.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:col-span-5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Lọc theo nhân viên soát vé
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-300" />
            <select
              value={checkerFilter}
              onChange={(e) => {
                setCheckerFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary text-xs w-full h-11 transition-all text-foreground cursor-pointer"
            >
              <option value="">Tất cả nhân viên</option>
              {checkers.map((checker) => (
                <option key={checker.id} value={checker.id}>
                  {checker.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setConcertFilter("");
            setCheckerFilter("");
            setPage(1);
          }}
          className="rounded-xl border border-border bg-background hover:bg-surface-low text-foreground font-semibold h-11 transition-all cursor-pointer active:scale-95 md:col-span-2 w-full text-center"
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Main Content Table Card */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-surface-low/30">
          <h2 className="font-display text-base font-bold text-foreground">
            Bảng phân công soát vé
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-low/50 font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                <th className="p-4">Nhân viên</th>
                <th className="p-4">Sự kiện</th>
                <th className="p-4">Cổng phụ trách</th>
                <th className="p-4">Thời gian diễn ra</th>
                <th className="p-4">Ngày tạo</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-body">
              {bootstrapping || loading ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : currentPageAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-low text-primary">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">
                          Không tìm thấy phân công nào
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Nhấn nút {'"Thêm phân công"'} để chỉ định nhân viên
                          soát vé phụ trách cổng.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPageAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-surface-high/10 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-bold text-foreground">
                        {assignment.checker.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {assignment.checker.email}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-foreground">
                        {assignment.concert.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {assignment.concertDetails?.location || "—"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                        <ShieldCheck className="h-3 w-3" />
                        Cổng {assignment.gate_number}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-foreground">
                      {formatConcertTime(assignment.concertDetails?.start_time)}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground font-medium">
                      {formatShortDate(assignment.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleOpenEdit(assignment)}
                          className="bg-primary hover:bg-primary-container text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                        >
                          <Pencil size={11} /> Sửa
                        </button>
                        <button
                          onClick={() => setDeleteTarget(assignment)}
                          disabled={deletingId === assignment.id}
                          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 size={11} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && meta.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-surface-low/30">
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              totalItems={meta.totalItems}
              itemsPerPage={limit}
              onPageChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              itemLabel="lượt phân công"
            />
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <AssignmentModal
        title="Thêm phân công"
        description="Chọn sự kiện, nhân viên soát vé và cổng tương ứng để tạo phân công check-in mới."
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetCreateForm();
        }}
      >
        <form className="space-y-4 text-xs" onSubmit={handleCreateAssignment}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                Sự kiện *
              </span>
              <select
                value={createConcertId}
                onChange={(e) =>
                  void handleConcertChangeForCreate(e.target.value)
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary h-11 cursor-pointer"
              >
                <option value="">Chọn một sự kiện</option>
                {concerts.map((concert) => (
                  <option key={concert.id} value={concert.id}>
                    {concert.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                Nhân viên soát vé *
              </span>
              <select
                value={createCheckerId}
                onChange={(e) => setCreateCheckerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary h-11 cursor-pointer"
              >
                <option value="">Chọn nhân viên</option>
                {checkers.map((checker) => (
                  <option key={checker.id} value={checker.id}>
                    {checker.full_name} ({checker.email})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-low/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-foreground">
                  Cổng soát vé khả dụng
                </p>
                <p className="mt-0.5 text-muted-foreground text-[10px]">
                  {selectedConcertForCreate
                    ? `${selectedConcertForCreate.name} · ${selectedConcertForCreate.location || "Chưa cập nhật địa điểm"}`
                    : "Chọn sự kiện để tải danh sách cổng"}
                </p>
              </div>
              {isLoadingCreateGates && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>

            <div className="mt-4">
              {createConcertId &&
              createGates.length === 0 &&
              !isLoadingCreateGates ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300 font-medium">
                  Không có cổng soát vé khả dụng cho sự kiện này.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {createGates.map((gate) => {
                    const isSelected = createGateNumber === String(gate);
                    return (
                      <button
                        key={gate}
                        type="button"
                        onClick={() => setCreateGateNumber(String(gate))}
                        className={`border px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-surface-low"
                        }`}
                      >
                        Cổng {gate}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="bg-background hover:bg-surface-low border border-border text-foreground font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Tạo phân công
            </button>
          </div>
        </form>
      </AssignmentModal>

      {/* EDIT MODAL */}
      <AssignmentModal
        title="Sửa cổng phân công"
        description="Thay đổi cổng soát vé phụ trách của nhân viên soát vé đã chọn."
        isOpen={Boolean(editTarget)}
        onClose={closeEditModal}
      >
        <form className="space-y-4 text-xs" onSubmit={handleEditAssignment}>
          {editTarget && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-low/50 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nhân viên soát vé
                </p>
                <p className="mt-1 font-bold text-foreground text-sm">
                  {editTarget.checker.full_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {editTarget.checker.email}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-low/50 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Sự kiện
                </p>
                <p className="mt-1 font-bold text-foreground text-sm">
                  {editTarget.concert.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {concertMap.get(editTarget.concert_id)?.location || "—"}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface-low/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-foreground">
                  Thay đổi cổng phụ trách
                </p>
                <p className="mt-0.5 text-muted-foreground text-[10px]">
                  Cổng hiện tại vẫn có thể được chọn để giữ nguyên phân công
                  hoặc di chuyển sang cổng trống khác.
                </p>
              </div>
              {isLoadingEditGates && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {editGates.map((gate) => {
                const isSelected = editGateNumber === String(gate);
                return (
                  <button
                    key={gate}
                    type="button"
                    onClick={() => setEditGateNumber(String(gate))}
                    className={`border px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-surface-low"
                    }`}
                  >
                    Cổng {gate}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-border mt-6">
            <button
              type="button"
              onClick={closeEditModal}
              className="bg-background hover:bg-surface-low border border-border text-foreground font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </AssignmentModal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hủy phân công"
        message={
          deleteTarget
            ? `Bạn có chắc chắn muốn hủy phân công nhân viên soát vé ${deleteTarget.checker.full_name} phụ trách Cổng ${deleteTarget.gate_number} tại sự kiện ${deleteTarget.concert.name}?`
            : ""
        }
        isDeleting={deletingId === deleteTarget?.id}
      />
    </div>
  );
}
