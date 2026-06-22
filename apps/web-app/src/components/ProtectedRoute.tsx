"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRoleAllowed =
    !allowedRoles || allowedRoles.length === 0
      ? true
      : (user?.roles?.some((role) => allowedRoles.includes(role)) ?? false);
  const isAuthorized = !isLoading && isAuthenticated && isRoleAllowed;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Not logged in, redirect to login with return url
      router.push(`/login?returnUrl=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      // Check if user has required role
      const hasRole = user?.roles?.some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        // Logged in but missing role, redirect to access denied
        router.push("/access-denied");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, allowedRoles]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}
