"use client";

import { useState } from "react";
import { SiteShell } from "@/components/common";
import {
  Mail,
  Phone,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  Ticket,
  Clock,
  LucideIcon,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function SupportPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [copiedType, setCopiedType] = useState<"email" | "phone" | null>(null);

  const email = "quangtuanxml@gmail.com";
  const phone = "0853223225";

  const faqs: FAQItem[] = [
    {
      category: "Mua vé & Đơn hàng",
      question: "Làm thế nào để mua vé xem ca nhạc?",
      answer:
        "Bạn chỉ cần chọn liveshow yêu thích tại trang chủ, chọn hạng vé và số lượng mong muốn, sau đó nhấn đặt vé và tiến hành thanh toán qua các phương thức trực tuyến trong vòng 10 phút giữ chỗ.",
    },
    {
      category: "Thanh toán",
      question: "Có những phương thức thanh toán nào?",
      answer:
        "Hệ thống hỗ trợ nhiều phương thức thanh toán an toàn bao gồm thẻ tín dụng/ghi nợ quốc tế (Visa/Mastercard) và chuyển khoản ngân hàng thông qua mã QR được cung cấp bởi PayOS.",
    },
    {
      category: "Hoàn/Hủy vé",
      question: "Chính sách hoàn/hủy hoặc đổi vé như thế nào?",
      answer:
        "Theo quy định chung, vé đã thanh toán thành công không được hỗ trợ hoàn trả, thay đổi thông tin hoặc hủy dưới mọi hình thức, ngoại trừ trường hợp sự kiện bị hoãn hoặc hủy hoàn toàn từ phía Ban tổ chức.",
    },
    {
      category: "Vé QR & Check-in",
      question: "Làm sao để nhận và sử dụng vé QR check-in?",
      answer:
        "Ngay khi thanh toán thành công, mã vé QR sẽ hiển thị trong mục 'Thư viện vé' của bạn và được gửi bản sao qua email. Tại cổng sự kiện, bạn chỉ cần xuất trình mã QR này trên điện thoại để nhân viên quét mã.",
    },
    {
      category: "Tài khoản",
      question: "Tôi có thể chuyển nhượng vé cho người khác không?",
      answer:
        "Mỗi mã vé QR chỉ có giá trị quét một lần duy nhất. Nếu bạn muốn tặng hoặc nhượng vé, vui lòng gửi file PDF chứa mã QR của vé đó cho người nhận và đảm bảo mã QR không bị chia sẻ cho bên thứ ba nào khác.",
    },
    {
      category: "Sự cố",
      question: "Tôi phải làm gì nếu mã QR không quét được tại sự kiện?",
      answer:
        "Đừng lo lắng! Hãy liên hệ ngay hotline hỗ trợ khẩn cấp 0853223225 hoặc email quangtuanxml@gmail.com, hoặc di chuyển trực tiếp đến Quầy hỗ trợ kỹ thuật (Technical Support Gate) đặt tại cổng sự kiện để được kiểm tra trực tiếp.",
    },
  ];

  const guides: GuideItem[] = [
    {
      title: "Check-in nhanh tại cổng",
      description:
        "Mở sẵn màn hình vé QR, tăng độ sáng điện thoại lên mức tối đa và xếp hàng đúng lối đi dành cho hạng vé của bạn để quá trình quét diễn ra nhanh nhất.",
      icon: Ticket,
    },
    {
      title: "Bảo mật mã QR tuyệt đối",
      description:
        "Không bao giờ chụp ảnh màn hình chứa mã QR đăng tải lên mạng xã hội hoặc gửi vào các nhóm chat công khai. Mỗi mã QR chỉ quét được một lần duy nhất.",
      icon: ShieldCheck,
    },
    {
      title: "Thanh toán giữ chỗ đúng giờ",
      description:
        "Sau khi chọn vé, bạn có đúng 10 phút đếm ngược để hoàn tất giao dịch. Hãy thực hiện chuyển khoản ngay lập tức để giữ chỗ ngồi ưng ý.",
      icon: Clock,
    },
  ];

  const handleCopy = (text: string, type: "email" | "phone") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <SiteShell active="/support">
      {/* Decorative Premium Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-container py-16 text-white">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <HelpCircle className="w-3.5 h-3.5" />
            Trung tâm trợ giúp
          </span>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="mt-4 text-base text-white/80 max-w-xl mx-auto leading-relaxed">
            Tìm kiếm câu trả lời nhanh chóng cho các câu hỏi thường gặp hoặc
            liên hệ trực tiếp với bộ phận hỗ trợ khách hàng.
          </p>
        </div>
      </section>

      {/* Main Support Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* FAQs Accordion Column (Spans 2 columns on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">
                Câu hỏi thường gặp (FAQs)
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isExpanded = expandedFAQ === index;
                return (
                  <div
                    key={index}
                    className="group overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-sm transition-all duration-200 hover:border-primary/30"
                  >
                    <button
                      onClick={() => setExpandedFAQ(isExpanded ? null : index)}
                      className="flex w-full items-center justify-between p-5 text-left font-semibold text-on-surface transition-colors hover:text-primary"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                          {faq.category}
                        </span>
                        <p className="text-sm sm:text-base font-bold leading-snug">
                          {faq.question}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-primary shrink-0 ml-3" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-on-surface-variant/60 group-hover:text-primary shrink-0 ml-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-outline-variant/60 bg-surface-low p-5 text-sm leading-relaxed text-on-surface-variant animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Guides Section */}
            <div className="pt-8">
              <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4 mb-6">
                <BookOpen className="w-6 h-6 text-primary" />
                <h2 className="font-display text-2xl font-bold text-on-surface">
                  Hướng dẫn hữu ích
                </h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {guides.map((guide, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                      <guide.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-on-surface mb-2">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed grow">
                      {guide.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Details Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
              <Phone className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-bold text-on-surface">
                Liên hệ hỗ trợ
              </h2>
            </div>

            <div className="rounded-3xl border border-outline-variant bg-surface p-6 shadow-sm space-y-6">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Đội ngũ chăm sóc khách hàng của chúng tôi sẵn sàng giải đáp mọi
                thắc mắc của bạn liên quan đến sự kiện và thanh toán 24/7.
              </p>

              {/* Email Card */}
              <div className="rounded-2xl border border-outline-variant/80 bg-surface-low p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Gửi email
                    </span>
                    <p className="text-sm font-bold text-on-surface break-all">
                      {email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(email, "email")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors active:scale-90"
                  title="Copy Email"
                >
                  {copiedType === "email" ? (
                    <Check className="w-4 h-4 text-emerald-600 animate-pulse" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Hotline Card */}
              <div className="rounded-2xl border border-outline-variant/80 bg-surface-low p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Gọi hotline
                    </span>
                    <p className="text-sm font-bold text-on-surface">{phone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex h-9 px-4 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-sm shadow-primary/20 text-center"
                >
                  Gọi ngay
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
