# Báo Cáo Chi Tiết Về Module Check-in Của Backend TicketBox

## 1. Mục đích của tài liệu

Tài liệu này giải thích chi tiết module `checkin` của backend TicketBox để phục vụ 3 mục tiêu:

- Hiểu module này đang giải quyết bài toán gì trong hệ thống.
- Hiểu rõ từng API, từng bước xử lý, và các chiến thuật kỹ thuật đang được dùng.
- Có thể đọc lại sau này mà vẫn nắm được tư duy thiết kế, không chỉ nhớ mỗi đoạn code.

Module `checkin` là một trong những phần quan trọng nhất của toàn bộ đồ án, vì nó gắn trực tiếp với yêu cầu khó nhất của đề:

- soát vé ở khu vực sóng yếu
- vẫn hoạt động khi mất mạng
- không được cho một vé vào cổng hai lần
- khi có mạng lại phải đồng bộ được dữ liệu

Các file liên quan chính:

- [checkin.module.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/checkin.module.ts:1)
- [checkin.controller.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/controllers/checkin.controller.ts:1)
- [checkin.service.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/services/checkin.service.ts:1)
- [scan-ticket.dto.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/dtos/scan-ticket.dto.ts:1)
- [sync-tickets.dto.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/dtos/sync-tickets.dto.ts:1)
- [checkin.unit.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/tests/checkin.unit.ts:1)
- [performance-check.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/scripts/performance-check.ts:1)

## 2. Module này giải quyết bài toán gì

Module `checkin` giải quyết bài toán xác nhận vé tại cổng vào sự kiện.

Nói đơn giản hơn, đây là phần backend đứng sau ứng dụng mobile của nhân sự soát vé.

### 2.1 Các nhu cầu nghiệp vụ mà module phải đáp ứng

Trong bối cảnh thực tế:

- khán giả đến cổng với mã QR
- nhân sự dùng điện thoại để quét mã
- hệ thống phải xác định:
  - vé có tồn tại không
  - vé có đúng concert không
  - vé có đúng cổng không
  - vé đã thanh toán chưa
  - vé đã được dùng để vào trước đó chưa

Ngoài ra, do môi trường sự kiện đông người thường có sóng yếu hoặc mất mạng cục bộ, hệ thống còn phải:

- cho phép app tải trước dữ liệu cần thiết
- cho phép app tạm chấp nhận vé khi offline
- cho phép app sync lại khi có mạng
- xử lý xung đột khi nhiều thao tác offline cùng đổ về server

### 2.2 Phạm vi của module

Module này chỉ xử lý phần soát vé, không xử lý:

- mua vé
- thanh toán
- tạo concert
- import guest list

Nó sử dụng dữ liệu do các module khác tạo ra, đặc biệt là:

- `payment`: sinh ticket sau khi thanh toán thành công
- `catalog`: cung cấp thông tin concert và category
- `auth`: xác thực người dùng và quyền `SCAN_TICKET`

## 3. Cấu trúc của module

Module rất gọn:

- `CheckInController`: nhận request HTTP
- `CheckInService`: xử lý nghiệp vụ
- `PrismaService`: truy cập database

Xem [checkin.module.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/checkin.module.ts:1).

Điểm đáng chú ý là module này không dùng Redis và không dùng RabbitMQ.

Đây là lựa chọn có chủ đích:

- Check-in cần đọc và cập nhật trạng thái thật của vé trong database.
- Bản chất của check-in là một hành động xác nhận cuối cùng, không phải một thao tác có thể trì hoãn lâu như queue.
- Nếu dùng cache hoặc queue không cẩn thận, rất dễ làm sai trạng thái “vé đã được dùng hay chưa”.

Nói ngắn gọn:

- ticket reservation ưu tiên tốc độ và scale lớn, nên dùng Redis
- check-in ưu tiên tính đúng đắn của trạng thái cuối cùng, nên bám vào DB

## 4. Các API mà module cung cấp

Module có 3 API chính:

### 4.1 `GET /checkin/prefetch/:concert_id`

Mục đích:

- tải trước danh sách vé hợp lệ để app có thể kiểm tra local khi offline

Query params:

- `gate_id` hoặc `gate_number`

### 4.2 `POST /checkin/scan`

Mục đích:

- quét online theo thời gian thực

Body:

- `concert_id`
- `gate_id`
- `qr_code_hash`
- `scanned_at` optional

### 4.3 `POST /checkin/sync`

Mục đích:

- đồng bộ danh sách vé đã quét khi app offline trước đó

Body:

- `updates`: danh sách scan offline
- `concert_id` optional
- `gate_id` optional

Tất cả các API này đều yêu cầu:

- JWT hợp lệ
- quyền `SCAN_TICKET`

Điều này được thể hiện trong [checkin.controller.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/controllers/checkin.controller.ts:1).

## 5. Access control của module

Module dùng:

- `JwtAuthGuard`
- `RolesGuard`
- decorator `@Permissions('SCAN_TICKET')`

Ý nghĩa:

- không phải bất kỳ user nào đăng nhập cũng dùng được
- account `Audience` không được quyền scan
- chỉ staff có quyền phù hợp như `Checker` hoặc `Admin` mới được sử dụng

Đây là một quyết định thiết kế đúng vì:

- logic phân quyền nằm ở backend, không phụ thuộc vào app mobile
- dù mobile có bug UI thì backend vẫn chặn request trái phép

## 6. API prefetch và chiến thuật offline preparation

Đây là bước chuẩn bị cho offline mode.

### 6.1 Controller làm gì

Trong controller:

- nhận `concert_id` từ path
- nhận `gate_id` hoặc `gate_number` từ query
- kiểm tra có truyền cổng không
- kiểm tra cổng chỉ chứa chữ số
- parse thành số nguyên
- gọi service

Điểm tốt ở đây:

- validate ngay từ sớm
- tránh đưa dữ liệu rác xuống tầng service

### 6.2 Service làm gì

Trong `prefetchTickets()`:

1. Kiểm tra `gateId` có tồn tại không
2. Query concert theo `id`
3. Chỉ select:
   - `status`
   - `ticket_categories` đúng `gate_number`
   - trong mỗi category chỉ select ticket:
     - order `PAID`
     - `is_scanned = false`
4. Nếu không có concert: `NotFoundException`
5. Nếu concert chưa `PUBLISHED`: `BadRequestException`
6. Trả về mảng `qr_code_hash`

### 6.3 Tại sao thiết kế như vậy

Thiết kế này dùng chiến thuật “tải đúng thứ mobile cần, không tải thêm”.

Thay vì trả về full ticket object như:

- ticket id
- order id
- category
- created_at
- status

backend chỉ trả:

- `qr_code_hash[]`

Vì đối với bài toán offline local validation, app chỉ cần biết:

- hash nào đang được phép vào cổng này tại thời điểm đó

Đây là thiết kế:

- nhẹ
- ít dữ liệu
- ít lộ thông tin
- phù hợp cho cache local trên điện thoại

### 6.4 Chiến thuật gate-based partitioning

Prefetch theo `gate_id` là một quyết định thiết kế rất quan trọng.

Mục tiêu:

- mỗi thiết bị staff chỉ tải tập vé của đúng cổng mình phụ trách
- giảm kích thước dữ liệu tải về
- giảm khả năng hai máy khác cổng chồng lấn dữ liệu lên nhau

Nó không loại bỏ hoàn toàn xung đột offline, nhưng giảm rủi ro đáng kể.

### 6.5 Trade-off của prefetch

Ưu điểm:

- đơn giản
- nhanh
- phù hợp offline

Nhược điểm:

- nếu concert lớn, số hash vẫn có thể nhiều
- dữ liệu chỉ đúng tại thời điểm prefetch
- nếu trong lúc máy offline có máy khác scan online cùng vé đó, máy offline chưa biết ngay

## 7. API scan và chiến thuật quét online

Đây là flow chuẩn khi thiết bị đang có mạng.

### 7.1 Input DTO

Xem [scan-ticket.dto.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/dtos/scan-ticket.dto.ts:1).

Các trường:

- `concert_id`
- `gate_id`
- `qr_code_hash`
- `scanned_at` optional

Việc cho phép `scanned_at` optional có ý nghĩa:

- mặc định server có thể dùng thời gian hiện tại
- nhưng mobile cũng có thể gửi lại thời điểm quét thực tế nếu cần

### 7.2 Luồng xử lý scan

Trong `scanTicket()`:

1. Query ticket theo `qr_code_hash`
2. Include:
   - `order`
   - `category`
3. Nếu không có ticket:
   - trả `NOT_FOUND`
4. Nếu `gate_number` không khớp:
   - trả `INVALID_GATE`
5. Nếu `concert_id` không khớp:
   - trả `INVALID_GATE`
6. Nếu order chưa `PAID`:
   - trả `UNPAID`
7. Nếu `is_scanned = true`:
   - trả `DUPLICATE` kèm `scanned_at`, `scanned_by`
8. Nếu chưa scan:
   - cố update vé với điều kiện `is_scanned = false`
9. Nếu update thành công:
   - trả `ACCEPTED`
10. Nếu update không thành công:
   - coi như vừa có request khác quét trước
   - fetch lại thông tin
   - trả `DUPLICATE`

### 7.3 Chiến thuật chống double-scan online

Đây là một trong những kỹ thuật quan trọng nhất của module.

Thay vì làm:

1. đọc ticket
2. nếu chưa scan thì update

service làm:

1. đọc ticket
2. update bằng điều kiện `is_scanned = false`

Tức là nó không tin hoàn toàn vào kết quả đọc ban đầu, mà ràng buộc lại ngay ở bước update.

Điều này giúp chống race condition:

- 2 máy cùng quét cùng 1 vé gần như cùng lúc
- cả 2 cùng thấy vé chưa scan
- nhưng chỉ 1 máy update thành công
- máy còn lại update thất bại và bị xem là duplicate

Đây là một kiểu optimistic concurrency control rất gọn.

### 7.4 Vì sao dùng `updateMany` chứ không dùng `update`

`updateMany` trả về `count`, nên rất hợp cho bài toán:

- chỉ update nếu đúng điều kiện
- nếu `count = 0` thì biết chắc có thay đổi cạnh tranh xảy ra

Nó phù hợp hơn `update` trong trường hợp cần kiểm tra “tôi có thắng cuộc đua cập nhật hay không”.

### 7.5 Ý nghĩa các trạng thái trả về

- `ACCEPTED`: vé hợp lệ, vừa được chấp nhận
- `DUPLICATE`: vé đã được dùng trước đó
- `INVALID_GATE`: vé không đúng cổng hoặc không đúng concert
- `NOT_FOUND`: không có vé tương ứng
- `UNPAID`: order chưa thanh toán thành công

Đây là output rất thân thiện với mobile vì app có thể map trực tiếp ra UI.

## 8. API sync và chiến thuật đồng bộ offline

Đây là phần khó nhất và cũng hay nhất của module.

### 8.1 Tại sao cần sync

Khi offline:

- app không gọi được `/scan`
- app chỉ có thể tự xác nhận local dựa trên dữ liệu prefetch
- sau đó phải gửi lại toàn bộ kết quả lên server khi có mạng

Nếu không có sync:

- trạng thái scan sẽ chỉ nằm trên máy
- server không biết vé nào đã được dùng
- các thiết bị khác sẽ không có dữ liệu đúng

### 8.2 Input DTO

Xem [sync-tickets.dto.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/dtos/sync-tickets.dto.ts:1).

`BulkSyncDto` gồm:

- `updates`
- `concert_id` optional
- `gate_id` optional

Mỗi `SyncTicketItemDto` gồm:

- `qr_code_hash`
- `scanned_at`
- `scanned_by`

Điều này cho phép server biết:

- vé nào được quét
- quét lúc nào
- bởi ai

### 8.3 Luồng xử lý tổng quát của sync

Trong `syncTickets()`:

1. Nếu `updates` rỗng:
   - trả luôn thành công
2. Sort theo `qr_code_hash`
3. Deduplicate: giữ lại scan sớm nhất cho mỗi hash
4. Mở transaction
5. Query toàn bộ ticket tương ứng trong một lần
6. Dựng `ticketMap`
7. Duyệt từng item:
   - không có ticket -> `errors++`
   - ticket chưa scan -> thêm vào danh sách update
   - ticket đã scan:
     - scan offline sớm hơn -> override
     - scan offline muộn hơn -> conflict
8. Nếu có record cần cập nhật:
   - thực hiện bulk update bằng raw SQL
9. Kết thúc transaction
10. Cộng thêm số duplicate nội bộ vào `conflicts`
11. Trả thống kê

## 9. Chiến thuật kỹ thuật trong `syncTickets()`

### 9.1 Chiến thuật sắp xếp để giảm deadlock

Service sort danh sách theo `qr_code_hash`.

Tại sao?

Trong môi trường có nhiều transaction cùng update các tập bản ghi giao nhau, deadlock thường xảy ra khi:

- transaction A lock record X rồi muốn lock Y
- transaction B lock record Y rồi muốn lock X

Nếu mọi transaction đều xử lý theo cùng một thứ tự ổn định, nguy cơ deadlock giảm xuống nhiều.

Đây là lý do có test ý tưởng này trong:

- [performance-check.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/scripts/performance-check.ts:1)

Script đó mô phỏng nhiều batch sync chồng lấn nhau để kiểm tra deadlock boundary.

### 9.2 Chiến thuật deduplicate trước khi vào DB

Service dùng `Map<string, SyncTicketItemDto>` để giữ một bản cho mỗi hash.

Luật:

- nếu cùng hash xuất hiện nhiều lần
- giữ lại bản có `scanned_at` sớm hơn

Tại sao chọn bản sớm hơn?

Vì hệ thống đang dùng triết lý:

- bản scan xảy ra sớm hơn gần với sự thật nghiệp vụ hơn

Điều này cũng giúp:

- giảm số update thừa
- giảm xung đột giả tạo
- giảm tải cho transaction

### 9.3 Chiến thuật fetch theo lô

Thay vì query từng hash một, service:

- gom tất cả hash
- query `findMany` một lần

Ưu điểm:

- giảm round-trip DB
- transaction ngắn hơn
- code conflict resolution chạy trên memory map nhanh hơn

### 9.4 Chiến thuật scope theo `concert_id` và `gate_id`

Nếu client gửi scope:

- chỉ xử lý ticket của concert đó
- chỉ xử lý ticket của gate đó

Điều này giúp:

- tránh sync nhầm dữ liệu ngoài ca trực
- giới hạn bề mặt tác động của batch sync
- tăng độ an toàn khi staff làm việc phân tán theo cổng

### 9.5 Chiến thuật conflict resolution theo timestamp

Đây là cốt lõi của offline sync.

Nếu ticket đã scan rồi:

- nếu `incomingScanTime < existingScanTime`
  - cho phép override DB
- ngược lại
  - reject và tính conflict

Triết lý ở đây là:

- ưu tiên sự kiện quét xảy ra sớm hơn về mặt thời gian

Ý nghĩa:

- một máy offline có thể quét thật lúc 18:59
- nhưng do không có mạng, đến 19:05 mới sync
- trong thời gian đó, một máy online khác có thể ghi scan lúc 19:02
- server vẫn có thể sửa lại vì scan offline thực tế diễn ra sớm hơn

Đây là cách phục hồi “sự thật nghiệp vụ” chứ không chỉ theo thứ tự dữ liệu tới server.

### 9.6 Chiến thuật bulk update bằng raw SQL

Sau khi tính xong `toUpdate`, service không gọi `update` từng vé mà dùng:

- `UPDATE tickets ... FROM (VALUES ...)`

Đây là một kỹ thuật tối ưu hiệu năng:

- ít round-trip hơn
- lock ngắn hơn
- phù hợp với batch sync nhiều dòng

### 9.7 Chiến thuật transaction toàn khối

Tất cả logic xử lý được đặt trong:

- `prisma.$transaction(..., { timeout: 15000 })`

Mục tiêu:

- nếu có lỗi lớn thì fail cả lô
- không để trạng thái nửa sync nửa chưa
- vẫn có timeout để tránh transaction kéo dài quá lâu dưới contention

### 9.8 Chiến thuật fail-safe

Nếu transaction nổ:

- log error
- trả:
  - `success: false`
  - `processed = updates.length`
  - `errors = updates.length`

Thiết kế này giúp mobile dễ hiểu:

- hoặc sync thành công theo logic
- hoặc batch này hỏng hoàn toàn và app nên retry

## 10. Unit test đang xác nhận những gì

File [checkin.unit.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/tests/checkin.unit.ts:1) rất đáng đọc vì nó cho thấy tác giả module đang coi trọng điều gì.

Các nhóm test chính:

### 10.1 Test prefetch

- trả đúng hash list
- lỗi khi thiếu gate
- lỗi khi concert không tồn tại
- lỗi khi concert không phải `PUBLISHED`

### 10.2 Test sync

- xử lý empty updates
- update vé chưa scan
- override khi offline scan sớm hơn
- reject khi offline scan muộn hơn
- sort và deduplicate hash
- áp dụng scope theo `concertId`, `gateId`

### 10.3 Test scan

- nhận `ACCEPTED` khi vé hợp lệ
- nhận `DUPLICATE` nếu bị scan đồng thời
- nhận `DUPLICATE` nếu vé đã scan từ trước
- nhận `INVALID_GATE`
- nhận `NOT_FOUND`
- nhận `UNPAID`

Điều này cho thấy module không chỉ được viết “cho chạy”, mà đã được xác định rõ các edge case quan trọng.

## 11. Performance check script đang kiểm tra điều gì

Script [performance-check.ts](/D:/document/study/projects/Ticket_Box/apps/backend-api/src/modules/checkin/scripts/performance-check.ts:1) là một bài kiểm tra concurrency khá hay.

Nó làm các việc:

1. Khởi tạo dữ liệu test:
   - concert
   - category
   - user checker
   - order `PAID`
   - nhiều ticket
2. Tạo 10 batch sync đồng thời
3. Mỗi batch có nhiều hash chồng lấn
4. Gọi `checkInService.syncTickets(batch)` song song
5. Đo:
   - số batch thành công
   - deadlock errors
   - tổng thời gian
   - số vé thực sự được scan trong DB

Ý nghĩa:

- kiểm tra giả thuyết rằng sort + batch handling sẽ giảm deadlock
- kiểm tra module có chịu được nhiều sync offline cùng lúc không

Đây là một điểm cộng lớn khi trình bày đồ án, vì nó cho thấy nhóm có suy nghĩ về hành vi hệ thống dưới concurrency chứ không chỉ test happy path.

## 12. Các chiến thuật thiết kế mà module đang sử dụng

Tóm lại, module `checkin` đang dùng các chiến thuật sau:

### 12.1 Online-first, offline-capable

- ưu tiên scan trực tiếp lên server
- vẫn cho phép hoạt động khi offline bằng prefetch + sync

### 12.2 Gate-based partitioning

- chia dữ liệu theo cổng
- giảm lượng dữ liệu tải về
- giảm va chạm giữa thiết bị

### 12.3 Minimal offline dataset

- chỉ tải `qr_code_hash[]`
- giảm băng thông và storage local

### 12.4 Optimistic concurrency control cho scan online

- update với điều kiện `is_scanned = false`
- chống double-scan mà không cần lock phức tạp

### 12.5 Deterministic lock ordering cho sync

- sort theo `qr_code_hash`
- giảm deadlock khi nhiều batch chạy song song

### 12.6 Client-event-time conflict resolution

- ưu tiên bản scan xảy ra sớm hơn
- phục hồi “sự thật nghiệp vụ” trong bối cảnh offline

### 12.7 Bulk update optimization

- update nhiều vé bằng một câu SQL
- giảm thời gian transaction

### 12.8 Scoped synchronization

- giới hạn sync theo concert và gate
- tăng độ an toàn nghiệp vụ

## 13. Điểm mạnh của module

- Giải quyết đúng bài toán của đề.
- Cấu trúc gọn, dễ hiểu.
- Có hỗ trợ offline thực sự, không phải chỉ mock.
- Có chiến thuật chống double-scan online rõ ràng.
- Có chiến thuật xử lý xung đột offline hợp lý.
- Có quan tâm tới concurrency và deadlock.
- Có test unit và có script performance riêng.

## 14. Giới hạn và trade-off hiện tại

Không có thiết kế nào hoàn hảo tuyệt đối, module này cũng vậy.

### 14.1 Không thể chặn tuyệt đối double accept khi nhiều máy cùng offline

Nếu 2 máy cùng offline và cùng có dữ liệu prefetch cho cùng một gate:

- cả 2 có thể local chấp nhận cùng một vé
- chỉ khi sync lên server mới phát hiện xung đột

Điều này là trade-off rất thực tế của offline systems.

### 14.2 Phụ thuộc vào thời gian client

Conflict resolution dựa trên `scanned_at`.

Nếu thời gian trên thiết bị staff sai:

- có thể ưu tiên nhầm bản ghi

Đây là điểm cần ghi nhớ khi đánh giá độ tin cậy của sync logic.

### 14.3 `INVALID_GATE` đang gộp nhiều nguyên nhân

Hiện tại cả:

- sai gate
- sai concert

đều trả `INVALID_GATE`

Điều này làm backend đơn giản hơn, nhưng mobile UI cần diễn giải cẩn thận.

### 14.4 Prefetch có thể nặng với concert rất lớn

Nếu lượng vé hợp lệ rất lớn, trả nguyên mảng hash có thể khá nặng cho mobile.

Tuy nhiên, trong phạm vi đồ án, giải pháp này vẫn chấp nhận được vì:

- đơn giản
- rõ ràng
- nhanh triển khai

## 15. Tác động trực tiếp tới mobile app

Từ góc nhìn mobile, module `checkin` cho thấy app nên được thiết kế như sau:

### 15.1 Trước khi scan

App cần:

- chọn concert
- chọn gate
- gọi prefetch
- lưu local ticket index

### 15.2 Khi scan online

App cần:

- gọi `/checkin/scan`
- hiển thị kết quả theo status

### 15.3 Khi scan offline

App cần:

- check hash local
- chặn duplicate local
- lưu vào queue sync

### 15.4 Khi có mạng lại

App cần:

- gửi queue lên `/checkin/sync`
- xử lý `updated`, `conflicts`, `errors`
- cập nhật lại trạng thái local

Nói cách khác, backend đã vạch sẵn kiến trúc mà mobile nên đi theo.

## 16. Kết luận

Module `checkin` của backend TicketBox là một thiết kế khá tốt cho bài toán soát vé trong môi trường có mạng không ổn định.

Điểm mạnh nhất của nó không chỉ nằm ở việc “có API scan”, mà nằm ở việc nó đang kết hợp nhiều chiến thuật khá chín:

- xác thực và phân quyền chặt
- prefetch dữ liệu tối thiểu cho offline
- update có điều kiện để chống double-scan online
- sort và deduplicate để giảm deadlock khi sync
- conflict resolution theo timestamp để xử lý offline reality
- bulk update để tăng hiệu năng

Nếu nhìn theo góc độ đồ án, đây là một module có thể dùng làm điểm nhấn kỹ thuật khi thuyết trình, vì nó chạm đúng vấn đề khó của đề bài và có lập luận thiết kế khá rõ ràng.

Nếu nhìn theo góc độ phát triển mobile, đây cũng là phần backend đã sẵn sàng nhất để app mobile bám vào triển khai thật nhanh trong 1 tuần còn lại.
