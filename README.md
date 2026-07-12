# TicketBox - Hệ thống Đặt Vé và Soát Vé Concert (Monorepo)

Chào mừng bạn đến với **TicketBox**! Đây là dự án hệ thống đặt vé concert trực tuyến tích hợp cơ chế chịu tải (Rate Limiting), chống bán quá số lượng (Oversell Prevention), và soát vé ngoại tuyến (Offline Check-in).

Repository này được tổ chức dưới dạng **NPM Workspaces (Monorepo)**, giúp quản lý toàn bộ các thành phần (Backend, Frontend Web, Mobile App) trong cùng một dự án.

---

## 📁 Cấu Trúc Dự Án

* **`apps/backend-api`**: Backend API xây dựng trên **NestJS**, sử dụng **Prisma ORM** kết nối Postgres. Tích hợp Redis Cache, RabbitMQ Message Queue và cơ chế chặn spam Token Bucket (Redis + Lua script).
* **`apps/web-app`**: Frontend Web cho khách hàng (Audience) mua vé và trang quản trị (Admin / Organizer) xây dựng bằng **Next.js App Router** và **Tailwind CSS**.
* **`apps/mobile-app/ticketbox`**: Ứng dụng di động dành riêng cho nhân viên soát vé (Checker), phát triển bằng **React Native (Expo)** hỗ trợ quét QR ngoại tuyến (Offline-first).
* **`infrastructure/`**: Chứa file cấu hình Docker Compose để khởi động nhanh Redis và RabbitMQ dưới local.
* **`prisma/`**: Định nghĩa Database Schema và các tập lệnh Seed dữ liệu mẫu.
* **`scripts/`**: Chứa các script k6 dùng để load test hệ thống dưới tải cao.

---

## 🛠️ Yêu Cầu Hệ Thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
* **Node.js**: Phiên bản LTS mới nhất (Khuyên dùng v18 hoặc v20+).
* **NPM**: Đi kèm khi cài Node.js.
* **Docker & Docker Compose**: Để chạy Redis & RabbitMQ.
* **k6**: Để thực hiện chạy load test (tùy chọn, tải tại [k6.io](https://k6.io)).
* **Expo Go**: Tải trên App Store hoặc Google Play (để chạy thử app di động trên điện thoại thật).

---

## 🚀 Hướng Dẫn Thiết Lập Từng Bước (Setup Guide)

### Bước 1: Clone Repository & Cài đặt Dependencies
Mở terminal tại thư mục gốc của dự án sau khi clone và chạy lệnh sau để tự động cài đặt package cho toàn bộ các workspace:
```bash
npm install
```

### Bước 2: Thiết lập Biến Môi Trường (Environment Variables)

1. **Backend & Prisma (Thư mục gốc)**:
   * Copy file `.env.example` thành `.env` tại **thư mục gốc** của dự án:
     ```bash
     cp .env.example .env
     ```
   * Mở file `.env` vừa tạo và điền các cấu hình của bạn:
     * Cấu hình Database: Hãy điền link database Postgres của bạn (ví dụ link từ Supabase hoặc một database Postgres local).
       ```env
       DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>"
       DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>"
       ```
     * Các biến môi trường khác như Redis, RabbitMQ đã được cấu hình mặc định chạy qua Docker.

2. **Web App (Frontend)**:
   * Chuyển vào thư mục `apps/web-app`.
   * Copy file `.env.example` thành `.env` (hoặc `.env.local`):
     ```bash
     cp .env.example .env
     ```
   * Nếu chạy local hoàn toàn, hãy cập nhật API trỏ về localhost (của NestJS):
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:3000
     REMOTE_API_URL=http://localhost:3000
     ```

---

### Bước 3: Khởi động Hạ tầng Docker (Redis, RabbitMQ)
Chạy lệnh sau tại thư mục gốc để khởi động các dịch vụ Redis và RabbitMQ:
```bash
cd infrastructure
docker compose up -d
cd ..
```
* **Redis** chạy ở cổng `6379`.
* **RabbitMQ** chạy ở cổng `5672` (giao diện quản lý chạy ở `http://localhost:15672`, đăng nhập với tài khoản/mật khẩu mặc định: `guest` / `guest`).

---

### Bước 4: Khởi tạo Database & Seed Dữ Liệu
Chạy các lệnh sau tại thư mục gốc để đồng bộ database và tạo sẵn tài khoản test cùng concert mẫu:

1. **Tạo cấu trúc bảng (Migration)**:
   ```bash
   npx prisma migrate dev --name init_schema
   ```
2. **Tự động sinh Typescript Client cho Prisma**:
   ```bash
   npm run prisma:generate
   ```
3. **Nạp dữ liệu mẫu (Seed)**:
   ```bash
   npm run db:seed
   ```

---

### Bước 5: Chạy Ứng Dụng dưới Local

Mở 3 cửa sổ terminal riêng biệt để chạy 3 thành phần chính:

#### 1. Chạy Backend API (NestJS)
Chạy tại thư mục gốc:
```bash
npm run start:api
```
*(Backend hoạt động tại địa chỉ: `http://localhost:3000`)*

#### 2. Chạy Frontend Web App (Next.js)
Chạy tại thư mục gốc:
```bash
npm run start:web
```
*(Trình duyệt sẽ tự động mở hoặc bạn có thể vào `http://localhost:3001` hoặc cổng hiển thị trên terminal)*

#### 3. Chạy Mobile App (Expo)
Chạy tại thư mục gốc:
```bash
npm run start:mobile
```
*(Nếu là lần đầu chạy mobile, bạn cần chạy `npm install` trong thư mục `apps/mobile-app/ticketbox` trước).*
> [!IMPORTANT]
> **Lưu ý khi chạy app di động:**
> * Nếu bạn sử dụng **thiết bị thật** (quét QR bằng Expo Go), bạn phải chỉnh sửa file `src/constants/app-config.ts` đổi `apiBaseUrl` thành IP máy tính chạy backend của bạn (ví dụ: `http://192.168.1.5:3000` thay vì `localhost`) và cả hai thiết bị phải kết nối chung một mạng Wi-Fi.

---

## 🔑 Tài Khoản Thử Nghiệm Mặc Định (Seed Users)

Sau khi chạy lệnh `npm run db:seed`, bạn có thể dùng các tài khoản sau để đăng nhập thử nghiệm:

| Vai trò (Role) | Email | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Admin** | `vy.admin@ticketbox.local` | `123456` | Xem dashboard, thống kê doanh thu, quản lý tài khoản & phân quyền. |
| **Organizer** | `tuan.organizer@ticketbox.local` | `123456` | Quản lý concert, tạo concert mới, báo cáo doanh thu riêng. |
| **Checker** | `quang.checker@ticketbox.local` | `123456` | Soát vé (Đăng nhập trên Mobile App). |
| **Audience** | Đăng ký trực tiếp trên Web | Tùy chọn | Xem danh sách sự kiện, mua vé, xem vé cá nhân. |

---

## ⚡ Load Test và Kiểm Tra Cơ Chế Chống Oversell (k6)

Đảm bảo backend đang chạy, sử dụng PowerShell để chạy thử nghiệm tải dưới local:

* **Mô phỏng luồng đặt vé chịu tải thường**:
  ```powershell
  .\scripts\k6-ticketing-flow.local.ps1
  ```
  *(Chứng minh cơ chế Rate Limit trả về lỗi `429 Too Many Requests` khi gửi quá nhiều request).*

* **Mô phỏng đặt vé đồng thời kiểm tra chống Oversell**:
  ```powershell
  .\scripts\k6-oversell-check.local.ps1
  ```
  *(Chứng minh dù có 30 người đặt vé cùng lúc nhưng chỉ bán đúng số lượng vé tồn thực tế trong kho, không bán lố).*
