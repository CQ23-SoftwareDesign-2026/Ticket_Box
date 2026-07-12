"use client";

import { useState } from "react";
import { SiteShell, SectionHeading, Input, Button } from "@/components/common";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useToast } from "@/context/ToastContext";

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
  const { success: showSuccessToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setLoading(true);
    // Simulate sending message
    setTimeout(() => {
      setLoading(false);
      showSuccessToast(
        "Cảm ơn bạn đã liên hệ! Lời nhắn của bạn đã được gửi thành công.",
      );
      setName("");
      setEmail("");
      setMessage("");
    }, 1200);
  };

  return (
    <SiteShell active="/contact-us">
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <SectionHeading title="Liên hệ với chúng tôi" />
          <p className="mx-auto mt-4 max-w-2xl text-base text-on-surface-variant/80 leading-relaxed">
            Chào mừng bạn đến với TicketBox, nền tảng đặt vé ca nhạc an toàn và
            nhanh chóng. Chúng tôi tận tâm mang đến cho bạn những trải nghiệm
            giải trí trực tiếp tuyệt vời nhất. Gặp gỡ đội ngũ đứng sau TicketBox
            dưới đây.
          </p>
        </div>

        {/* Team Members Grid */}
        <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="rounded-3xl border border-outline-variant/40 bg-surface/20 p-8 text-center flex flex-col items-center backdrop-blur-lg shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:border-outline-variant/60 transition-all duration-300"
            >
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-3xl font-black text-primary shadow-inner">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h3 className="mb-1 text-lg font-bold text-on-surface">
                {member.name}
              </h3>
              <p className="mb-6 text-xs font-semibold text-primary/80">
                {member.role}
              </p>
              <a
                href={`mailto:${member.email}`}
                className="mt-auto flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-low border border-outline-variant/40 hover:border-primary/35 px-4 py-2 rounded-xl cursor-pointer"
              >
                <Mail size={14} className="text-primary/70" />
                Gửi Email
              </a>
            </div>
          ))}
        </div>

        {/* Office & Form Section */}
        <div className="rounded-3xl border border-outline-variant/40 bg-surface/20 p-8 sm:p-12 backdrop-blur-lg shadow-xl max-w-4xl mx-auto">
          <div className="grid gap-12 md:grid-cols-2">
            {/* Information */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-on-surface">
                Văn phòng của chúng tôi
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 text-on-surface-variant">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">
                      Trụ sở chính
                    </p>
                    <p className="text-xs mt-1 text-on-surface-variant/80">
                      Dĩ An, Thành phố Hồ Chí Minh, Việt Nam
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-on-surface-variant">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">
                      Số điện thoại
                    </p>
                    <p className="text-xs mt-1 text-on-surface-variant/80">
                      +84 853 223 225
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-on-surface-variant">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">
                      Hỗ trợ chung
                    </p>
                    <p className="text-xs mt-1 text-on-surface-variant/80">
                      support@ticketbox.retrobit.io.vn
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-on-surface">
                Gửi lời nhắn cho chúng tôi
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label
                    className="text-xs font-semibold text-on-surface-variant"
                    htmlFor="contactName"
                  >
                    Họ và tên
                  </label>
                  <Input
                    id="contactName"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-xs font-semibold text-on-surface-variant"
                    htmlFor="contactEmail"
                  >
                    Địa chỉ Email
                  </label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="nguyenvana@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-xs font-semibold text-on-surface-variant"
                    htmlFor="contactMessage"
                  >
                    Nội dung lời nhắn
                  </label>
                  <textarea
                    id="contactMessage"
                    rows={4}
                    placeholder="Tôi có thể giúp gì cho bạn?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-2xl border border-outline-variant/60 bg-surface/50 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-on-surface-variant/40"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full justify-center gap-2 py-3.5 mt-2"
                  loading={loading}
                >
                  <Send size={16} />
                  Gửi tin nhắn
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
