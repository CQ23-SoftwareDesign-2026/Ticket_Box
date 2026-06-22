export function ConcertHeroIllustration() {
  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,122,89,0.35),_transparent_30%),linear-gradient(135deg,_#140c2e_0%,_#2a0b5e_40%,_#0f62fe_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2),_transparent_42%)]" />
      <div className="absolute left-8 top-8 h-16 w-16 rounded-full border border-white/30 bg-white/10" />
      <div className="absolute bottom-12 left-10 right-10 rounded-[28px] border border-white/15 bg-black/35 p-6 text-white backdrop-blur-md">
        <p className="text-sm uppercase tracking-[0.35em] text-white/70">
          TicketBox Auth
        </p>
        <h2 className="mt-3 text-4xl font-black leading-tight">
          Fast, secure, and built for concert journeys.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/80">
          The same design language can later expand into tickets, orders,
          concepts, and admin flows without reworking the auth foundation.
        </p>
      </div>
      <div className="absolute right-8 top-1/3 h-40 w-40 -rotate-12 rounded-[36px] border border-white/30 bg-white/10 shadow-2xl backdrop-blur-md" />
      <div className="absolute bottom-12 right-10 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur-md">
        Prototype-ready
      </div>
    </div>
  );
}

export function SecurityIllustration() {
  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(135deg,_#f8f4ff_0%,_#ffffff_50%,_#edf2ff_100%)] p-10">
      <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="ticketbox-card bg-[linear-gradient(135deg,_#140c2e_0%,_#30135f_40%,_#0f62fe_100%)] p-8 text-white">
          <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
            Security Center
          </div>
          <h2 className="mt-6 max-w-md text-4xl font-black leading-tight">
            Account security built for active users and protected sessions.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
            Prototype this now so future ticket checkout and concept flows can
            reuse the same auth, verification, and session rules.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-white/65">Session status</p>
              <p className="mt-2 text-lg font-bold">Active</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-white/65">Token health</p>
              <p className="mt-2 text-lg font-bold text-[#7cffb2]">
                Refreshing
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold text-slate-500">
              Active sessions
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                MacBook Pro • Chrome • Current
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                iPhone 15 • iOS App • 2 hours ago
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Windows Workstation • Firefox • Yesterday
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#0f62fe]/15 bg-[#eff6ff] p-6 shadow-[0_20px_50px_rgba(15,98,254,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#0f62fe]">
              Future proof
            </p>
            <p className="mt-3 text-2xl font-black text-slate-900">
              Reuse this shell for tickets, concepts, and checkout auth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
