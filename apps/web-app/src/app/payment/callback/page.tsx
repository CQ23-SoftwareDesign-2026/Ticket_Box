"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteShell, Button } from "@/components/common";
import {
  getOrderById,
  getOrders,
  type OrderDetail,
} from "@/services/order.service";
import { formatConcertCurrency } from "@/services/concert.service";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

// Hashing function matching backend to map orderCode back to orderId
function generateOrderCode(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function CallbackContent() {
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const cancel = searchParams.get("cancel") === "true";
  const orderCodeParam = searchParams.get("orderCode");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function resolveAndVerifyOrder() {
      try {
        let resolvedOrderId = window.sessionStorage.getItem(
          "last_checkout_order_id",
        );

        // Validate sessionStorage orderId against orderCode if orderCode is present
        if (resolvedOrderId && orderCodeParam) {
          const expectedCode = generateOrderCode(resolvedOrderId);
          if (expectedCode !== Number(orderCodeParam)) {
            resolvedOrderId = null; // Session mismatch, fallback to history search
          }
        }

        // Fallback to history search if sessionStorage is missing/mismatched
        if (!resolvedOrderId && orderCodeParam) {
          const history = await getOrders(1, 20);
          const matched = history.data.find(
            (o) => generateOrderCode(o.id) === Number(orderCodeParam),
          );
          if (matched) {
            resolvedOrderId = matched.id;
          }
        }

        if (!resolvedOrderId) {
          if (active) {
            setError("Không tìm thấy thông tin chi tiết của giao dịch này.");
            setLoading(false);
          }
          return;
        }

        // Fetch the order status
        const orderData = await getOrderById(resolvedOrderId);
        if (!orderData) {
          throw new Error("Không tìm thấy đơn hàng");
        }

        // If transaction is marked success in query parameters but PENDING in backend, poll for webhook completion
        const isQuerySuccess = code === "00" && !cancel;
        if (
          orderData.status === "PENDING" &&
          isQuerySuccess &&
          pollingCount < 5
        ) {
          setTimeout(() => {
            if (active) setPollingCount((prev) => prev + 1);
          }, 2000);
          return;
        }

        if (active) {
          setOrder(orderData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error verifying payment callback:", err);
        if (active) {
          setError(
            "Không thể xác nhận trạng thái đơn hàng. Vui lòng kiểm tra kết nối mạng của bạn.",
          );
          setLoading(false);
        }
      }
    }

    resolveAndVerifyOrder();

    return () => {
      active = false;
    };
  }, [code, cancel, orderCodeParam, pollingCount]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center space-y-4 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="font-display text-2xl font-bold text-on-surface">
          Đang xác thực giao dịch
        </h2>
        <p className="text-sm text-on-surface-variant/80 max-w-sm">
          Vui lòng chờ trong giây lát để chúng tôi kết nối an toàn và xác minh
          trạng thái thanh toán từ hệ thống.
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-on-surface">
          Lỗi xác thực giao dịch
        </h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant/80">
          {error || "Đã xảy ra lỗi không xác định khi tải dữ liệu đơn hàng."}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button href="/my-tickets" className="w-full justify-center py-3">
            Đi tới lịch sử đặt vé
          </Button>
          <Button
            href="/"
            variant="soft"
            className="w-full justify-center py-3"
          >
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  const isSuccess = order.status === "PAID";

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface/20 p-6 shadow-xl sm:p-8 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="mt-6 font-display text-3xl font-black text-on-surface">
              Thanh toán thành công!
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant/80">
              Vé của bạn đã sẵn sàng và được xác nhận. Chúng tôi đã xử lý thành
              công giao dịch thanh toán của bạn.
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-b border-slate-700 py-6">
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-on-surface-variant/85">Sự kiện</span>
              <span className="font-semibold text-on-surface text-right">
                {order.concert_name}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant/85">Tổng tiền</span>
              <span className="font-bold text-primary">
                {formatConcertCurrency(Number(order.total_amount))}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant/85">Số lượng vé</span>
              <span className="font-semibold text-on-surface">
                {order.ticket_count} vé
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              href={`/orders/${order.id}`}
              className="w-full justify-center py-3"
            >
              Xem vé & mã QR
            </Button>
            <Button
              href="/my-tickets"
              variant="soft"
              className="w-full justify-center py-3"
            >
              Lịch sử đặt vé
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Failure or Cancelled Screen
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface/20 p-6 shadow-xl sm:p-8 backdrop-blur-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle size={28} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-black text-on-surface">
            Thanh toán đã hủy
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant/80">
            Giao dịch thanh toán của bạn đã bị hủy hoặc không thành công. Bạn
            chưa bị trừ tiền cho đơn hàng này.
          </p>
        </div>

        <div className="mt-8 space-y-4 border-t border-b border-slate-700 py-6">
          <div className="flex justify-between items-center text-sm gap-4">
            <span className="text-on-surface-variant/85">Sự kiện</span>
            <span className="font-semibold text-on-surface text-right">
              {order.concert_name}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant/85">Tổng tiền</span>
            <span className="font-bold text-on-surface">
              {formatConcertCurrency(Number(order.total_amount))}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant/85">Trạng thái</span>
            <span className="font-bold text-rose-500 uppercase tracking-wider text-xs">
              Chờ thanh toán
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            href={`/checkout/${order.id}`}
            className="w-full justify-center py-3"
          >
            Thử thanh toán lại
          </Button>
          <Button
            href="/"
            variant="soft"
            className="w-full justify-center py-3"
          >
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <SiteShell active="/">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center space-y-4 px-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">
                Đang tải thông tin kết quả giao dịch
              </h2>
            </div>
          }
        >
          <CallbackContent />
        </Suspense>
      </section>
    </SiteShell>
  );
}
