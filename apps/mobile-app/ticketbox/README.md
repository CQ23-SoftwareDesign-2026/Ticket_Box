# TicketBox Mobile App

## Mục tiêu của app

Đây là mobile app dành cho nhân sự soát vé của hệ thống TicketBox.

Mục tiêu chính của app:

- đăng nhập bằng tài khoản staff
- chặn tài khoản `Audience` không cho dùng chức năng soát vé
- chọn concert và gate trước khi làm việc
- quét mã QR của vé tại cổng
- vẫn hoạt động được khi mất mạng
- tự đồng bộ lại dữ liệu scan khi có mạng trở lại

Trong phạm vi đồ án hiện tại, mobile app không ưu tiên làm audience app mua vé. Trọng tâm là:

- `Checker` app
- offline check-in
- giao diện đẹp, rõ trạng thái, đủ tốt để demo và lấy điểm cao

## Tài liệu nội bộ quan trọng

Các tài liệu đã có sẵn trong app:

- Phân tích backend và kế hoạch mobile tổng thể:
  [mobile-backend-analysis-and-plan.md](/D:/document/study/projects/Ticket_Box/apps/mobile-app/ticketbox/mobile-backend-analysis-and-plan.md:1)
- Báo cáo chi tiết về module check-in backend:
  [checkin-backend-detailed-report.md](/D:/document/study/projects/Ticket_Box/apps/mobile-app/ticketbox/checkin-backend-detailed-report.md:1)

Khi bắt đầu làm feature check-in, nên đọc 2 file trên trước.

## Backend mà mobile app sẽ dùng

Các API quan trọng nhất đối với mobile:

- `POST /auth/login`
- `GET /auth/me`
- `GET /concerts`
- `GET /concerts/:id`
- `GET /checkin/prefetch/:concert_id?gate_id=...`
- `POST /checkin/scan`
- `POST /checkin/sync`

Quy tắc phân quyền:

- `Checker` được dùng app soát vé
- `Admin` cũng có thể vào flow staff
- `Audience` không được dùng flow soát vé

## Hướng kiến trúc mobile app

Mobile app nên đi theo hướng `offline-capable staff operations app`.

Luồng chính:

1. Staff đăng nhập
2. App kiểm tra role/permission
3. Staff chọn concert
4. Staff chọn gate
5. App prefetch danh sách vé hợp lệ cho gate đó
6. Staff bắt đầu scan
7. Nếu online thì gọi API scan trực tiếp
8. Nếu offline thì validate local và lưu hàng đợi sync
9. Khi có mạng lại thì tự đồng bộ lên backend

## Các phần dữ liệu local cần có

Đây là các khối local state/storage bắt buộc phải xây:

- `current_scan_session`
  - lưu concert hiện tại, gate hiện tại, thời điểm prefetch
- `allowed_hashes`
  - danh sách `qr_code_hash` hợp lệ cho phiên scan hiện tại
- `locally_scanned_hashes`
  - tập vé đã được thiết bị này chấp nhận local
- `pending_sync_queue`
  - hàng đợi các vé đã scan khi offline nhưng chưa gửi lên server
- `recent_scan_history`
  - lịch sử scan gần đây để hiển thị UI

## Các màn hình cần có

Những màn hình nên triển khai trong giai đoạn này:

- `LoginScreen`
- `PendingApprovalScreen`
- `StaffHomeScreen`
- `CheckinSessionSetupScreen`
- `ScannerScreen`
- `ProfileScreen`

Nếu còn thời gian có thể thêm:

- `SyncQueueScreen`
- `RecentScansScreen`

## Kế hoạch triển khai rõ ràng

## Giai đoạn 1: Chốt khung app staff

Mục tiêu:

- biến app thành đúng mobile app dành cho staff, không còn cảm giác scaffold demo

Việc cần làm:

- chỉnh lại `login screen`
- chỉnh lại `pending approval screen`
- chỉnh lại `staff home`
- làm copy rõ ràng hơn theo ngữ cảnh soát vé
- giữ rule:
  - `Checker` và `Admin` được vào
  - `Audience` bị chặn

Kết quả mong đợi:

- app đăng nhập ổn định
- luồng auth sạch
- đúng định hướng sản phẩm

## Giai đoạn 2: Làm session setup

Mục tiêu:

- staff phải chọn concert và gate trước khi scan

Việc cần làm:

- tạo API client cho `concerts` và `checkin/prefetch`
- tạo màn hình chọn concert
- tạo bước chọn gate từ `ticketTiers.gate_number`
- lưu `current_scan_session`

Kết quả mong đợi:

- staff vào app và bắt đầu được một “ca trực scan”

## Giai đoạn 3: Làm local offline layer

Mục tiêu:

- chuẩn bị dữ liệu cho scan offline

Việc cần làm:

- tạo storage helpers
- tạo model dữ liệu local
- thêm logic:
  - kiểm tra hash có hợp lệ local không
  - kiểm tra đã scan local chưa
  - thêm vé vào queue sync
  - cập nhật trạng thái sau sync

Kết quả mong đợi:

- app có thể xử lý nghiệp vụ offline đúng hướng, dù chưa mở camera

## Giai đoạn 4: Làm scanner thật

Mục tiêu:

- scan QR trên điện thoại

Việc cần làm:

- tích hợp camera QR
- làm scanner screen
- thêm debounce chống quét lặp
- xử lý 2 mode:
  - online
  - offline

Kết quả mong đợi:

- staff quét được vé thật
- app trả kết quả rõ ràng

## Giai đoạn 5: Làm sync lại khi có mạng

Mục tiêu:

- hoàn thành phần quan trọng nhất của đề

Việc cần làm:

- detect network state
- khi offline:
  - validate local
  - thêm vào `pending_sync_queue`
- khi online lại:
  - gọi `POST /checkin/sync`
  - xử lý `updated`, `conflicts`, `errors`

Kết quả mong đợi:

- demo được mất mạng vẫn quét
- có mạng lại thì đồng bộ lên backend

## Giai đoạn 6: Polish giao diện

Mục tiêu:

- đưa app lên mức demo-ready

Việc cần làm:

- chỉnh theme
- nhấn mạnh trạng thái:
  - `ONLINE`
  - `OFFLINE`
  - `SYNCING`
- thêm dashboard scanner:
  - số vé accepted
  - số duplicate
  - số pending sync
- cải thiện typography, spacing, card, button, motion nhẹ

Kết quả mong đợi:

- app đẹp, rõ, chuyên nghiệp hơn

## Ưu tiên công việc ngay bây giờ

Nếu bắt tay code ngay, thứ tự nên là:

1. Tạo `checkinApi`
2. Tạo `CheckinSessionSetupScreen`
3. Tạo local storage cho offline data
4. Tạo `ScannerScreen`
5. Tạo logic sync queue

Không nên nhảy vào làm UI scanner trước khi chưa có:

- session setup
- prefetch
- local storage

## Thứ tự ưu tiên nếu không đủ thời gian

Nếu không thể hoàn thiện hết, thứ tự ưu tiên là:

1. Đăng nhập staff + chặn audience
2. Chọn concert/gate
3. Prefetch offline data
4. Scanner QR thật
5. Offline queue + sync
6. UI polish
7. Màn phụ như history hoặc sync details

Nếu 3, 4, 5 chưa xong thì app chưa đạt đúng trọng tâm của đề.

## Cách chạy app

1. Cài dependency:

```bash
npm install
```

2. Chạy Expo:

```bash
npx expo start
```

3. Chuẩn bị backend API đang chạy để mobile có thể gọi:

- `auth`
- `concerts`
- `checkin`

## Ghi chú phát triển

- Khi làm feature mới, ưu tiên tạo trong `src/features/checkin`.
- Chỉ nên thêm những gì trực tiếp phục vụ use case soát vé.
- Mọi quyết định về offline nên bám vào thiết kế của backend `checkin`.
- Không mở rộng phạm vi sang audience app trong giai đoạn nước rút này.
