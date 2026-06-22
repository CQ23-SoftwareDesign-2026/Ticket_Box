"use client";

import { SiteShell, SectionHeading } from "@/components/common";
import { Mail, MapPin, Phone } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Phạm Quang Tuấn",
    role: "Project Manager / Lead Developer",
    email: "quangtuanxml@gmail.com",
  },
  {
    name: "Trần Vũ Quang",
    role: "Frontend Engineer / UI/UX Designer",
    email: "quang.tran@ticketbox.retrobit.io.vn",
  },
  {
    name: "Nguyễn Khắc Vượng",
    role: "Backend Engineer / DevOps",
    email: "vuong.nguyen@ticketbox.retrobit.io.vn",
  },
  {
    name: "Trần Quốc Vỹ",
    role: "Quality Assurance / Tester",
    email: "vy.tran@ticketbox.retrobit.io.vn",
  },
];

export default function ContactUsPage() {
  return (
    <SiteShell active="/contact-us">
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <SectionHeading title="Contact Us" />
          <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
            Welcome to TicketBox, your ultimate platform for booking concert
            tickets securely and effortlessly. We are dedicated to bringing you
            the best live entertainment experiences. Meet the team behind the
            magic below.
          </p>
        </div>

        <div className="mb-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="ticketbox-panel flex flex-col items-center p-8 text-center transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-surface-highest text-3xl font-bold text-primary shadow-inner">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h3 className="mb-1 text-xl font-bold text-on-surface">
                {member.name}
              </h3>
              <p className="mb-4 text-sm font-medium text-primary">
                {member.role}
              </p>
              <a
                href={`mailto:${member.email}`}
                className="mt-auto flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <Mail size={16} />
                Email
              </a>
            </div>
          ))}
        </div>

        <div className="ticketbox-panel mx-auto max-w-4xl p-8 sm:p-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-on-surface">
                Our Office
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 text-on-surface-variant">
                  <MapPin className="mt-1 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-on-surface">
                      Headquarters
                    </p>
                    <p>Di An, Ho Chi Minh City, Vietnam</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-on-surface-variant">
                  <Phone className="mt-1 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-on-surface">Phone</p>
                    <p>+84 853 223 225</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-on-surface-variant">
                  <Mail className="mt-1 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-on-surface">
                      General Support
                    </p>
                    <p>support@ticketbox.retrobit.io.vn</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-6 text-2xl font-bold text-on-surface">
                Send us a message
              </h3>
              <form className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface-variant">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <button
                  type="button"
                  className="ticketbox-button-primary w-full px-6 py-3"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
