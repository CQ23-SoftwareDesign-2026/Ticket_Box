# Hướng dẫn khởi chạy Ticket Box

## Khuyến nghị cho giảng viên/người chấm

Hệ thống đã được triển khai đầy đủ trên production. Để kiểm tra toàn bộ chức năng, đặc biệt là thanh toán PayOS và webhook phát hành e-ticket, nên ưu tiên sử dụng:

- Web App: [https://web.ticketbox.retrobit.io.vn](https://web.ticketbox.retrobit.io.vn)
- Backend Swagger: [https://api.ticketbox.retrobit.io.vn/api/docs](https://api.ticketbox.retrobit.io.vn/api/docs)

PayOS webhook hiện được cấu hình trỏ tới Backend production. Chạy local vẫn kiểm tra được catalog, auth, giữ vé, API và giao diện, nhưng **không nên dùng để đánh giá payment end-to-end** nếu chưa cấu hình lại webhook PayOS thành public URL trỏ tới Backend local.

Tài liệu bên dưới dành cho trường hợp muốn clone source và chạy hệ thống trên máy local.

> Tất cả câu lệnh được chạy tại thư mục root `Ticket_Box`.

## 1. Yêu cầu

Cài đặt trước:

- Node.js và npm.
- Docker Desktop.
- Git.
- PostgreSQL database hoặc Supabase project.

Kiểm tra môi trường:

```powershell
node --version
npm --version
docker --version
git --version
```

## 2. Clone và cài dependencies

```powershell
git clone <repository-url>
cd Ticket_Box
npm install
```

## 3. Cấu hình Backend

> Nhóm đã cung cấp file `.env` dùng cho bài chấm trong gói bàn giao. Nếu không sử dụng file được cung cấp, tạo `.env` từ file mẫu và điền các biến môi trường theo hướng dẫn dưới đây.

Tạo `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Cập nhật các biến trong `.env`. File `.env.example` tại root là danh sách chuẩn đang khớp với source code. Tối thiểu để chạy các luồng chính cần có:

```env
# PostgreSQL runtime connection
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"

# Direct connection cho Prisma migration
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

REDIS_URL="redis://localhost:6379"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

PORT="3001"
JWT_SECRET="change-this-local-secret"
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# PayOS
PAYMENT_GATEWAY_TIMEOUT_MS="3000"
PAYOS_CLIENT_ID="your-client-id"
PAYOS_API_KEY="your-api-key"
PAYOS_CHECKSUM_KEY="your-checksum-key"

# Upload ảnh và sơ đồ ghế
SUPABASE_URL="your-supabase-project-url"
SUPABASE_KEY="your-supabase-key"
SUPABASE_BUCKET="concert-assets"
```

Các nhóm biến còn lại trong `.env.example`:

- `RESEND_API_KEY`, `EMAIL_FROM`: gửi email và e-ticket. Source cũng hỗ trợ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` nhưng các biến SMTP chưa được khai báo trong `.env.example`.
- `GEMINI_*`, `LLM_MOCK_ENABLED`: sinh tiểu sử nghệ sĩ bằng AI.
- `AUTH_LOGIN_*`, `CONCERT_DETAIL_*`, `TICKET_RESERVE_*`: tùy chỉnh rate limit; có thể giữ giá trị mẫu vì source đã có giá trị mặc định.
- `PAYMENT_GATEWAY_TIMEOUT_MS`: giữ `3000` khi chạy bình thường; không dùng giá trị stress-test như `1`.

Nếu dùng Supabase, lấy connection strings trong Database Settings. Không commit `.env` hoặc secret.

Backend nạp root `.env` bằng `dotenv/config`. Người chấm có thể đổi `PORT` trong `.env`; nếu không khai báo, Backend dùng port `3000` theo giá trị mặc định trong source.

## 4. Cấu hình Web App

> Nhóm đã cung cấp file môi trường của Web App trong gói bàn giao. Nếu không sử dụng file được cung cấp, tạo `apps/web-app/.env.local` từ file mẫu như bên dưới.

```powershell
Copy-Item apps/web-app/.env.example apps/web-app/.env.local
```

File `apps/web-app/.env` và `.env.example` hiện mặc định gọi Backend production:

```env
NEXT_PUBLIC_API_BASE_URL=/api/proxy
NEXT_PUBLIC_API_URL=https://api.ticketbox.retrobit.io.vn/
REMOTE_API_URL=https://api.ticketbox.retrobit.io.vn/
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Nếu chỉ chạy giao diện local nhưng vẫn dùng API production, giữ nguyên các URL trên.

Nếu muốn Web App local gọi Backend local, sửa `apps/web-app/.env.local` thành:

```env
NEXT_PUBLIC_API_BASE_URL=/api/proxy
NEXT_PUBLIC_API_URL=http://localhost:3001
REMOTE_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Chạy Redis và RabbitMQ

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml ps
```

| Service             | Địa chỉ                                  |
| ------------------- | ---------------------------------------- |
| Redis               | `localhost:6379`                         |
| RabbitMQ            | `localhost:5672`                         |
| RabbitMQ Management | `http://localhost:15672` (`guest/guest`) |

## 6. Chuẩn bị database bằng Prisma

Chạy đúng thứ tự:

```powershell
# 1. Kiểm tra schema
npm run prisma:validate

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Kiểm tra migration
npx prisma migrate status

# 4. Áp dụng migration có sẵn
npm run db:migrate:deploy
```

### Seed dữ liệu mẫu

> Chúng em đã seed sẵn dữ liệu trên database gốc, nên không cần chạy lệnh seed này.

> Cảnh báo: seed sẽ `TRUNCATE` các bảng nghiệp vụ và tạo lại dữ liệu mẫu. Không chạy trên database có dữ liệu cần giữ.

```powershell
npm run db:seed
```

Seed thành công khi terminal kết thúc bằng:

```text
Seed completed.
```

### Tài khoản mẫu sau khi seed

Mật khẩu chung: `123456`

| Vai trò   | Email                            |
| --------- | -------------------------------- |
| Audience  | `audience1@ticketbox.local`      |
| Admin     | `vy.admin@ticketbox.local`       |
| Organizer | `tuan.organizer@ticketbox.local` |
| Checker   | `quang.checker@ticketbox.local`  |

## 7. Chạy Backend

Backend production: `https://api.ticketbox.retrobit.io.vn/api/docs`.

Source tại `apps/backend-api/src/main.ts` nạp root `.env` và dùng `process.env.PORT ?? 3000`. Vì vậy người chấm có thể đổi port bằng biến `PORT`; nếu biến này không tồn tại thì Backend chạy port `3000`.

Nếu chỉ chạy Backend, có thể dùng mặc định `3000`. Nếu chạy cùng Web App local, đặt Backend thành `3001` để tránh trùng port.

Đảm bảo Redis và RabbitMQ đã chạy:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Mở terminal PowerShell mới tại root:

```powershell
npm run start:api
```

- Backend khi đặt `PORT=3001`: `http://localhost:3001`
- Swagger local: `http://localhost:3001/api/docs`

- Backend tự nạp các biến database, JWT, Redis, RabbitMQ, PayOS, email, Supabase, Gemini và `PORT` từ root `.env`.
- Với `PORT="3001"` trong `.env`, Backend không trùng port `3000` của Web App.

Nếu muốn chạy Backend tại port `3000`, đổi thành `PORT="3000"` và đặt `BACKEND_URL=http://localhost:3000` trong root `.env`.

## 8. Chạy Web App

Web App production: `https://web.ticketbox.retrobit.io.vn`.

Next.js mặc định chạy port `3000`. Mở terminal khác tại root:

```powershell
npm run start:web
```

Web App: `http://localhost:3000`

Web App gọi API qua `/api/proxy`. Proxy đọc `REMOTE_API_URL`, sau đó fallback sang `NEXT_PUBLIC_API_URL` trong `apps/web-app/.env.local`.

Sau khi đổi `.env.local`, phải restart Web App.

### Giới hạn khi kiểm tra payment local

PayOS gửi webhook tới URL đã đăng ký trên PayOS Dashboard, hiện là Backend production. Nếu tạo payment từ Backend local:

1. Local có thể gọi PayOS và nhận QR nếu dùng đúng sandbox credentials.
2. Người dùng có thể quét QR thanh toán.
3. PayOS webhook vẫn được gửi về production, không phải `localhost`.
4. Backend local có thể không nhận được xác nhận để chuyển order sang `PAID` và phát hành e-ticket.

Muốn test payment end-to-end local phải:

- expose Backend local bằng public tunnel như ngrok hoặc Cloudflare Tunnel;
- đăng ký PayOS webhook thành `<public-backend-url>/payments/webhook`;
- đặt `FRONTEND_URL` đúng URL frontend của môi trường test;
- dùng database và PayOS sandbox credentials tương ứng.

Nếu không cấu hình lại webhook, hãy kiểm tra payment end-to-end trên Web App production.

## 9. Kiểm tra hệ thống

Kiểm tra API:

```powershell
curl.exe "http://localhost:3001/concerts?page=1&limit=10"
```

Kiểm tra giao diện:

1. Mở `http://localhost:3000`.
2. Đăng nhập bằng tài khoản seed.
3. Mở danh sách concert.
4. Chọn concert, hạng vé và số lượng.
5. Bấm mua vé để kiểm tra checkout.

Kiểm tra source:

```powershell
npm run lint
npm run typecheck:api
npm run test:api:unit
npm run build
```

## 10. Lỗi thường gặp

### Không kết nối được database

- Kiểm tra `DATABASE_URL` và `DIRECT_URL`.
- Kiểm tra password đã URL encode nếu có ký tự đặc biệt.
- Kiểm tra Supabase project và kết nối Internet.

### Redis hoặc RabbitMQ chưa chạy

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml ps
```

### Prisma Client thiếu model/field

```powershell
npm run prisma:generate
npm run typecheck:api
```

### Seed lỗi giữa chừng

Seed không chạy trong một transaction toàn cục. Sửa nguyên nhân rồi chạy lại:

```powershell
npm run db:seed
```

Bước clear đầu tiên sẽ xóa dữ liệu seed dở và tạo lại từ đầu.

### Port 3000 hoặc 3001 đang được dùng

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue
```

Nếu đổi port Backend, cập nhật đồng thời `PORT` và `BACKEND_URL` trong root `.env`, cùng `REMOTE_API_URL` và `NEXT_PUBLIC_API_URL` trong `apps/web-app/.env.local`.

## 11. Tắt hệ thống

Dừng Backend và Web App bằng `Ctrl + C` trong từng terminal.

Dừng Redis và RabbitMQ:

```powershell
docker compose -f infrastructure/docker-compose.yml down
```
