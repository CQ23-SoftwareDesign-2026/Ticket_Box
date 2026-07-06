"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Ticket, Home, LogIn } from "lucide-react";
import { Button } from "@/components/common";

export default function AccessDeniedPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  const handleSwitchAccount = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-16 relative overflow-hidden bg-background">
      {/* Decorative ambient security glow in background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[350px] rounded-full bg-rose-500/10 blur-[80px]" />
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-outline-variant/40 bg-surface/30 p-8 text-center shadow-2xl backdrop-blur-lg">
        {/* Shield Icon with glowing ring */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        {/* 403 Status code */}
        <span className="inline-block rounded-full border border-rose-500/20 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">
          Lỗi 403 · Hạn chế truy cập
        </span>

        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
          Không có quyền truy cập
        </h1>

        <p className="mt-4 text-sm text-on-surface-variant/70 leading-relaxed">
          Tài khoản của bạn <span className="font-semibold text-on-surface">{user?.fullName || "hiện tại"}</span> không được phân quyền truy cập trang này. Vui lòng kiểm tra lại đường dẫn hoặc đăng nhập tài khoản khác.
        </p>

        {/* Action button container */}
        <div className="mt-8 flex flex-col gap-3">
          {isAuthenticated ? (
            <>
              <Button href="/my-tickets" className="w-full justify-center gap-2 py-3">
                <Ticket size={16} />
                Xem vé của tôi
              </Button>
              <Button
                variant="soft"
                onClick={handleSwitchAccount}
                className="w-full justify-center gap-2 py-3 cursor-pointer"
              >
                <LogIn size={16} />
                Đăng nhập tài khoản khác
              </Button>
            </>
          ) : (
            <Button href="/login" className="w-full justify-center gap-2 py-3">
              <LogIn size={16} />
              Đăng nhập ngay
            </Button>
          )}

          <Button href="/" variant="soft" className="w-full justify-center gap-2 py-3">
            <Home size={16} />
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    </main>
  );
}
