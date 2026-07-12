# TicketBox Staff Mobile App

Đây là ứng dụng mobile dành cho nhân sự soát vé của hệ thống TicketBox.

Các chức năng chính:

- đăng nhập bằng tài khoản staff
- chọn concert và gate trước khi quét
- quét mã QR vé
- hỗ trợ quét offline
- tự đồng bộ lại khi có mạng

## Yêu cầu

Trước khi chạy app, cần có:

- Node.js `20+`
- `npm`
- điện thoại cài `Expo Go`
- điện thoại và máy tính cùng mạng Wi-Fi
- cấp quyền camera cho app khi được hỏi

## Cách chạy mobile app

Người chấm chỉ cần chạy trực tiếp trong thư mục mobile app:

```bash
git clone <repo-url>
cd Ticket_Box/apps/mobile-app/ticketbox
npm install
```

Tạo file `.env` từ `.env.example`:

Trên Windows:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Sau đó chạy:

```bash
npm run start
```

Khi Expo mở lên:

- mở `Expo Go` trên điện thoại
- quét mã QR hiển thị trên terminal hoặc trình duyệt

## Chạy với backend deploy

Đây là cách nên dùng khi demo hoặc chấm bài.

Trong file `apps/mobile-app/ticketbox/.env`, đặt:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.ticketbox.retrobit.io.vn
```

Với cách này, người chấm không cần sửa code và không cần tự nối API thủ công trong source code.

## Chạy với backend local

Nếu backend local đã chạy sẵn, chỉ cần đổi giá trị trong `.env`.

Đặt `EXPO_PUBLIC_API_BASE_URL` theo thiết bị đang dùng:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- iPhone hoặc Android thật: `http://<dia-chi-ip-lan-cua-may-tinh>:3000`

Ví dụ:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
```

Lưu ý:

- nếu dùng điện thoại thật thì không dùng `localhost`
- điện thoại và máy tính phải cùng Wi-Fi

## Tài khoản test local

Nếu backend local đã seed dữ liệu, có thể dùng:

- Email: `quang.checker@ticketbox.local`
- Password: `123456`

Tài khoản admin nếu cần:

- Email: `vy.admin@ticketbox.local`
- Password: `123456`

## Luồng demo nhanh

1. Đăng nhập bằng tài khoản staff.
2. Vào màn hình scanner.
3. Chọn concert.
4. Chọn gate.
5. Chờ prefetch hoàn tất.
6. Quét vé online.
7. Tắt mạng để thử offline queue.
8. Bật mạng lại để kiểm tra auto sync.

## Lỗi thường gặp

### Không mở được app trên điện thoại bằng Expo Go

Kiểm tra:

- đã chạy `npm install` trong `apps/mobile-app/ticketbox`
- đã chạy `npm run start`
- điện thoại có cài `Expo Go`
- điện thoại và máy tính cùng Wi-Fi

### App báo thiếu biến môi trường

Kiểm tra:

- đã tạo file `.env`
- đã có `EXPO_PUBLIC_API_BASE_URL`

### Điện thoại không gọi được backend local

Kiểm tra:

- không dùng `localhost` trên điện thoại thật
- dùng đúng IP LAN của máy tính
- firewall không chặn cổng `3000`

### Quét QR không hoạt động

Kiểm tra:

- đã cấp quyền camera
- đã chọn concert và gate
- prefetch đã hoàn tất

## Tài liệu liên quan

- Hướng dẫn test: [TEST_GUIDE.md](/D:/document/study/projects/Ticket_Box/apps/mobile-app/ticketbox/TEST_GUIDE.md:1)
- Hướng dẫn demo: [DEMO_GUIDE.md](/D:/document/study/projects/Ticket_Box/apps/mobile-app/ticketbox/DEMO_GUIDE.md:1)
