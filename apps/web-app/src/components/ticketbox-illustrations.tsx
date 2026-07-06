export function ConcertHeroIllustration() {
  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.25),transparent_40%),linear-gradient(135deg,#090b11_0%,#1e1b4b_50%,#312e81_100%)] p-10 flex flex-col justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]" />
      
      {/* Decorative floating glass shapes */}
      <div className="absolute left-8 top-12 h-24 w-24 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm animate-pulse" />
      <div className="absolute right-12 top-1/4 h-32 w-32 -rotate-12 rounded-[24px] border border-white/5 bg-white/5 shadow-2xl backdrop-blur-md" />

      {/* Top Brand Tagline */}
      <div className="relative z-10">
        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
          Âm Nhạc Đích Thực
        </span>
      </div>

      {/* Main Poster Info */}
      <div className="relative z-10 mt-auto rounded-3xl border border-white/10 bg-black/40 p-8 text-foreground backdrop-blur-lg shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
          TicketBox Concerts
        </p>
        <h2 className="mt-3 font-display text-3xl font-black leading-tight text-white">
          Kết nối bạn với những giai điệu bùng nổ.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant/80">
          Quản lý vé điện tử cá nhân, cập nhật lịch diễn mới nhất và đồng hành cùng thần tượng của bạn trong những đêm nhạc sống động đáng nhớ.
        </p>

        {/* Feature Pill Row */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {[
            "Vé Điện Tử QR",
            "Đặt Chỗ Tức Thì",
            "Bảo Mật Tuyệt Đối",
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-bold text-on-surface-variant/90"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SecurityIllustration() {
  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(135deg,#090b11_0%,#111827_50%,#0f172a_100%)] p-10">
      <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-outline-variant/40 bg-surface/30 backdrop-blur-md p-8 text-foreground shadow-2xl flex flex-col justify-between">
          <div>
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              Trung tâm Bảo mật
            </div>
            <h2 className="mt-6 max-w-md font-display text-3xl font-black leading-tight text-on-surface">
              An toàn tài khoản chuẩn bảo mật cao cấp.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-on-surface-variant/80">
              Mã hóa dữ liệu vé e-ticket QR Code bằng hàm băm salted hash, đảm bảo an tâm tuyệt đối cho khách hàng khi giao dịch trực tuyến.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-low/40 p-4 backdrop-blur-sm">
              <p className="text-on-surface-variant/60 text-xs">Phiên làm việc</p>
              <p className="mt-1 text-base font-bold text-on-surface">Đang hoạt động</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-low/40 p-4 backdrop-blur-sm">
              <p className="text-on-surface-variant/60 text-xs">Trạng thái Token</p>
              <p className="mt-1 text-base font-bold text-emerald-400">Tự động làm mới</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 flex flex-col justify-between">
          <div className="rounded-3xl border border-outline-variant/40 bg-surface/30 p-6 shadow-xl backdrop-blur-md">
            <p className="text-sm font-bold text-on-surface-variant">
              Thiết bị truy cập
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-surface-low/50 border border-outline-variant/30 px-4 py-2.5 text-xs text-on-surface-variant">
                MacBook Pro • Chrome • Hiện tại
              </div>
              <div className="rounded-xl bg-surface-low/50 border border-outline-variant/30 px-4 py-2.5 text-xs text-on-surface-variant/70">
                iPhone 15 Pro • Safari • 2 giờ trước
              </div>
              <div className="rounded-xl bg-surface-low/50 border border-outline-variant/30 px-4 py-2.5 text-xs text-on-surface-variant/70">
                Windows Desktop • Edge • Hôm qua
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Hệ thống bán vé
            </p>
            <p className="mt-2 text-xl font-extrabold leading-tight text-on-surface">
              Chốt vé tức thì trên RAM chống Overbooking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
