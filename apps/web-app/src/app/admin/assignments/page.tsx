"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
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

const DEFAULT_META: PaginationMeta = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 10,
  totalPages: 0,
  currentPage: 1,
};

function formatConcertTime(value?: string) {
  if (!value) {
    return "Time unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-surface-high bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-4 border-b border-surface-high bg-surface-low px-6 py-5">
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-surface-high bg-surface px-3 py-3 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
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
      className={`rounded-lg border border-surface-high/70 bg-surface-low shadow-[0_14px_34px_rgba(0,0,0,0.18)] ${tint}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}
            >
              {label}
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-foreground">
              {value}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md border border-surface-high bg-surface ${tone}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<CheckerAssignmentItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [concerts, setConcerts] = useState<ActiveConcertOption[]>([]);
  const [checkers, setCheckers] = useState<ActiveCheckerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [page, setPage] = useState(1);
  const [concertFilter, setConcertFilter] = useState("");
  const [checkerFilter, setCheckerFilter] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCreateGates, setIsLoadingCreateGates] = useState(false);
  const [createGates, setCreateGates] = useState<number[]>([]);
  const [createConcertId, setCreateConcertId] = useState("");
  const [createCheckerId, setCreateCheckerId] = useState("");
  const [createGateNumber, setCreateGateNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<CheckerAssignmentItem | null>(
    null,
  );
  const [editGateNumber, setEditGateNumber] = useState("");
  const [editGates, setEditGates] = useState<number[]>([]);
  const [isLoadingEditGates, setIsLoadingEditGates] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const concertMap = useMemo(
    () => new Map(concerts.map((concert) => [concert.id, concert])),
    [concerts],
  );

  const selectedConcertForCreate = createConcertId
    ? concertMap.get(createConcertId)
    : null;

  const summaryItems = [
    {
      label: "Total Assignments",
      value: meta.totalItems.toString(),
      icon: ClipboardCheck,
      tone: "text-primary",
      tint: "bg-primary/5",
    },
    {
      label: "Published Concerts",
      value: concerts.length.toString(),
      icon: CalendarDays,
      tone: "text-amber-300",
      tint: "bg-amber-500/5",
    },
    {
      label: "Active Checkers",
      value: checkers.length.toString(),
      icon: UserRound,
      tone: "text-emerald-300",
      tint: "bg-emerald-500/5",
    },
    {
      label: "Filtered Results",
      value: meta.itemCount.toString(),
      icon: ShieldCheck,
      tone: "text-sky-300",
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
      nextConcertFilter: string,
      nextCheckerFilter: string,
    ) => {
      return getCheckerAssignments({
        page: nextPage,
        limit: 10,
        concert_id: nextConcertFilter || undefined,
        checker_id: nextCheckerFilter || undefined,
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setBootstrapping(true);
      setGlobalError(null);

      try {
        const { concertData, checkerData } = await loadBootstrapData();

        if (!active) {
          return;
        }

        setConcerts(concertData);
        setCheckers(checkerData);
      } catch (error) {
        if (!active) {
          return;
        }

        setGlobalError(getErrorMessage(error));
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
  }, [loadBootstrapData]);

  useEffect(() => {
    let active = true;

    const fetchAssignments = async () => {
      setLoading(true);
      setGlobalError(null);

      try {
        const response = await loadAssignments(
          page,
          concertFilter,
          checkerFilter,
        );

        if (!active) {
          return;
        }

        setAssignments(response.data);
        setMeta(response.meta);
      } catch (error) {
        if (!active) {
          return;
        }

        setAssignments([]);
        setMeta(DEFAULT_META);
        setGlobalError(getErrorMessage(error));
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
  }, [page, concertFilter, checkerFilter, loadAssignments]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const resetCreateForm = () => {
    setCreateConcertId("");
    setCreateCheckerId("");
    setCreateGateNumber("");
    setCreateGates([]);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const handleConcertChangeForCreate = async (concertId: string) => {
    setCreateConcertId(concertId);
    setCreateGateNumber("");
    setCreateGates([]);
    setFormError(null);

    if (!concertId) {
      return;
    }

    setIsLoadingCreateGates(true);
    try {
      const gates = await getAvailableAssignmentGates(concertId);
      setCreateGates(gates);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsLoadingCreateGates(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createConcertId || !createCheckerId || !createGateNumber) {
      setFormError("Please choose a concert, checker, and gate.");
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
      setFeedback("Assignment created successfully.");
      await loadAssignments(page, concertFilter, checkerFilter);
      await loadBootstrapData();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = async (assignment: CheckerAssignmentItem) => {
    setEditTarget(assignment);
    setEditGateNumber(String(assignment.gate_number));
    setEditGates([assignment.gate_number]);
    setFormError(null);
    setIsLoadingEditGates(true);

    try {
      const availableGates = await getAvailableAssignmentGates(
        assignment.concert_id,
      );
      const merged = Array.from(
        new Set([assignment.gate_number, ...availableGates]),
      ).sort((a, b) => a - b);
      setEditGates(merged);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsLoadingEditGates(false);
    }
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditGateNumber("");
    setEditGates([]);
    setFormError(null);
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTarget || !editGateNumber) {
      setFormError("Please choose a gate for this assignment.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateCheckerAssignment(editTarget.id, {
        gate_number: Number(editGateNumber),
      });
      closeEditModal();
      setFeedback("Assignment updated successfully.");
      await loadAssignments(page, concertFilter, checkerFilter);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignment: CheckerAssignmentItem) => {
    if (
      !window.confirm(
        `Remove ${assignment.checker.full_name} from Gate ${assignment.gate_number} for ${assignment.concert.name}?`,
      )
    ) {
      return;
    }

    setDeletingId(assignment.id);
    setGlobalError(null);

    try {
      await deleteCheckerAssignment(assignment.id);
      setFeedback("Assignment removed successfully.");
      await loadAssignments(page, concertFilter, checkerFilter);
      await loadBootstrapData();
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadBootstrapData(),
      loadAssignments(page, concertFilter, checkerFilter),
    ]);
  };

  const currentPageAssignments = assignments.map((assignment) => ({
    ...assignment,
    concertDetails: concertMap.get(assignment.concert_id),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-surface-high/70 bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <div className="rounded-t-lg border-b border-surface-high/70 bg-surface-low px-6 py-5 md:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                Check-in Assignment Control
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  Checker assignments
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleRefresh()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-surface-high bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Create assignment
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-surface p-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <SummaryCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      {globalError ? (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{globalError}</p>
        </div>
      ) : null}

      {feedback ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{feedback}</p>
        </div>
      ) : null}

      <section className="rounded-lg border border-surface-high/70 bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
        <div className="rounded-t-lg border-b border-surface-high/70 bg-surface-low px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center h-12">
              <p className="text-[20px] font-semibold uppercase tracking-[0.18em]">
                Filters
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:min-w-[760px] xl:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Concert
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <select
                    value={concertFilter}
                    onChange={(e) => {
                      setConcertFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-md border border-surface-high bg-surface py-3 pl-10 pr-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="">All published concerts</option>
                    {concerts.map((concert) => (
                      <option key={concert.id} value={concert.id}>
                        {concert.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Checker
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300" />
                  <select
                    value={checkerFilter}
                    onChange={(e) => {
                      setCheckerFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-md border border-surface-high bg-surface py-3 pl-10 pr-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="">All active checkers</option>
                    {checkers.map((checker) => (
                      <option key={checker.id} value={checker.id}>
                        {checker.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <button
                onClick={() => {
                  setConcertFilter("");
                  setCheckerFilter("");
                  setPage(1);
                }}
                className="rounded-md border border-surface-high bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-surface p-4 md:grid-cols-3">
          <div className="rounded-lg border border-surface-high/70 bg-surface-low px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
              Concerts loaded
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {concerts.length} available
            </p>
          </div>
          <div className="rounded-lg border border-surface-high/70 bg-surface-low px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Checkers loaded
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {checkers.length} active
            </p>
          </div>
          <div className="rounded-lg border border-surface-high/70 bg-surface-low px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Current page
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {meta.currentPage || 1} / {Math.max(meta.totalPages, 1)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-surface-high/70 bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
        <div className="rounded-t-lg border-b border-surface-high/70 bg-surface-low px-6 py-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Assignment Registry
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                Current checker coverage
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {meta.totalItems} total assignment(s)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-high bg-surface-low">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Checker
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Concert
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Gate
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Schedule
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bootstrapping || loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="h-7 w-7 animate-spin border-2 border-primary border-t-transparent" />
                      <p className="text-sm font-medium">
                        Loading assignments...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : currentPageAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto max-w-md space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-surface-high bg-surface-low text-primary">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        No assignments found
                      </h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Create the first assignment to define which checker is
                        responsible for which gate.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPageAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="transition-colors hover:bg-surface-high/35"
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {assignment.checker.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.checker.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {assignment.concert.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.concertDetails?.location ||
                            "Location unavailable"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/12 px-3 py-1.5 text-sm font-bold text-amber-300">
                        <ShieldCheck className="h-4 w-4" />
                        Gate {assignment.gate_number}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-foreground">
                        {formatConcertTime(
                          assignment.concertDetails?.start_time,
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-foreground">
                        {formatShortDate(assignment.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleOpenEdit(assignment)}
                          className="inline-flex items-center gap-2 rounded-md border border-surface-high bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(assignment)}
                          disabled={deletingId === assignment.id}
                          className="inline-flex items-center gap-2 rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deletingId === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && meta.totalPages > 1 ? (
          <div className="flex flex-col gap-4 border-t border-surface-high/70 bg-surface-low px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {meta.currentPage} of {meta.totalPages}.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="rounded-md border border-surface-high bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, meta.totalPages))
                }
                disabled={page >= meta.totalPages}
                className="rounded-md border border-surface-high bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <AssignmentModal
        title="Create assignment"
        description="Select the concert, checker, and available gate to create a new check-in scope."
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetCreateForm();
        }}
      >
        <form className="space-y-5" onSubmit={handleCreateAssignment}>
          {formError ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{formError}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">
                Concert
              </span>
              <select
                value={createConcertId}
                onChange={(e) =>
                  void handleConcertChangeForCreate(e.target.value)
                }
                className="w-full rounded-md border border-surface-high bg-surface-low px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Select a concert</option>
                {concerts.map((concert) => (
                  <option key={concert.id} value={concert.id}>
                    {concert.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">
                Checker
              </span>
              <select
                value={createCheckerId}
                onChange={(e) => setCreateCheckerId(e.target.value)}
                className="w-full rounded-md border border-surface-high bg-surface-low px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Select a checker</option>
                {checkers.map((checker) => (
                  <option key={checker.id} value={checker.id}>
                    {checker.full_name} - {checker.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-surface-high/70 bg-surface-low px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Available gates
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {selectedConcertForCreate
                    ? `${selectedConcertForCreate.name} · ${selectedConcertForCreate.location}`
                    : "Select a concert first to load its open gates."}
                </p>
              </div>
              {isLoadingCreateGates ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : null}
            </div>

            <div className="mt-4">
              {createConcertId &&
              createGates.length === 0 &&
              !isLoadingCreateGates ? (
                <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
                  No open gates are available for this concert right now.
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {createGates.map((gate) => {
                    const isSelected = createGateNumber === String(gate);
                    return (
                      <button
                        key={gate}
                        type="button"
                        onClick={() => setCreateGateNumber(String(gate))}
                        className={`border px-4 py-3 text-sm font-semibold transition-all ${
                          isSelected
                            ? "rounded-md border-primary bg-primary text-primary-foreground"
                            : "rounded-md border-surface-high bg-surface text-foreground hover:border-primary/35 hover:bg-surface-high"
                        }`}
                      >
                        Gate {gate}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="rounded-md border border-surface-high bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create assignment
            </button>
          </div>
        </form>
      </AssignmentModal>

      <AssignmentModal
        title="Edit assigned gate"
        description="Move the selected checker to another available gate in the same concert."
        isOpen={Boolean(editTarget)}
        onClose={closeEditModal}
      >
        <form className="space-y-5" onSubmit={handleEditAssignment}>
          {formError ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{formError}</p>
            </div>
          ) : null}

          {editTarget ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-surface-high/70 bg-surface-low px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Checker
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {editTarget.checker.full_name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editTarget.checker.email}
                </p>
              </div>

              <div className="rounded-lg border border-surface-high/70 bg-surface-low px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Concert
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {editTarget.concert.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {concertMap.get(editTarget.concert_id)?.location ||
                    "Location unavailable"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-surface-high/70 bg-surface-low px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Reassign gate
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The current gate stays selectable, so you can keep it or move
                  this checker elsewhere.
                </p>
              </div>
              {isLoadingEditGates ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {editGates.map((gate) => {
                const isSelected = editGateNumber === String(gate);
                return (
                  <button
                    key={gate}
                    type="button"
                    onClick={() => setEditGateNumber(String(gate))}
                    className={`border px-4 py-3 text-sm font-semibold transition-all ${
                      isSelected
                        ? "rounded-md border-primary bg-primary text-primary-foreground"
                        : "rounded-md border-surface-high bg-surface text-foreground hover:border-primary/35 hover:bg-surface-high"
                    }`}
                  >
                    Gate {gate}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-md border border-surface-high bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              Save gate
            </button>
          </div>
        </form>
      </AssignmentModal>
    </div>
  );
}
