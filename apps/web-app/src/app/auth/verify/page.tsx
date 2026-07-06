import { Suspense } from "react";
import VerifyClient from "@/app/verify/VerifyClient";

export default function AuthVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="rounded-3xl border border-outline-variant/40 bg-surface/20 p-6 flex items-center gap-4 shadow-2xl backdrop-blur-lg">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-semibold text-on-surface-variant">Đang tải trang xác thực...</p>
          </div>
        </div>
      }
    >
      <VerifyClient />
    </Suspense>
  );
}
