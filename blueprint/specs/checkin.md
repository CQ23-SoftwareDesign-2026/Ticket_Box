# Đặc tả: Check-in APIs

## API: `GET /checkin/my-assignments`

### Mô tả
API trả danh sách concert/gate mà checker hiện tại được phân công. Mobile app dùng API này để checker chọn phiên soát vé trước khi prefetch và scan.

### Luồng chính
Quy trình bắt đầu khi nhân sự soát vé mở mobile staff app để chuẩn bị phiên check-in.

1. Checker đăng nhập mobile app bằng tài khoản đã được admin cấp quyền.
2. Mobile lưu access token sau khi đăng nhập thành công.
3. Checker mở màn hình session setup.
4. Mobile gọi `GET /checkin/my-assignments` kèm access token.
5. Backend xác thực JWT để lấy `checker_id`.
6. Backend kiểm tra user có permission `SCAN_TICKET`.
7. Backend query bảng checker assignment theo `checker_id`.
8. Backend chỉ lấy assignment của các concert đang `PUBLISHED`.
9. Với mỗi assignment, backend tính `ticket_count` bằng cách đếm ticket:
   - thuộc concert được phân công
   - thuộc category có `gate_number` tương ứng
   - order status là `PAID`
   - ticket chưa được scan
10. Backend trả danh sách assignment cho mobile.
11. Mobile hiển thị từng assignment gồm tên concert, địa điểm, giờ diễn, gate label và số vé còn lại cần soát.
12. Checker chọn một assignment để bắt đầu prefetch.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có permission `SCAN_TICKET`: `403 Forbidden`.
- Checker chưa được phân công gate nào: trả danh sách rỗng.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ trả assignment của checker hiện tại.
- Chỉ trả concert đang `PUBLISHED`.
- Không trả assignment của checker khác.
- `ticket_count` chỉ tính ticket đã thanh toán và chưa scan.

### Tiêu chí chấp nhận
- Checker thấy đúng các gate được phân công.
- Checker không thấy assignment của người khác.
- Concert chưa publish không xuất hiện.
- Ticket count khớp số ticket paid/chưa scan của gate.

## API: `GET /checkin/prefetch/:concert_id`

### Mô tả
API tải trước danh sách `qr_code_hash` hợp lệ theo concert/gate để mobile app có thể soát vé offline.

### Luồng chính
Quy trình diễn ra trước khi checker vào màn hình camera scan. Đây là bước chuẩn bị để mobile có thể hoạt động cả khi mất mạng.

1. Checker chọn một assignment trên màn hình session setup.
2. Mobile lấy `concert_id` và `gate_number` từ assignment đã chọn.
3. Mobile gọi `GET /checkin/prefetch/:concert_id?gate_number=...`.
4. Backend xác thực JWT để lấy `checker_id`.
5. Backend kiểm tra permission `SCAN_TICKET`.
6. Backend kiểm tra có tồn tại assignment khớp `checker_id`, `concert_id`, `gate_number`.
7. Backend kiểm tra concert tồn tại.
8. Backend kiểm tra concert đang `PUBLISHED`.
9. Backend query danh sách ticket hợp lệ cho gate:
   - ticket thuộc category có `gate_number` tương ứng.
   - category thuộc đúng concert.
   - order của ticket có status `PAID`.
   - ticket có `is_scanned = false`.
10. Backend chỉ select `qr_code_hash`, không trả thông tin user/order/giá vé.
11. API trả mảng hash cho mobile.
12. Mobile lưu `PrefetchedTicketSet` vào AsyncStorage gồm:
   - `concertId`
   - `gateNumber`
   - `hashes`
   - `prefetchedAt`
13. Mobile lưu `CurrentScanSession` gồm thông tin concert/gate/ticket type để mở scanner.
14. Mobile chuyển sang màn hình scanner. Nếu sau đó mất mạng, app vẫn có thể kiểm tra QR bằng danh sách hash local.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- Thiếu `gate_id`/`gate_number`: `400 Bad Request`.
- Gate không phải số: `400 Bad Request`.
- Checker không được phân công gate đó: `403 Forbidden`.
- Concert không tồn tại: `404 Not Found`.
- Concert chưa `PUBLISHED`: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Prefetch chỉ trả QR hash, không trả thông tin cá nhân, order detail hoặc giá vé.
- Chỉ trả ticket đã thanh toán.
- Chỉ trả ticket chưa scan.
- Chỉ trả ticket trong đúng gate.
- Mobile xem prefetched set là hết hạn sau 30 phút.
- Trade-off: prefetch giúp offline nhưng dữ liệu có thể cũ nếu vé được scan ở thiết bị khác sau thời điểm prefetch.

### Tiêu chí chấp nhận
- Checker được phân công prefetch thành công.
- Checker không được phân công bị từ chối.
- Hash trả về chỉ thuộc concert/gate hiện tại.
- Hash không chứa ticket unpaid hoặc đã scan.
- Mobile dùng danh sách hash này để scan offline.

## API: `POST /checkin/scan`

### Mô tả
API xác thực một QR ticket theo thời gian thực khi thiết bị online. API trả trạng thái nghiệp vụ thay vì chỉ trả lỗi HTTP để mobile app hiển thị hành động phù hợp tại cổng.

### Luồng chính
Quy trình này áp dụng khi thiết bị đang online tại thời điểm quét vé.

1. Checker đưa camera vào QR trên vé của khách.
2. Mobile đọc được chuỗi QR và trim dữ liệu.
3. Mobile kiểm tra session hiện tại đang thuộc concert/gate nào.
4. Mobile gọi `POST /checkin/scan` với:
   - `concert_id`
   - `gate_id`
   - `qr_code_hash`
   - `scanned_at`
5. Backend xác thực JWT để lấy `checker_id`.
6. Backend kiểm tra checker có assignment đúng `concert_id` và `gate_id`.
7. Backend tìm ticket theo `qr_code_hash`, đồng thời include order và category.
8. Nếu không tìm thấy ticket, backend trả `NOT_FOUND`.
9. Nếu category gate không khớp `gate_id`, backend trả `INVALID_GATE`.
10. Nếu order concert không khớp `concert_id`, backend trả `INVALID_GATE`.
11. Nếu order chưa `PAID`, backend trả `UNPAID`.
12. Nếu ticket đã `is_scanned = true`, backend trả `DUPLICATE` kèm `scanned_at/scanned_by` nếu có.
13. Nếu ticket chưa scan, backend dùng `updateMany` với điều kiện:
   - `id = ticket.id`
   - `is_scanned = false`
14. Nếu `updateMany.count = 1`, backend trả `ACCEPTED` và lưu `scanned_at`, `scanned_by`.
15. Nếu `updateMany.count = 0`, nghĩa là request khác đã scan trước trong lúc xử lý; backend đọc lại thông tin scan mới nhất và trả `DUPLICATE`.
16. Mobile nhận status và hiển thị hướng xử lý tại cổng:
   - `ACCEPTED`: cho khách vào.
   - `DUPLICATE`: kiểm tra/từ chối.
   - `INVALID_GATE`: hướng dẫn sang đúng cổng.
   - `NOT_FOUND` hoặc `UNPAID`: từ chối.
17. Mobile lưu recent history để checker có thể xem các lần scan gần nhất.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- Checker không có quyền/gate assignment: `403 Forbidden`.
- QR không tồn tại: trả `{ status: "NOT_FOUND" }`.
- QR sai gate hoặc sai concert: trả `{ status: "INVALID_GATE" }`.
- Order chưa thanh toán: trả `{ status: "UNPAID" }`.
- Ticket đã scan: trả `{ status: "DUPLICATE", scanned_at, scanned_by }`.
- Hai thiết bị scan cùng vé đồng thời: chỉ một request `ACCEPTED`, request còn lại `DUPLICATE`.

### Ràng buộc
- Backend phải là nguồn sự thật cuối cùng cho trạng thái scan.
- Không được check-in ticket chưa `PAID`.
- Không được scan ticket sai gate.
- Update scan phải có điều kiện `is_scanned = false` để chống race condition.
- Không ghi đè `scanned_at/scanned_by` của ticket đã scan.

### Tiêu chí chấp nhận
- Vé hợp lệ trả `ACCEPTED` và DB set `is_scanned = true`.
- Scan lại cùng QR trả `DUPLICATE`.
- Scan sai gate trả `INVALID_GATE`.
- Scan QR không tồn tại trả `NOT_FOUND`.
- Scan ticket unpaid trả `UNPAID`.
- Hai request đồng thời không thể cùng `ACCEPTED`.

## API: `POST /checkin/sync`

### Mô tả
API đồng bộ các vé đã scan offline từ mobile app lên backend khi thiết bị có mạng lại. API xử lý theo batch và trả summary kết quả.

### Luồng chính
Quy trình này áp dụng sau khi checker đã scan offline và thiết bị có mạng trở lại.

1. Trong lúc offline, mobile đã lưu các vé được chấp nhận vào pending sync queue.
2. Mỗi pending item có `concertId`, `gateNumber`, `qrCodeHash`, `scannedAt`, `scannedBy`.
3. Mobile theo dõi network state bằng `expo-network`.
4. Khi thiết bị online lại, mobile kiểm tra:
   - có current session không.
   - có user đang đăng nhập không.
   - có pending queue cho session hiện tại không.
   - app không đang sync batch khác.
5. Mobile lấy queue theo `concertId` và `gateNumber`.
6. Mobile gọi `POST /checkin/sync` với:
   - `concert_id`
   - `gate_id`
   - `updates[]` gồm `qr_code_hash` và `scanned_at`.
7. Backend xác thực JWT để lấy checker.
8. Backend kiểm tra checker còn assignment đúng concert/gate.
9. Backend sort input theo `qr_code_hash` để giảm rủi ro deadlock khi nhiều batch sync đồng thời.
10. Backend deduplicate input, giữ bản ghi có `scanned_at` sớm nhất cho mỗi QR.
11. Backend query tất cả ticket matching trong scope concert/gate bằng một lần query.
12. Với mỗi QR:
   - Không tìm thấy hoặc ngoài scope: tăng `errors`.
   - Ticket đã scan: tăng `conflicts`.
   - Ticket chưa scan: đưa vào danh sách update.
13. Backend update từng ticket bằng `updateMany` với điều kiện `is_scanned = false`.
14. Nếu update thành công, tăng `updated`.
15. Nếu update không còn match vì request khác vừa scan trước, tăng `conflicts`.
16. Backend cộng duplicate trong batch vào `conflicts`.
17. Backend trả summary:
   - `processed`
   - `updated`
   - `conflicts`
   - `errors`
   - `success`
18. Mobile xử lý response:
   - Nếu `success = true`, xóa các item đã xử lý khỏi pending queue.
   - Nếu có conflict, ghi history `SYNC_CONFLICT`.
   - Nếu sync fail hoặc mất mạng giữa chừng, giữ queue để retry.
19. Mobile cập nhật số lượng `pending`, `synced`, `duplicate/conflict` trên UI.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- Checker không có assignment đúng gate: `403 Forbidden`.
- `updates` rỗng: trả success với counter bằng 0.
- QR đã scan trước đó: tăng `conflicts`.
- QR duplicate trong batch: giữ bản ghi sớm nhất, phần trùng tính vào `conflicts`.
- QR không tồn tại hoặc ngoài concert/gate: tăng `errors`.
- Transaction sync lỗi: trả `success = false`, `errors = processed`.
- Mất mạng trong lúc sync: mobile giữ queue để retry.

### Ràng buộc
- Sync không được overwrite ticket đã scan.
- Sync phải giới hạn theo concert/gate assignment.
- Input cần sort/deduplicate để giảm deadlock và xử lý trùng.
- Backend hiện trả summary count, chưa trả kết quả chi tiết từng QR.
- Trade-off: batch sync giảm số request nhưng conflict offline có thể chỉ được phát hiện muộn.

### Tiêu chí chấp nhận
- Queue rỗng trả success và counter bằng 0.
- Ticket chưa scan được update thành scanned.
- Ticket đã scan được tính conflict, không bị ghi đè.
- QR ngoài scope được tính error.
- Duplicate trong batch không tạo nhiều lần update.
- Khi sync thành công, mobile có thể xóa item đã xử lý khỏi queue.

## Luồng end-to-end: Soát vé offline và đồng bộ lại

### Mục tiêu
Luồng này mô tả cách hệ thống cho phép nhân sự soát vé tiếp tục làm việc khi thiết bị mất kết nối Internet tại cổng vào sự kiện. Mobile app tải trước danh sách QR hash hợp lệ theo concert/gate, dùng dữ liệu đó để kiểm tra vé offline, lưu các lượt scan vào local queue, sau đó đồng bộ lại backend khi có mạng.

Mục tiêu kỹ thuật:

- Cổng check-in không bị tê liệt khi mất mạng.
- Vé hợp lệ vẫn có thể được chấp nhận trong phạm vi gate đã phân công.
- Vé quét trùng trên cùng thiết bị bị chặn ngay tại local.
- Server vẫn là nguồn sự thật cuối cùng sau khi sync.
- Khi sync lại, backend không ghi đè vé đã scan trước đó.

### Thành phần tham gia
- **Admin web app:** tạo phân công checker theo concert/gate.
- **Mobile staff app:** dùng bởi checker để chọn gate, prefetch QR hash, scan online/offline và sync pending queue.
- **Backend Check-in API:** cung cấp API assignment, prefetch, online scan và offline sync.
- **PostgreSQL:** lưu user, checker assignment, order, ticket và trạng thái scan cuối cùng.
- **AsyncStorage trên mobile:** lưu current session, prefetched ticket set, local scanned bucket, pending sync queue và recent scan history.
- **Network detector (`expo-network`):** xác định thiết bị đang online/offline.

### Điều kiện bắt đầu
Trước khi check-in, hệ thống cần có:

1. Concert đã được tạo và ở trạng thái `PUBLISHED`.
2. Ticket category của concert có `gate_number`.
3. Người mua đã thanh toán thành công, order ở trạng thái `PAID`.
4. Ticket đã được phát hành và có `qr_code_hash`.
5. Admin đã phân công checker vào đúng `concert_id` và `gate_number`.
6. Checker đăng nhập mobile app bằng tài khoản có permission `SCAN_TICKET`.

### Quy trình xử lý

#### Giai đoạn 1: Admin phân công checker
1. Admin mở màn hình assignment trên web admin.
2. Admin chọn concert đang `PUBLISHED`.
3. Admin chọn checker.
4. Admin chọn `gate_number`.
5. Web app gọi API tạo assignment.
6. Backend kiểm tra admin có role `ADMIN`.
7. Backend kiểm tra concert, checker và gate hợp lệ.
8. Backend lưu `CheckerAssignment` vào PostgreSQL.

Kết quả của giai đoạn này là checker chỉ được phép thao tác với concert/gate đã được phân công.

#### Giai đoạn 2: Checker lấy danh sách assignment
1. Checker mở mobile staff app và đăng nhập.
2. Mobile app gọi `GET /checkin/my-assignments`.
3. Backend xác thực JWT.
4. Backend kiểm tra permission `SCAN_TICKET`.
5. Backend lấy các assignment của checker hiện tại.
6. Backend chỉ trả assignment của concert đang `PUBLISHED`.
7. Backend tính `ticket_count` cho từng gate bằng cách đếm ticket:
   - order status `PAID`
   - đúng concert
   - đúng `gate_number`
   - `is_scanned = false`
8. Mobile app hiển thị danh sách concert/gate để checker chọn.

Nếu checker không có assignment, mobile hiển thị trạng thái không có cổng được phân công.

#### Giai đoạn 3: Prefetch danh sách vé hợp lệ
1. Checker chọn một assignment.
2. Mobile app gọi `GET /checkin/prefetch/:concert_id?gate_number=<gate_number>`.
3. Backend xác thực JWT và permission `SCAN_TICKET`.
4. Backend kiểm tra checker có assignment đúng `concert_id` và `gate_number`.
5. Backend kiểm tra concert tồn tại và đang `PUBLISHED`.
6. Backend lấy danh sách ticket hợp lệ:
   - ticket thuộc concert hiện tại
   - ticket thuộc category có `gate_number` tương ứng
   - order đã `PAID`
   - ticket chưa scan
7. Backend chỉ trả mảng `qr_code_hash`, không trả thông tin cá nhân, order detail hoặc giá vé.
8. Mobile lưu dữ liệu vào AsyncStorage:
   - `ticketbox.staff.currentScanSession`
   - `ticketbox.staff.prefetchedTicketSet`

Trong `prefetchedTicketSet` có:

- `concertId`
- `gateNumber`
- `hashes`
- `prefetchedAt`

Prefetch được xem là hợp lệ trong 30 phút. Nếu quá 30 phút, mobile yêu cầu refresh session trước khi scan offline.

#### Giai đoạn 4: Thiết bị mất mạng
1. Khi đang ở màn hình scanner, mobile app theo dõi trạng thái mạng bằng `expo-network`.
2. Nếu `isConnected` hoặc `isInternetReachable` cho thấy thiết bị offline, app chuyển sang chế độ offline.
3. Ở chế độ offline, mobile không gọi backend khi quét QR.
4. Mọi quyết định tạm thời được thực hiện dựa trên prefetched hash local và local scanned bucket.

#### Giai đoạn 5: Scan vé offline
Khi checker quét QR trong lúc mất mạng:

1. Mobile đọc `qr_code_hash` từ QR.
2. Mobile lấy current session từ AsyncStorage.
3. Mobile lấy prefetched ticket set từ AsyncStorage.
4. Mobile kiểm tra prefetched set có khớp `concertId` và `gateNumber` của session hiện tại không.
5. Mobile kiểm tra `prefetchedAt` có quá 30 phút không.
6. Mobile kiểm tra QR có nằm trong `hashes` đã prefetch không.
7. Mobile kiểm tra QR đã tồn tại trong local scanned bucket chưa.
8. Mobile kiểm tra QR đã tồn tại trong pending sync queue chưa.

Nếu tất cả điều kiện hợp lệ:

1. Mobile hiển thị kết quả `Offline ticket accepted`.
2. Checker cho khách vào cổng.
3. Mobile lưu hash vào local scanned bucket: `ticketbox.staff.localScannedBuckets`.
4. Mobile thêm bản ghi vào pending sync queue: `ticketbox.staff.pendingSyncQueue`.

Pending item gồm:

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

5. Mobile ghi recent history để checker xem lại lượt scan gần nhất.
6. UI tăng các counters như `accepted`, `pending`, `scanned`.

#### Giai đoạn 6: Thiết bị có mạng lại
1. Mobile phát hiện thiết bị online trở lại.
2. Mobile kiểm tra current session còn tồn tại.
3. Mobile kiểm tra user vẫn đang đăng nhập.
4. Mobile đọc pending queue theo `concertId` và `gateNumber`.
5. Nếu queue rỗng, app không gọi sync.
6. Nếu queue có dữ liệu, app gọi `POST /checkin/sync`.

Payload:

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

#### Giai đoạn 7: Backend đồng bộ offline queue
1. Backend xác thực JWT.
2. Backend kiểm tra user có permission `SCAN_TICKET`.
3. Backend kiểm tra checker còn assignment đúng concert/gate.
4. Backend sort danh sách `updates` theo `qr_code_hash`.
5. Backend deduplicate input, giữ bản ghi có `scanned_at` sớm nhất cho mỗi QR.
6. Backend query tất cả ticket trong batch theo scope đúng concert và đúng gate.
7. Với từng QR:
   - Nếu không tìm thấy ticket hoặc ticket ngoài scope: tăng `errors`.
   - Nếu ticket đã scan: tăng `conflicts`.
   - Nếu ticket chưa scan: đưa vào danh sách update.
8. Backend update từng ticket bằng điều kiện `id = ticket.id` và `is_scanned = false`.
9. Nếu update thành công, tăng `updated`.
10. Nếu update thất bại vì ticket vừa được scan bởi request khác, tăng `conflicts`.
11. Backend trả summary:

```json
{
  "success": true,
  "processed": 5,
  "updated": 3,
  "conflicts": 2,
  "errors": 0
}
```

#### Giai đoạn 8: Mobile xử lý kết quả sync
1. Nếu `success = true`, mobile xóa các item đã xử lý khỏi pending queue.
2. Với item sync thành công, mobile ghi history `SYNCED`.
3. Với item conflict, mobile ghi history `SYNC_CONFLICT`.
4. Mobile cập nhật counters:
   - `pending`
   - `synced`
   - `duplicate/conflict`
5. Nếu `success = false` hoặc request sync bị lỗi mạng, mobile giữ queue để retry sau.

### Xử lý lỗi giữa chừng

#### Checker không có quyền hoặc chưa được phân công
- Xảy ra ở bước lấy assignment, prefetch, scan hoặc sync.
- Backend trả `401 Unauthorized` nếu thiếu/sai token.
- Backend trả `403 Forbidden` nếu checker không có permission hoặc assignment.
- Mobile hiển thị lỗi và không cho mở phiên scan gate đó.

#### Prefetch thiếu gate hoặc concert không hợp lệ
- Thiếu `gate_number`: backend trả `400 Bad Request`.
- Concert không tồn tại: backend trả `404 Not Found`.
- Concert chưa `PUBLISHED`: backend trả `400 Bad Request`.
- Mobile giữ checker ở màn hình setup và yêu cầu chọn lại session.

#### Mất mạng trước khi prefetch
- Mobile không có danh sách hash local.
- App không thể scan offline an toàn.
- Mobile yêu cầu checker kết nối mạng để prefetch trước khi vào cổng.

#### Prefetch hết hạn
- Mobile kiểm tra `prefetchedAt`.
- Nếu quá 30 phút, app không tin dữ liệu local nữa.
- Mobile hiển thị yêu cầu refresh session online.
- Mục đích là giảm rủi ro dùng danh sách vé quá cũ.

#### QR không nằm trong prefetched set
- Mobile trả trạng thái `NOT_FOUND` trong offline mode.
- Checker không cho khách vào.
- Scan này có thể được ghi vào recent history để kiểm tra lại.

#### QR bị scan trùng trên cùng thiết bị
- Mobile kiểm tra local scanned bucket và pending sync queue.
- Nếu QR đã tồn tại, app hiển thị `DUPLICATE`.
- Không thêm bản ghi mới vào pending queue.

#### Hai thiết bị offline cùng scan một vé
- Cả hai thiết bị có thể tạm chấp nhận vé nếu cùng có hash trong prefetch.
- Khi sync lên server:
  - Thiết bị sync trước update ticket thành scanned.
  - Thiết bị sync sau nhận conflict.
- Backend không ghi đè `scanned_at/scanned_by` đã tồn tại.
- Đây là trade-off của offline mode; server là nguồn sự thật cuối cùng.

#### Mất mạng trong lúc sync
- Request sync có thể timeout hoặc fail.
- Mobile không xóa pending queue.
- Khi mạng ổn định lại, mobile retry sync.
- Vì backend update bằng `is_scanned = false`, retry không tạo scan trùng trên server.

#### Backend sync trả `success = false`
- Mobile giữ queue trên thiết bị.
- UI hiển thị trạng thái sync failed.
- Checker hoặc quản trị viên có thể retry sau khi backend ổn định.

#### QR ngoài scope concert/gate
- Backend tăng `errors`.
- Mobile không coi các item đó là sync thành công.
- Đây là dấu hiệu dữ liệu QR không thuộc session hiện tại hoặc đã bị dùng sai gate.

### Trạng thái dữ liệu trong luồng
| Thành phần | Trước khi scan | Scan offline | Sau khi sync thành công |
| --- | --- | --- | --- |
| Ticket trong DB | `is_scanned = false` | Chưa đổi vì mất mạng | `is_scanned = true`, có `scanned_at`, `scanned_by` |
| Mobile prefetched set | Có danh sách hash | Dùng để validate QR | Có thể refresh cho phiên mới |
| Pending queue | Rỗng | Thêm item offline accepted | Xóa item đã xử lý |
| Recent history | Có thể rỗng | Ghi `OFFLINE_ACCEPTED`/`DUPLICATE` | Ghi `SYNCED`/`SYNC_CONFLICT` |

### Ràng buộc và trade-off
- Offline mode chỉ an toàn trong phạm vi gate đã prefetch.
- Mobile chỉ lưu QR hash, không lưu thông tin cá nhân khách hàng.
- Server vẫn là nguồn sự thật cuối cùng.
- Backend dùng conditional update `is_scanned = false` để chống scan trùng khi sync.
- Conflict offline có thể phát hiện muộn, nhưng đổi lại cổng vẫn vận hành được khi mất mạng.
- Prefetch TTL 30 phút giúp giảm rủi ro dùng dữ liệu quá cũ.

### Tiêu chí chấp nhận của luồng
- Checker được phân công xem được assignment trên mobile.
- Checker prefetch được QR hash của gate được phân công.
- Thiết bị mất mạng vẫn scan được QR nằm trong prefetched set.
- QR không nằm trong prefetched set bị từ chối khi offline.
- QR scan trùng trên cùng thiết bị bị chặn local.
- Pending queue tăng khi offline scan hợp lệ.
- Khi online lại, mobile tự sync pending queue.
- Ticket chưa scan được backend cập nhật thành scanned.
- Ticket đã scan trước đó được tính conflict, không bị ghi đè.
- Sync fail không làm mất pending queue.
- Sau sync thành công, pending queue giảm hoặc rỗng.
