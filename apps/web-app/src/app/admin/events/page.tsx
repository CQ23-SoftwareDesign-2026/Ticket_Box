"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getConcerts,
  deleteConcert,
  type ConcertCardItem,
} from "@/services/concert.service";
import {
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  CalendarOff,
  Pencil,
  Eye,
  Trash2,
  Hourglass,
} from "lucide-react";

export default function AdminEventsPage() {
  const [concerts, setConcerts] = useState<ConcertCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchConcerts = async (search = "") => {
    setIsLoading(true);
    try {
      const { items } = await getConcerts({ limit: 50, search });
      setConcerts(items);
    } catch (error) {
      console.error("Failed to load concerts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchConcerts(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the event "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsDeleting(id);
    try {
      await deleteConcert(id);
      // Remove from list
      setConcerts((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete concert", error);
      alert("Failed to delete the event. It might have existing orders.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExport = () => {
    if (concerts.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = ["ID", "Name", "Venue", "City", "Date", "Time", "Status"];
    const csvContent = [
      headers.join(","),
      ...concerts.map((c) =>
        [
          c.id,
          `"${c.title}"`,
          `"${c.venue}"`,
          `"${c.city}"`,
          c.date,
          c.time,
          c.status,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `events_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-1">
            Events Management
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Track, edit, and manage all your upcoming and past ticketed events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-primary border border-border rounded-lg hover:bg-surface-high transition-all font-semibold text-sm"
          >
            <Download className="w-4 h-4" />
            Export List
          </button>
          <Link
            href="/admin/create-event"
            className="flex-1 md:flex-none bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <section className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            placeholder="Search events by name, ID, or location..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select className="flex-1 md:w-40 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option>All Statuses</option>
            <option>PUBLISHED</option>
            <option>COMING_SOON</option>
            <option>COMPLETED</option>
          </select>
          <button className="p-2.5 bg-background border border-border hover:bg-surface-high text-muted-foreground rounded-lg transition-all flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Data Table */}
      <section className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-4 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm font-medium">Loading events...</p>
                    </div>
                  </td>
                </tr>
              ) : concerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CalendarOff className="w-10 h-10 text-border" />
                      <p className="text-sm font-medium">
                        No events found matching your criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                concerts.map((concert) => (
                  <tr
                    key={concert.id}
                    className="hover:bg-surface-high/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg bg-primary/10 overflow-hidden flex-shrink-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA96Q00R_bgOVwdSaXoQUFh4qVfI9j-ywdZH0M0n3UEcHkvg27Hc-IVfeqDv0zY5rITz7LfLg-PsHR9fs9vCYLfdTAr48gFSFvlNJyw4aYMTmFgn4tN5xZElV5qJh_mOyC71TmCRwrv-jb1WAzhPD1I6c0R12LHOwt6JrVxYEjLIbk9nj2yHFMRzZzrZ2Vw_pevGqUI5SmxPE1-MUNxiSPVF38B0OBBXFGSoYc6d9xUgDg0Ex-TwrOwqrqg3paEsKJJvwFVtnwg9sih')`,
                          }}
                        ></div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {concert.title}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {concert.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-body text-sm font-medium text-foreground">
                        {concert.date}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {concert.time}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-foreground">
                      {concert.venue}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                          concert.status === "PUBLISHED"
                            ? "bg-primary/10 text-primary"
                            : concert.status === "COMING_SOON"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-surface-highest text-foreground"
                        }`}
                      >
                        {concert.status === "PUBLISHED" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        )}
                        {concert.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/create-event?edit=${concert.id}`}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Edit Event"
                        >
                          <Pencil className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/concerts/${concert.id}`}
                          target="_blank"
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="View Public Page"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(concert.id, concert.title)
                          }
                          disabled={isDeleting === concert.id}
                          className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-all disabled:opacity-50"
                          title="Delete Event"
                        >
                          {isDeleting === concert.id ? (
                            <Hourglass className="w-5 h-5" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Static UI for now) */}
        {!isLoading && concerts.length > 0 && (
          <div className="px-6 py-4 bg-background flex items-center justify-between border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground">
              Showing {concerts.length} events
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-border rounded-md text-xs font-bold hover:bg-surface-high transition-all disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm">
                1
              </button>
              <button className="px-3 py-1 border border-border rounded-md text-xs font-bold hover:bg-surface-high transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
