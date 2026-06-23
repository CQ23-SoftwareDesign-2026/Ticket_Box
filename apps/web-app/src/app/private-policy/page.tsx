import { SiteShell } from "@/components/common";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      number: 1,
      title: "Information We Collect",
      content:
        "When you use the TicketBox ticket booking system, we may collect personal information such as your name, email address, phone number, and payment details. We also collect data on your browsing behavior and ticket purchasing history to improve our services and offer personalized recommendations.",
    },
    {
      number: 2,
      title: "How We Use Your Information",
      content:
        "Your information is primarily used to process ticket purchases, deliver tickets (e-tickets), and communicate with you regarding event updates or cancellations. We may also use your data for internal analytics to enhance system performance and security.",
    },
    {
      number: 3,
      title: "Data Sharing and Security",
      content:
        "TicketBox does not sell your personal information to third parties. We may share necessary data with event organizers and secure payment gateways solely for the purpose of fulfilling your booking. We implement industry-standard security measures to protect your data against unauthorized access.",
      icon: "🔐",
    },
    {
      number: 4,
      title: "Your Rights",
      content:
        "You have the right to access, update, or request the deletion of your personal information at any time through your account profile. If you have any questions or concerns about how your data is handled, please contact our support team.",
      icon: "⚖️",
    },
    {
      number: 5,
      title: "Data Retention",
      content:
        "We retain your personal information for as long as necessary to fulfill the purposes outlined in this privacy policy. You can request deletion of your data at any time, subject to legal and contractual obligations.",
      icon: "📅",
    },
  ];

  const contactEmails = [
    "khacvuong2707@gmail.com",
    "quangtuanxml@gmail.com",
    "quocvy23072005@gmail.com",
    "tvquang.working@gmail.com",
  ];

  return (
    <SiteShell active="/">
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="space-y-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-1.5 h-12 rounded-full bg-linear-to-b from-indigo-500 via-purple-500 to-cyan-500" />

                <div>
                  <h1
                    className="
      text-5xl
      sm:text-6xl
      font-extrabold
      font-display

      bg-linear-to-r
      from-white
      via-indigo-200
      to-purple-300

      bg-clip-text
      text-transparent
    "
                  >
                    Privacy Policy
                  </h1>

                  <div
                    className="
      h-[2px]
      mt-2
      w-32
      bg-linear-to-r
      from-indigo-500
      via-purple-500
      to-cyan-500
      rounded-full
    "
                  />
                </div>
              </div>
              <p className="text-gray-400 text-lg ml-4">
                TicketBox Privacy and Data Usage Policy
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <div
                key={section.number}
                className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: "both",
                }}
              >
                <div
                  className="
          group
          relative
          overflow-hidden
          rounded-xl
          border
          border-gray-700/50
          bg-linear-to-br
          from-gray-800/40
          via-gray-800/30
          to-gray-700/20
          p-8
          sm:p-10
          backdrop-blur-sm

          hover:border-indigo-500/50
          hover:bg-gray-800/60
          hover:-translate-y-1

          hover:shadow-2xl
          hover:shadow-indigo-500/10

          transition-all
          duration-300
        "
                >
                  {/* Animated Gradient Glow */}
                  <div
                    className="
            absolute
            inset-0
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-500
            bg-linear-to-r
            from-indigo-500/10
            via-purple-500/10
            to-cyan-500/10
            pointer-events-none
          "
                  />

                  {/* Top Accent Line */}
                  <div
                    className="
            absolute
            top-0
            left-0
            h-1
            w-0
            bg-linear-to-r
            from-indigo-500
            via-purple-500
            to-cyan-500
            group-hover:w-full
            transition-all
            duration-500
          "
                  />

                  <div className="relative z-10 space-y-6">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="
                  w-1
                  h-8
                  rounded-full
                  bg-gray-500
                  group-hover:bg-linear-to-b
                  group-hover:from-indigo-500
                  group-hover:to-purple-500
                  transition-all
                  duration-300
                "
                        />

                        <h2
                          className="
                  text-3xl
                  sm:text-4xl
                  font-bold
                  font-display
                  text-white
                  transition-all
                  duration-300
                  group-hover:text-indigo-300
                "
                        >
                          {section.number}. {section.title}
                        </h2>
                      </div>

                      <p
                        className="
                text-gray-300
                leading-relaxed
                ml-4
                text-base
                sm:text-lg
                transition-colors
                duration-300
                group-hover:text-gray-100
              "
                      >
                        {section.content}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="pt-6 border-t border-gray-700/50">
                      <p
                        className="
                text-sm
                text-gray-400
                flex
                items-center
                gap-2
                transition-colors
                duration-300
                group-hover:text-gray-300
              "
                      ></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Us Section */}
          <div
            className="mt-16 animate-in fade-in slide-in-from-bottom-2 duration-700"
            style={{ animationDelay: "500ms", animationFillMode: "both" }}
          >
            <div
              className="
          group
          relative
          overflow-hidden
          rounded-xl
          border
          border-gray-700/50
          bg-linear-to-br
          from-gray-800/40
          via-gray-800/30
          to-gray-700/20
          p-8
          sm:p-10
          backdrop-blur-sm

          hover:border-indigo-500/50
          hover:bg-gray-800/60
          hover:-translate-y-1

          hover:shadow-2xl
          hover:shadow-indigo-500/10

          transition-all
          duration-300
        "
            >
              {/* Animated Gradient Glow */}
              <div
                className="
            absolute
            inset-0
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-500
            bg-linear-to-r
            from-indigo-500/10
            via-purple-500/10
            to-cyan-500/10
            pointer-events-none
          "
              />

              {/* Top Accent Line */}
              <div
                className="
            absolute
            top-0
            left-0
            h-1
            w-0
            bg-linear-to-r
            from-indigo-500
            via-purple-500
            to-cyan-500
            group-hover:w-full
            transition-all
            duration-500
          "
              />

              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="
                  w-1
                  h-8
                  rounded-full
                  bg-gray-500
                  group-hover:bg-linear-to-b
                  group-hover:from-indigo-500
                  group-hover:to-purple-500
                  transition-all
                  duration-300
                "
                    />

                    <h2
                      className="
                  text-3xl
                  sm:text-4xl
                  font-bold
                  font-display
                  text-white
                  transition-all
                  duration-300
                  group-hover:text-indigo-300
                "
                    >
                      6. Contact Us
                    </h2>
                  </div>

                  <p
                    className="
                text-gray-300
                leading-relaxed
                ml-4
                text-base
                sm:text-lg
                transition-colors
                duration-300
                group-hover:text-gray-100
              "
                  >
                    If you have any questions about this privacy policy or wish
                    to exercise your rights, please contact us:
                  </p>
                </div>

                {/* Email Grid */}
                <div className="grid gap-3 sm:grid-cols-2 pt-4 ml-4">
                  {contactEmails.map((email, index) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="
                    group/email
                    relative
                    overflow-hidden
                    rounded-lg
                    bg-gray-800/40
                    p-4
                    border
                    border-gray-700/50

                    hover:border-indigo-500/50
                    hover:bg-gray-800/60
                    hover:-translate-y-0.5

                    hover:shadow-lg
                    hover:shadow-indigo-500/10

                    transition-all
                    duration-300
                  "
                      style={{
                        animationDelay: `${550 + index * 50}ms`,
                      }}
                    >
                      {/* Animated Gradient Glow */}
                      <div
                        className="
                      absolute
                      inset-0
                      opacity-0
                      group-hover/email:opacity-100
                      transition-opacity
                      duration-500
                      bg-linear-to-r
                      from-indigo-500/5
                      via-purple-500/5
                      to-cyan-500/5
                      pointer-events-none
                    "
                      />

                      <div className="relative z-10 flex items-center gap-3">
                        <svg
                          className="
                        w-5
                        h-5
                        text-gray-500
                        shrink-0
                        group-hover/email:text-indigo-400
                        transition-colors
                        duration-300
                      "
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span
                          className="
                        text-sm
                        font-semibold
                        text-gray-300
                        group-hover/email:text-indigo-300
                        transition-colors
                        duration-300
                        truncate
                      "
                        >
                          {email}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Footer Note */}
                <div className="pt-6 border-t border-gray-700/50">
                  <p
                    className="
                text-sm
                text-gray-400
                flex
                items-center
                gap-2
                ml-4
                transition-colors
                duration-300
                group-hover:text-gray-300
              "
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    We typically respond to inquiries within 24-48 hours during
                    business days.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div
            className="mt-16 text-center animate-in fade-in duration-700"
            style={{ animationDelay: "600ms", animationFillMode: "both" }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-800/40 px-4 py-2 rounded-lg border border-gray-700/50 backdrop-blur-sm">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Last updated: June 2026</span>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
