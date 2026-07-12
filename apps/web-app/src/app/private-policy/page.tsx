"use client";

import { useState, useEffect } from "react";
import { SiteShell } from "@/components/common";
import {
  Shield,
  Lock,
  Eye,
  UserCheck,
  Clock,
  Mail,
  Info,
  Calendar,
} from "lucide-react";

const sections = [
  {
    id: "info-collect",
    number: 1,
    title: "Thu thập thông tin",
    description:
      "Các loại dữ liệu cá nhân chúng tôi thu thập khi bạn sử dụng dịch vụ.",
    content:
      "Khi bạn đăng ký tài khoản, thực hiện giao dịch mua vé hoặc tương tác trên TicketBox, chúng tôi có thể thu thập các thông tin cá nhân bao gồm: Họ tên, địa chỉ email, số điện thoại, và lịch sử giao dịch. Chúng tôi cũng tự động thu thập một số dữ liệu kỹ thuật như địa chỉ IP, loại thiết bị và hành vi sử dụng trang web nhằm cải thiện chất lượng dịch vụ tốt hơn.",
    icon: Eye,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "info-usage",
    number: 2,
    title: "Mục đích sử dụng",
    description:
      "Cách thức chúng tôi xử lý dữ liệu để phục vụ trải nghiệm đặt vé của bạn.",
    content:
      "Thông tin thu thập được sử dụng chủ yếu để xử lý đơn hàng đặt vé của bạn, phát hành vé điện tử (mã QR), gửi email xác nhận thanh toán, và cập nhật thông tin sự kiện liên quan (như thay đổi lịch trình hoặc hủy bỏ). Ngoài ra, chúng tôi sử dụng dữ liệu ẩn danh để thực hiện phân tích hiệu năng và tăng cường các lớp bảo mật chống gian lận.",
    icon: Shield,
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "data-sharing",
    number: 3,
    title: "Bảo mật & chia sẻ dữ liệu",
    description:
      "Chính sách cam kết bảo vệ thông tin cá nhân của bạn an toàn tuyệt đối.",
    content:
      "TicketBox cam kết không bán, cho thuê hoặc chia sẻ trái phép dữ liệu cá nhân của bạn với bên thứ ba. Chúng tôi chỉ chia sẻ dữ liệu cần thiết với Ban Tổ Chức sự kiện (để soát vé) và đối tác Cổng thanh toán bảo mật (PayOS) nhằm thực hiện giao dịch. Mọi dữ liệu truyền tải đều được mã hóa bằng giao thức HTTPS chuẩn công nghiệp.",
    icon: Lock,
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "user-rights",
    number: 4,
    title: "Quyền hạn của bạn",
    description: "Các quyền lợi kiểm soát dữ liệu cá nhân mà bạn sở hữu.",
    content:
      "Bạn có toàn quyền truy cập, chỉnh sửa hoặc yêu cầu hủy bỏ thông tin cá nhân của mình trong trang cài đặt tài khoản bất kỳ lúc nào. Bạn cũng có quyền từ chối nhận các email quảng cáo từ TicketBox bằng cách sử dụng liên kết hủy đăng ký ở cuối mỗi thư. Đối với yêu cầu xóa tài khoản vĩnh viễn, bạn có thể liên hệ trực tiếp với bộ phận hỗ trợ kỹ thuật.",
    icon: UserCheck,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "data-retention",
    number: 5,
    title: "Thời gian lưu trữ",
    description:
      "Thời gian lưu trữ dữ liệu cá nhân trên hệ thống của chúng tôi.",
    content:
      "Chúng tôi sẽ lưu trữ dữ liệu cá nhân của bạn trên máy chủ an toàn chừng nào tài khoản của bạn còn hoạt động, hoặc khi thông tin đó còn cần thiết để thực hiện các nghĩa vụ đối soát tài chính và giải quyết tranh chấp pháp lý. Dữ liệu sao lưu sẽ định kỳ được dọn dẹp và xóa sạch theo đúng chu kỳ vận hành của hệ thống bảo mật.",
    icon: Clock,
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
];

const contactEmails = [
  "khacvuong2707@gmail.com",
  "quangtuanxml@gmail.com",
  "quocvy23072005@gmail.com",
  "tvquang.working@gmail.com",
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState<string>("info-collect");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section.id);
            break;
          }
        }
      }
      // Check for contact section
      const contactElement = document.getElementById("contact-us");
      if (contactElement && scrollPosition >= contactElement.offsetTop) {
        setActiveSection("contact-us");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 120,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  return (
    <SiteShell active="/">
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-on-surface">
        {/* Banner Hero */}
        <div className="relative overflow-hidden py-20 border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />
          <div className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-bold text-primary">
              <Shield size={12} />
              Quyền riêng tư & Bảo mật
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-black font-display text-on-surface leading-tight tracking-tight">
              Chính Sách Bảo Mật
            </h1>
            <p className="mt-4 text-base sm:text-lg text-on-surface-variant/80 max-w-2xl leading-relaxed">
              TicketBox cam kết bảo mật tuyệt đối mọi thông tin cá nhân và dữ
              liệu giao dịch của bạn. Dưới đây là chính sách minh bạch của chúng
              tôi về thu thập, sử dụng và bảo vệ dữ liệu.
            </p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-4">
            {/* Sticky Table of Contents (Left Column) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-28 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 pl-3">
                  Mục lục chính sách
                </p>
                <nav className="space-y-1">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                        activeSection === sec.id
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "text-on-surface-variant/75 hover:bg-slate-900 hover:text-on-surface"
                      }`}
                    >
                      <span className="text-xs opacity-60">0{sec.number}.</span>
                      {sec.title}
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection("contact-us")}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                      activeSection === "contact-us"
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-on-surface-variant/75 hover:bg-slate-900 hover:text-on-surface"
                    }`}
                  >
                    <span className="text-xs opacity-60">06.</span>
                    Liên hệ hỗ trợ
                  </button>
                </nav>
              </div>
            </div>

            {/* Content Sections (Right Column) */}
            <div className="lg:col-span-3 space-y-10">
              {/* Sections List */}
              {sections.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <section
                    key={sec.id}
                    id={sec.id}
                    className="scroll-mt-32 group relative rounded-3xl border border-slate-800 bg-[#16222f]/50 p-6 sm:p-8 hover:border-slate-700/80 hover:bg-[#16222f]/70 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      <div
                        className={`p-3.5 rounded-2xl ${sec.bgColor} shrink-0`}
                      >
                        <IconComponent className={`h-6 w-6 ${sec.iconColor}`} />
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">
                          Điều khoản 0{sec.number}
                        </span>
                        <h2 className="font-display text-2xl font-bold text-on-surface group-hover:text-primary transition-colors duration-250">
                          {sec.title}
                        </h2>
                        <p className="text-sm font-medium text-on-surface-variant/70 italic">
                          {sec.description}
                        </p>
                        <p className="text-base text-on-surface-variant/90 leading-relaxed pt-2">
                          {sec.content}
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })}

              {/* Contact Us Section */}
              <section
                id="contact-us"
                className="scroll-mt-32 rounded-3xl border border-slate-700 bg-linear-to-br from-[#1b2b3a] to-[#121c26] p-6 sm:p-8 shadow-md relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.05),transparent_50%)] pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">
                        Liên hệ
                      </span>
                      <h2 className="font-display text-2xl font-bold text-on-surface">
                        06. Liên hệ chúng tôi
                      </h2>
                      <p className="text-base text-on-surface-variant/90 leading-relaxed">
                        Nếu bạn có bất kỳ câu hỏi nào liên quan đến Chính sách
                        bảo mật hoặc muốn thực hiện quyền hạn bảo vệ dữ liệu cá
                        nhân của mình, vui lòng kết nối với đội ngũ phát triển
                        TicketBox qua các hòm thư điện tử dưới đây:
                      </p>
                    </div>
                  </div>

                  {/* Emails Grid */}
                  <div className="grid gap-3.5 sm:grid-cols-2 sm:pl-14">
                    {contactEmails.map((email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-primary/50 hover:bg-slate-900 transition-all duration-200 group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-750 flex items-center justify-center text-on-surface-variant/60 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                          <Mail size={16} />
                        </div>
                        <span className="text-sm font-semibold text-on-surface-variant/95 group-hover:text-on-surface transition-colors truncate">
                          {email}
                        </span>
                      </a>
                    ))}
                  </div>

                  {/* Foot Note */}
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant/60 sm:pl-14 pt-2">
                    <Info size={14} className="text-primary/70 shrink-0" />
                    <span>
                      Chúng tôi thường phản hồi các yêu cầu bảo mật trong vòng
                      24 - 48 giờ làm việc.
                    </span>
                  </div>
                </div>
              </section>

              {/* Last Updated Timestamp */}
              <div className="text-center pt-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant/70 bg-[#16222f] px-4 py-2.5 rounded-full border border-slate-800 shadow-sm">
                  <Calendar size={13} className="text-primary/80" />
                  <span>Cập nhật lần cuối: Tháng 7, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
