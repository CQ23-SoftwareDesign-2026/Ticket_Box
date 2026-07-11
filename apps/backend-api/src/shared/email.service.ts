import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resendApiKey: string | null = null;

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY || null;

    if (this.resendApiKey) {
      this.logger.log("Resend API integration initialized successfully");
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || user.includes("your-gmail-here")) {
      this.logger.warn(
        "Email service will run in MOCK mode because neither Resend API Key nor SMTP configurations are provided.",
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587
        auth: {
          user,
          pass,
        },
      });
      this.logger.log("SMTP Nodemailer Transporter initialized successfully");
    } catch (err) {
      this.logger.error("Failed to create nodemailer transporter", err);
    }
  }

  async sendMail(options: nodemailer.SendMailOptions): Promise<boolean> {
    const from =
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      `"TicketBox" <no-reply@ticketbox.local>`;
    const mailOptions = { from, ...options };

    // 1. Resend API mode
    if (this.resendApiKey) {
      try {
        const to = Array.isArray(mailOptions.to)
          ? mailOptions.to.join(", ")
          : mailOptions.to;
        const response = await (globalThis as any).fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: mailOptions.from,
              to,
              subject: mailOptions.subject,
              html: mailOptions.html,
              attachments: mailOptions.attachments?.map((attachment, index) => {
                const item =
                  typeof attachment === "string"
                    ? { path: attachment }
                    : attachment;
                if (!item || !("content" in item) || item.content == null) {
                  throw new Error(
                    `Resend attachment ${index} must provide in-memory content`,
                  );
                }
                const content = Buffer.isBuffer(item.content)
                  ? item.content.toString("base64")
                  : Buffer.from(String(item.content)).toString("base64");
                return {
                  filename: item.filename || `attachment-${index + 1}`,
                  content,
                };
              }),
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.logger.error(
            "Resend API returned an error:",
            JSON.stringify(errorData),
          );
          return false;
        }

        const data = await response.json().catch(() => ({}));
        this.logger.log(
          `Email sent successfully via Resend API to ${to}. ID: ${data?.id}`,
        );
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send email via Resend API to ${mailOptions.to}`,
          error,
        );
        return false;
      }
    }

    // 2. SMTP mode
    if (this.transporter) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent successfully to ${mailOptions.to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email to ${mailOptions.to}`, error);
        return false;
      }
    }

    // 3. Mock mode
    this.logger.log(
      `[MOCK EMAIL] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`,
    );
    this.logger.log(`[MOCK EMAIL] HTML Content:\n${mailOptions.html}`);
    return true;
  }

  async sendVerificationEmail(
    toEmail: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    const verifyUrl = `${backendUrl}/auth/verify?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #6200ee; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #6200ee; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">TICKETBOX</h1>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">Hệ thống phân phối vé sự kiện hàng đầu</p>
        </div>
        
        <div style="padding: 10px 0;">
          <h2 style="color: #333333; margin-top: 0; font-size: 20px;">Chào ${fullName},</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>TicketBox</strong>. Để có thể truy cập hệ thống, đặt vé và nhận hóa đơn một cách an toàn nhất, vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #6200ee; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 5px; display: inline-block; box-shadow: 0 4px 6px rgba(98, 0, 238, 0.15); transition: background-color 0.3s ease;">
              Kích hoạt tài khoản
            </a>
          </div>
          <p style="color: #e53935; font-size: 13px; font-style: italic; margin-top: 15px;">
            * Đường link kích hoạt này sẽ hết hạn trong vòng 1 giờ vì lý do bảo mật.
          </p>
        </div>
        
        <div style="margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #888888; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Đây là email được gửi tự động, vui lòng không phản hồi lại email này.</p>
          <p style="margin: 0;">&copy; 2026 TicketBox. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: toEmail,
      subject: "🎫 TicketBox - Xác thực tài khoản của bạn",
      html,
    });
  }

  async sendPasswordResetEmail(
    toEmail: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #e53935; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #e53935; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">TICKETBOX</h1>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">Khôi phục mật khẩu tài khoản</p>
        </div>
        
        <div style="padding: 10px 0;">
          <h2 style="color: #333333; margin-top: 0; font-size: 20px;">Chào ${fullName},</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn tại <strong>TicketBox</strong>. Vui lòng nhấp vào nút bên dưới để tiến hành đặt mật khẩu mới:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e53935; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 5px; display: inline-block; box-shadow: 0 4px 6px rgba(229, 57, 53, 0.15); transition: background-color 0.3s ease;">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="color: #777777; font-size: 14px; line-height: 1.5; margin-top: 25px;">
            Nếu bạn không gửi yêu cầu khôi phục mật khẩu này, bạn có thể bỏ qua email này một cách an toàn. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.
          </p>
          
          <p style="color: #e53935; font-size: 13px; font-style: italic; margin-top: 15px;">
            * Đường link khôi phục mật khẩu này sẽ hết hạn trong vòng 15 phút vì lý do bảo mật.
          </p>
        </div>
        
        <div style="margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #888888; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Đây là email được gửi tự động, vui lòng không phản hồi lại email này.</p>
          <p style="margin: 0;">&copy; 2026 TicketBox. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: toEmail,
      subject: "🎫 TicketBox - Yêu cầu khôi phục mật khẩu",
      html,
    });
  }
}
