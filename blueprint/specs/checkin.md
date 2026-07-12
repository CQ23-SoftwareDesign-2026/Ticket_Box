# Đặc tả: Check-in và soát vé offline

## Mô tả
Tính năng check-in cho phép nhân sự soát vé xác thực QR ticket tại cổng vào concert. Hệ thống hiện có gồm:

- Backend API trong `apps/backend-api/src/modules/checkin`.
- Mobile staff app trong `apps/mobile-app/ticketbox/src/features/checkin`.
- Web admin dùng để phân công checker theo concert/gate trong `apps/web-app/src/app/admin/assignments`.

Hệ thống hỗ trợ hai chế độ soát vé:

- Online scan: mobile app gọi backend ngay khi quét QR.
- Offline prefetch/sync: mobile app tải trước danh sách `qr_code_hash` hợp lệ theo concert/gate, cho phép scan khi mất mạng, sau đó đồng bộ lại lên backend khi có mạng.

Mục tiêu là đảm bảo vé hợp lệ được chấp nhận nhanh, vé sai cổng/chưa thanh toán bị từ chối, và một vé không thể được check-in thành công hai lần trên server.

## Luồng chính

### Tổng quan
```txt
Admin phân công checker
  -> Checker đăng nhập mobile app
  -> GET /checkin/my-assignments
  -> Chọn concert/gate
  -> GET /checkin/prefetch/:concert_id?gate_number=...
  -> Lưu session + danh sách hash vào AsyncStorage
  -> Mở camera scanner
      -> Nếu online: POST /checkin/scan
      -> Nếu offline: validate bằng hash local, ghi pending queue
  -> Khi có mạng lại: POST /checkin/sync
```

### 1. Phân công checker
Phần admin trên web quản lý checker assignment qua các API `/checkin/assignments`.

Checker chỉ được scan khi có bản ghi phân công khớp:

- `checker_id`
- `concert_id`
- `gate_number`

Backend dùng `assertCheckerAssigned()` để chặn checker không thuộc cổng hiện tại. Nếu không có assignment, API trả `403 Forbidden`.

### 2. Lấy danh sách assignment trên mobile
Mobile app gọi `GET /checkin/my-assignments`.

Backend:

1. Yêu cầu JWT hợp lệ.
2. Yêu cầu permission `SCAN_TICKET`.
3. Chỉ trả assignment của concert đang `PUBLISHED`.
4. Với mỗi gate, đếm số ticket chưa scan, order `PAID`, thuộc gate đó.

Response gồm `concert_id`, `concert_name`, `location`, `start_time`, `gate_number`, `gate_label`, `ticket_count`.

Mobile app sau đó gọi thêm API concert detail để hiển thị ticket type label theo `gate_number`.

### 3. Prefetch trước khi scan
Khi checker chọn một assignment và bấm start scanning, mobile app gọi:

```txt
GET /checkin/prefetch/:concert_id?gate_number=1
```

Backend kiểm tra:

- Checker có assignment đúng concert/gate.
- Concert tồn tại.
- Concert đang `PUBLISHED`.

Backend chỉ trả danh sách `qr_code_hash` của ticket:

- Thuộc concert hiện tại.
- Thuộc ticket category có `gate_number` tương ứng.
- Order có status `PAID`.
- Ticket chưa được scan.

Response:

```json
[
  "qr_hash_1",
  "qr_hash_2"
]
```

Mobile app lưu vào AsyncStorage:

- `ticketbox.staff.currentScanSession`: thông tin concert/gate đang scan.
- `ticketbox.staff.prefetchedTicketSet`: danh sách hash, `concertId`, `gateNumber`, `prefetchedAt`.

Prefetch hiện tại được xem là hết hạn sau 30 phút. Nếu quá 30 phút, offline scan sẽ yêu cầu refresh session trước khi tiếp tục.

### 4. Online scan
Khi thiết bị có mạng, mobile app quét QR và gọi:

```txt
POST /checkin/scan
```

Request:

```json
{
  "concert_id": "concert-uuid",
  "gate_id": 1,
  "qr_code_hash": "ticket-qr-hash",
  "scanned_at": "2026-07-12T10:00:00.000Z"
}
```

Backend xử lý:

1. Kiểm tra checker có assignment đúng concert/gate.
2. Tìm ticket theo `qr_code_hash`.
3. Kiểm tra ticket đúng gate và đúng concert.
4. Kiểm tra order đã `PAID`.
5. Nếu ticket chưa scan, cập nhật bằng conditional update:

```txt
update ticket
where id = ticket.id and is_scanned = false
set is_scanned = true, scanned_at = ..., scanned_by = ...
```

Trong code, thao tác này dùng `updateMany` với điều kiện `is_scanned: false`. Nếu hai request scan cùng một vé cùng lúc, chỉ một request có `count = 1`; request còn lại trả `DUPLICATE`.

Status có thể trả về:

| Status | Ý nghĩa | Hành động |
| --- | --- | --- |
| `ACCEPTED` | Vé hợp lệ, check-in thành công | Cho khách vào cổng |
| `DUPLICATE` | Vé đã được scan trước đó | Từ chối/kiểm tra lại |
| `INVALID_GATE` | Vé sai cổng hoặc sai concert | Hướng dẫn sang đúng cổng |
| `NOT_FOUND` | QR không tồn tại | Từ chối vé |
| `UNPAID` | Order chưa thanh toán | Từ chối vé |

Nếu online scan `ACCEPTED`, mobile app cũng lưu hash vào local scanned bucket để nhận diện duplicate trên chính thiết bị.

### 5. Offline scan trên mobile
Khi `expo-network` báo thiết bị offline, mobile app không gọi backend mà dùng `processOfflineScan()`.

Mobile app kiểm tra:

1. Có prefetched set khớp `concertId` và `gateNumber` của session hiện tại không.
2. Prefetch có hết hạn 30 phút chưa.
3. QR có nằm trong danh sách hash đã prefetch không.
4. QR đã được scan trên thiết bị này chưa.
5. QR đã nằm trong pending sync queue chưa.

Nếu hợp lệ, app:

- Hiển thị `Offline ticket accepted`.
- Lưu hash vào `ticketbox.staff.localScannedBuckets`.
- Thêm record vào `ticketbox.staff.pendingSyncQueue`.
- Ghi lịch sử gần đây vào `ticketbox.staff.recentScanHistory`.

Pending item có dạng:

```json
{
  "id": "pending:concert:gate:hash:timestamp",
  "concertId": "concert-uuid",
  "gateNumber": 1,
  "qrCodeHash": "ticket-qr-hash",
  "scannedAt": "2026-07-12T10:01:00.000Z",
  "scannedBy": "checker-id"
}
```

Lưu ý: offline mode chỉ có thể validate trong phạm vi danh sách hash đã prefetch. Server vẫn là nguồn sự thật cuối cùng khi sync.

### 6. Sync khi có mạng lại
Mobile app tự động sync khi:

- Thiết bị online lại.
- Có session hiện tại.
- Có user đang đăng nhập.
- Pending queue của session hiện tại không rỗng.

Mobile app gọi:

```txt
POST /checkin/sync
```

Request:

```json
{
  "concert_id": "concert-uuid",
  "gate_id": 1,
  "updates": [
    {
      "qr_code_hash": "ticket-qr-hash-1",
      "scanned_at": "2026-07-12T10:01:00.000Z"
    }
  ]
}
```

Backend xử lý:

1. Kiểm tra checker còn được phân công đúng concert/gate.
2. Sort input theo `qr_code_hash` để giảm rủi ro deadlock.
3. Deduplicate input, giữ bản ghi có `scanned_at` sớm nhất cho mỗi QR.
4. Query tất cả ticket trong batch theo scope concert/gate.
5. Với ticket chưa scan, update bằng `updateMany` với `is_scanned = false`.
6. Với ticket đã scan, tăng `conflicts`.
7. Với QR không tồn tại hoặc không thuộc scope, tăng `errors`.

Response:

```json
{
  "success": true,
  "processed": 5,
  "updated": 3,
  "conflicts": 2,
  "errors": 0
}
```

Ý nghĩa:

- `processed`: tổng số record client gửi lên.
- `updated`: số ticket server chuyển sang đã scan.
- `conflicts`: ticket đã scan trước đó hoặc duplicate trong batch.
- `errors`: QR không tìm thấy hoặc không thuộc concert/gate.
- `success`: `true` khi không có error về scope/not found; conflict là trạng thái nghiệp vụ hợp lệ.

Sau khi sync thành công, mobile app xóa các item đã xử lý khỏi pending queue, cập nhật `syncedCount`, `duplicateCount`, và ghi history `SYNCED`/`SYNC_CONFLICT`.

Nếu sync thất bại hoặc server trả `success = false`, mobile app giữ queue trên thiết bị để retry sau.

## Kịch bản lỗi

### Auth/permission
- Thiếu JWT hoặc token không hợp lệ: `401 Unauthorized`.
- User không có permission `SCAN_TICKET`: bị guard từ chối.
- Checker không có assignment đúng concert/gate: `403 Forbidden`.

### Prefetch
- Thiếu `gate_id`/`gate_number`: `400 Bad Request`.
- Gate không phải số: `400 Bad Request`.
- Concert không tồn tại: `404 Not Found`.
- Concert chưa `PUBLISHED`: `400 Bad Request`.

### Online scan
- QR không tồn tại: `{ "status": "NOT_FOUND" }`.
- QR thuộc gate/concert khác: `{ "status": "INVALID_GATE" }`.
- Order chưa `PAID`: `{ "status": "UNPAID" }`.
- Ticket đã scan: `{ "status": "DUPLICATE", "scanned_at": "...", "scanned_by": "..." }`.
- Hai request scan cùng vé đồng thời: chỉ một request `ACCEPTED`, request còn lại `DUPLICATE`.

### Offline scan
- Prefetch không khớp session: mobile app cảnh báo `Prefetch expired for this session`.
- Prefetch quá 30 phút: mobile app yêu cầu refresh session.
- QR không nằm trong offline set: mobile app hiển thị `NOT_FOUND`.
- QR đã scan trên thiết bị hoặc đã nằm trong pending queue: mobile app hiển thị `DUPLICATE`.

### Offline sync
- Queue rỗng: backend trả success với counter bằng 0.
- QR không thuộc scope: tăng `errors`.
- Ticket đã scan trước đó: tăng `conflicts`.
- Duplicate trong batch: backend giữ bản ghi sớm nhất, phần trùng tính vào `conflicts`.
- Transaction lỗi: backend trả `success = false`, `errors = processed`; mobile app giữ queue để retry.

## Ràng buộc

- Chỉ checker có permission `SCAN_TICKET` mới được gọi API check-in.
- Checker chỉ được scan concert/gate được phân công.
- Prefetch chỉ trả QR hash, không trả thông tin cá nhân/order/giá vé.
- Prefetch chỉ trả ticket đã thanh toán và chưa scan.
- Online scan và sync phải dùng conditional update `is_scanned = false` để chống race condition.
- Offline sync phải sort và deduplicate input trước khi update.
- Backend không overwrite ticket đã scan bằng scan offline đến muộn.
- Gate number là một phần của security scope.
- Mobile app phụ thuộc vào AsyncStorage; nếu người dùng xóa data app thì session/pending queue local sẽ mất.
- Backend sync hiện trả summary count, chưa trả kết quả chi tiết theo từng QR.

## Tiêu chí chấp nhận

- Checker đăng nhập mobile app xem được assignment của mình.
- Checker không được phân công không thể prefetch/scan gate đó.
- Prefetch trả đúng hash của ticket đã `PAID`, chưa scan, đúng gate.
- Mobile app lưu session và prefetched hash vào AsyncStorage.
- Online scan vé hợp lệ trả `ACCEPTED` và set `is_scanned = true`.
- Scan lại cùng QR trả `DUPLICATE`.
- Scan sai gate/concert trả `INVALID_GATE`.
- Scan QR không tồn tại trả `NOT_FOUND`.
- Scan ticket chưa `PAID` trả `UNPAID`.
- Offline scan hợp lệ được lưu vào pending queue.
- Khi online lại, pending queue được sync lên backend.
- Sync conflict không ghi đè trạng thái đã scan trên server.
- Hai scan đồng thời cùng một ticket không thể cùng `ACCEPTED`.

## Kiểm thử đề xuất

### Manual test
- Đăng nhập mobile app bằng checker có permission `SCAN_TICKET`.
- Vào session setup, kiểm tra danh sách assignment.
- Chọn concert/gate và start scanning, kiểm tra prefetch hash thành công.
- Online: scan một QR hợp lệ, kỳ vọng `ACCEPTED`.
- Online: scan lại QR đó, kỳ vọng `DUPLICATE`.
- Online: scan QR sai gate, kỳ vọng `INVALID_GATE`.
- Offline: tắt mạng, scan QR có trong prefetched set, kỳ vọng pending sync tăng.
- Offline: scan lại QR đó trên cùng thiết bị, kỳ vọng duplicate local.
- Bật mạng lại, kỳ vọng app tự động sync pending queue.
- Kiểm tra DB ticket đã có `is_scanned = true`, `scanned_at`, `scanned_by`.

### Automated test hiện có
`apps/backend-api/tests/checkin.unit.ts` kiểm tra các case chính:

- Prefetch đúng concert/gate.
- Prefetch lỗi khi thiếu gate, sai assignment, concert không tồn tại, concert chưa publish.
- `getMyAssignments` chỉ trả concert `PUBLISHED`.
- Sync queue rỗng.
- Sync ticket chưa scan.
- Sync ticket đã scan thành conflict.
- Sync sort/deduplicate QR.
- Sync scope theo concert/gate.
- Online scan trả `ACCEPTED`, `DUPLICATE`, `INVALID_GATE`, `NOT_FOUND`, `UNPAID`.
## Phân tích trade-off

### Online scan bằng conditional update
- Ưu điểm: chống hai thiết bị scan cùng một vé thành công cùng lúc, vì chỉ request đầu tiên update được `is_scanned = false`.
- Nhược điểm: vẫn cần query ticket trước để biết lý do lỗi như sai gate, unpaid hoặc duplicate.
- Lý do phù hợp: check-in cần tính nhất quán mạnh ở từng ticket nhưng không cần lock toàn bộ concert/gate.

### Offline prefetch chỉ lưu QR hash
- Ưu điểm: giảm dữ liệu nhạy cảm trên thiết bị, vẫn đủ để kiểm tra vé trong phạm vi gate.
- Nhược điểm: khi offline, app không biết trạng thái mới nhất nếu vé vừa bị scan ở thiết bị khác sau thời điểm prefetch.
- Lý do phù hợp: tại cổng sự kiện mạng có thể yếu; prefetch hash là cách cân bằng giữa vận hành offline và bảo mật dữ liệu.

### Sync offline theo batch
- Ưu điểm: giảm số request khi mạng phục hồi, backend có thể sort/deduplicate để xử lý ổn định hơn.
- Nhược điểm: response hiện chỉ là summary count, chưa cho biết chính xác từng QR nào conflict/error.
- Lý do phù hợp: đủ tốt cho vận hành cơ bản; có thể mở rộng response per-item nếu cần audit chi tiết.

### Server là nguồn sự thật cuối cùng
- Ưu điểm: tránh việc nhiều thiết bị offline cùng tự quyết định trạng thái cuối cùng của vé.
- Nhược điểm: checker có thể đã cho khách vào ở chế độ offline nhưng khi sync mới phát hiện conflict.
- Lý do phù hợp: với môi trường offline, không thể đảm bảo đồng bộ tức thời; server-side reconciliation là lựa chọn thực tế nhất.
