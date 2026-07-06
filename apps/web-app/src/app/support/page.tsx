"use client";

import { useState } from "react";
import { SiteShell } from "@/components/common";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-on-surface">
        
        {/* Banner Hero */}
        <div className="relative overflow-hidden py-16 border-b border-slate-800 bg-[#0f172a]/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />
          <div className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-bold text-primary">
              <HelpCircle size={12} />
              Trung tâm hỗ trợ khách hàng
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-black font-display text-on-surface leading-tight tracking-tight">
              Chúng tôi có thể giúp gì cho bạn?
            </h1>
            <p className="mt-4 text-base sm:text-lg text-on-surface-variant/80 max-w-2xl mx-auto leading-relaxed">
              Tìm kiếm câu trả lời nhanh chóng cho các thắc mắc thường gặp hoặc liên hệ trực tiếp với bộ phận chăm sóc khách hàng 24/7.
            </p>
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            
            {/* FAQ Accordion Section (Left/Center Column) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
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
                      className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#16222f]/50 hover:border-slate-700/80 hover:bg-[#16222f]/70 transition-all duration-200"
                    >
                      <button
                        onClick={() => setExpandedFAQ(isExpanded ? null : index)}
                        className="flex w-full items-center justify-between p-5 text-left text-on-surface hover:text-primary transition-colors focus:outline-none"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-primary/80">
                            {faq.category}
                          </span>
                          <p className="text-base font-bold leading-snug">
                            {faq.question}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-primary shrink-0 ml-3 transition-transform" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-on-surface-variant/60 group-hover:text-primary shrink-0 ml-3 transition-transform" />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="border-t border-slate-800 bg-slate-900/40 p-5 text-sm leading-relaxed text-on-surface-variant/90">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Guides List */}
              <div className="pt-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-2xl font-bold text-on-surface">
                    Cẩm nang soát vé & Bảo mật
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                  {guides.map((guide, i) => {
                    const GuideIcon = guide.icon;
                    return (
                      <div
                        key={i}
                        className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:border-primary/25 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10 mb-4">
                          <GuideIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-sm text-on-surface mb-2">
                          {guide.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant/80 leading-relaxed grow">
                          {guide.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Support Details (Right Column) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Phone className="w-6 h-6 text-primary" />
                <h2 className="font-display text-2xl font-bold text-on-surface">
                  Liên hệ khẩn cấp
                </h2>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-[#16222f]/50 p-6 shadow-md space-y-6">
                <p className="text-sm text-on-surface-variant/80 leading-relaxed">
                  Đội ngũ CSKH kỹ thuật của TicketBox luôn sẵn sàng túc trực 24/7 để xử lý nhanh chóng mọi phản hồi và sự cố liên quan đến đặt vé & soát vé.
                </p>

                {/* Email Option Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider block">
                        Gửi email hỗ trợ
                      </span>
                      <p className="text-sm font-bold text-on-surface truncate mt-0.5">
                        {email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(email, "email")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-850 bg-slate-900 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all active:scale-90 shrink-0"
                    title="Sao chép Email"
                  >
                    {copiedType === "email" ? (
                      <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Hotline Option Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider block">
                        Hotline khẩn cấp 24/7
                      </span>
                      <p className="text-sm font-bold text-on-surface mt-0.5">{phone}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex h-9 px-4 items-center justify-center rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-sm shadow-primary/20 text-center shrink-0"
                  >
                    Gọi ngay
                  </a>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-on-surface-variant/60 pt-2 border-t border-slate-800">
                  <Info size={14} className="text-primary/80 shrink-0 mt-0.5" />
                  <span className="leading-normal">
                    Đối với các thắc mắc phát sinh trực tiếp tại khu vực check-in của liveshow, vui lòng di chuyển tới **Quầy Kỹ Thuật (Technical Gate)** để được hỗ trợ nhanh nhất.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </SiteShell>
  );
}
