"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Users,
  Settings,
  Plus,
  HelpCircle,
  Menu,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col h-screen p-4 gap-4 w-64 bg-surface border-r border-border shrink-0 sticky top-0 z-40">
        <div className="mb-8 px-2 mt-2">
          <Link href="/">
            <h1 className="font-display text-2xl text-primary font-black italic">
              TicketBox Admin
            </h1>
            <p className="font-body text-xs font-semibold text-muted-foreground">
              Management Suite
            </p>
          </Link>
        </div>
        <Link
          href="/admin/create-event"
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-body text-xs font-semibold py-3 px-4 rounded-lg w-full flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
        <ul className="flex flex-col gap-1 mt-6 flex-grow">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary-container text-primary-foreground scale-[0.98] shadow-sm"
                      : "text-muted-foreground hover:bg-surface-high hover:text-primary"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <ul className="flex flex-col gap-1 mt-auto border-t border-border pt-4">
          <li>
            <Link
              href="/support"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-surface-high rounded-lg font-body text-sm font-semibold transition-all hover:text-primary"
            >
              <HelpCircle className="w-5 h-5" />
              Help Center
            </Link>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-10 bg-surface sticky top-0 z-30 border-b border-border shadow-sm">
          {/* Mobile Menu Toggle (Decorative for now, relying on bottom nav for mobile) */}
          <button className="md:hidden text-muted-foreground p-2">
            <Menu className="w-6 h-6" />
          </button>

          <h2 className="font-display text-2xl font-semibold text-foreground hidden md:block">
            {navItems.find((item) => pathname?.startsWith(item.href))?.label ||
              "Admin Portal"}
          </h2>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-high">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-surface"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container text-primary-foreground flex items-center justify-center font-bold text-sm overflow-hidden ring-2 ring-transparent hover:ring-primary transition-all cursor-pointer">
              {user?.fullName?.charAt(0).toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-10 flex-grow max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 pb-safe px-4 shadow-[0px_-4px_20px_rgba(15,23,42,0.08)] bg-surface border-t border-border">
        {navItems.slice(0, 4).map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center font-body text-[10px] font-semibold transition-all duration-150 w-full h-full ${
                isActive
                  ? "text-primary scale-90"
                  : "text-muted-foreground hover:bg-surface-low"
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Floating Action Button (FAB) for Mobile */}
      <Link
        href="/admin/create-event"
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </div>
  );
}
