# Đặc tả: Admin APIs

## API: `GET /admin/dashboard/summary`

### Mô tả
API trả các chỉ số tổng quan cho màn hình dashboard admin, ví dụ số concert, số user, số order, doanh thu hoặc các metric vận hành chính.

### Luồng chính
1. Admin đăng nhập web app.
2. Frontend mở trang `/admin/dashboard`.
3. Frontend gọi `GET /admin/dashboard/summary` kèm access token.
4. Backend kiểm tra JWT và role `ADMIN`.
5. Backend tổng hợp các chỉ số từ database.
6. API trả summary metrics cho frontend.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Database lỗi khi tổng hợp dữ liệu: API trả lỗi server.

### Ràng buộc
- Chỉ admin được xem dữ liệu tổng quan hệ thống.
- Metric phải không expose dữ liệu nhạy cảm không cần thiết.
- Query tổng hợp cần tối ưu để không gây tải lớn lên database.

### Tiêu chí chấp nhận
- Admin xem được dashboard summary.
- User thường không truy cập được API.
- Response trả đủ các metric dashboard cần hiển thị.

## API: `GET /admin/dashboard/revenue`

### Mô tả
API trả dữ liệu biểu đồ doanh thu trên dashboard, có thể group theo ngày, tuần hoặc tháng.

### Luồng chính
1. Admin mở dashboard.
2. Frontend gửi query `from`, `to`, `group_by`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query date range và `group_by`.
5. Backend lấy các order/payment hợp lệ trong khoảng thời gian.
6. Backend group doanh thu theo `day`, `week` hoặc `month`.
7. API trả dữ liệu để frontend vẽ chart.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `from/to` sai định dạng date: `400 Bad Request`.
- `group_by` không thuộc `day/week/month`: `400 Bad Request`.
- Không có dữ liệu trong range: trả mảng rỗng hoặc value bằng 0.

### Ràng buộc
- Chỉ tính doanh thu từ order/payment đã hoàn thành hợp lệ.
- Không tính order `PENDING` hoặc `CANCELLED`.
- Range thời gian cần được xử lý nhất quán với timezone.

### Tiêu chí chấp nhận
- Admin xem được chart doanh thu.
- Filter theo range hoạt động đúng.
- Group theo ngày/tuần/tháng trả đúng cấu trúc dữ liệu.
- User thường bị chặn.

## API: `GET /admin/dashboard/recent-orders`

### Mô tả
API trả danh sách order mới nhất để hiển thị nhanh trên dashboard admin.

### Luồng chính
1. Frontend dashboard gọi API với query `limit`.
2. Backend kiểm tra JWT và role `ADMIN`.
3. Backend validate `limit`.
4. Backend lấy các order mới nhất theo thời gian tạo.
5. API trả danh sách order rút gọn.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `limit` không hợp lệ hoặc vượt giới hạn: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- `limit` phải có giới hạn để tránh query quá lớn.
- Chỉ admin được xem order của toàn hệ thống.
- Response nên đủ cho dashboard, không cần toàn bộ chi tiết order.

### Tiêu chí chấp nhận
- Admin xem được danh sách recent orders.
- `limit` hoạt động đúng.
- User thường không truy cập được.

## API: `GET /admin/users`

### Mô tả
API lấy danh sách user cho màn hình quản lý người dùng của admin, hỗ trợ pagination, search, filter status và role.

### Luồng chính
1. Admin mở trang `/admin/users`.
2. Frontend gọi `GET /admin/users` với query filter.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query.
5. Backend query user theo `search`, `status`, `role`.
6. Backend phân trang kết quả.
7. API trả `data` và `meta`.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Query sai kiểu dữ liệu: `400 Bad Request`.
- Status không thuộc enum hợp lệ: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Phải dùng pagination.
- Không trả password hash.
- Chỉ admin được xem danh sách user.
- Filter role/status phải dựa trên dữ liệu hợp lệ trong hệ thống.

### Tiêu chí chấp nhận
- Admin xem được danh sách user.
- Search theo email/full name hoạt động.
- Filter status/role hoạt động.
- Response có pagination metadata.

## API: `POST /admin/users`

### Mô tả
API cho admin tạo user mới, ví dụ tạo tài khoản checker hoặc organizer.

### Luồng chính
1. Admin mở modal tạo user.
2. Frontend gửi email, password, full name, status và roles.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate body.
5. Backend kiểm tra email đã tồn tại chưa.
6. Backend kiểm tra các role trong request tồn tại.
7. Backend hash password.
8. Backend tạo user và gán roles.
9. API trả user vừa tạo.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Email sai định dạng: `400 Bad Request`.
- Password quá ngắn: `400 Bad Request`.
- Email đã tồn tại: request bị từ chối.
- Role không tồn tại: request bị từ chối.

### Ràng buộc
- Password phải hash bằng bcrypt.
- Không trả password hash trong response.
- Role request phải tồn tại trong DB.
- Status chỉ thuộc `ACTIVE`, `INACTIVE`, `BANNED`, `PENDING`.

### Tiêu chí chấp nhận
- Admin tạo user mới thành công.
- Email trùng bị chặn.
- User mới có đúng roles.
- User thường không tạo được user.

## API: `GET /admin/users/:id`

### Mô tả
API lấy chi tiết một user cho admin, dùng trong drawer/detail view.

### Luồng chính
1. Admin chọn một user trong bảng.
2. Frontend gọi `GET /admin/users/:id`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend tìm user theo `id`.
5. Backend lấy roles và thông tin liên quan.
6. API trả user detail.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- User ID không tồn tại: `404 Not Found`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Không trả password hash.
- Chỉ admin được xem user detail.
- ID phải tham chiếu đúng user trong hệ thống.

### Tiêu chí chấp nhận
- Admin xem được chi tiết user.
- User không tồn tại trả lỗi.
- Response có roles của user.

## API: `PATCH /admin/users/:id/status`

### Mô tả
API cho admin cập nhật trạng thái user, ví dụ active, inactive, banned hoặc pending.

### Luồng chính
1. Admin chọn action đổi trạng thái user.
2. Frontend gửi `{ status }`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate status.
5. Backend tìm user cần cập nhật.
6. Backend cập nhật status.
7. API trả user đã cập nhật.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Status không hợp lệ: `400 Bad Request`.
- User không tồn tại: `404 Not Found`.

### Ràng buộc
- Status chỉ thuộc enum hợp lệ.
- Cần tránh vô tình khóa toàn bộ admin nếu hệ thống có rule bảo vệ admin cuối cùng.
- User bị banned/inactive không nên đăng nhập được.

### Tiêu chí chấp nhận
- Admin đổi status user thành công.
- Status mới được phản ánh ở danh sách/detail.
- Status sai bị từ chối.

## API: `PATCH /admin/users/:id/roles`

### Mô tả
API cho admin cập nhật danh sách role của user.

### Luồng chính
1. Admin mở phần role của user.
2. Frontend gửi danh sách roles mới.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate danh sách roles không rỗng.
5. Backend kiểm tra từng role tồn tại.
6. Backend thay thế role hiện tại bằng danh sách mới.
7. API trả user với roles đã cập nhật.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Roles rỗng hoặc sai kiểu dữ liệu: `400 Bad Request`.
- Có role không tồn tại: request bị từ chối.
- User không tồn tại: `404 Not Found`.

### Ràng buộc
- Role phải tồn tại trong DB.
- Cần đảm bảo không làm mất quyền admin cuối cùng nếu có rule vận hành tương ứng.
- Cập nhật role ảnh hưởng trực tiếp quyền truy cập API.

### Tiêu chí chấp nhận
- Admin cập nhật roles thành công.
- Role không tồn tại bị từ chối.
- User nhận quyền mới đúng sau khi đăng nhập/lấy token mới.

## API: `GET /orders/admin`

### Mô tả
API cho admin xem và tìm kiếm danh sách order toàn hệ thống.

### Luồng chính
1. Admin mở trang `/admin/orders`.
2. Frontend gửi query pagination/filter.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query.
5. Backend lọc order theo status, payment method, user, concert hoặc search text.
6. Backend phân trang kết quả.
7. API trả danh sách order và metadata.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Query status không hợp lệ: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ admin được xem tất cả order.
- Phải dùng pagination.
- User thường chỉ được xem order của chính mình qua API user.

### Tiêu chí chấp nhận
- Admin xem được order toàn hệ thống.
- Filter/search hoạt động đúng.
- Response có pagination metadata.
- User thường bị chặn.

## API: `GET /orders/admin/:id`

### Mô tả
API lấy chi tiết bất kỳ order nào cho admin, gồm thông tin user, concert, payment transaction và tickets.

### Luồng chính
1. Admin chọn một order.
2. Frontend gọi `GET /orders/admin/:id`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend tìm order theo `id`.
5. Backend include thông tin concert, user, transactions và tickets.
6. API trả order detail.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Order không tồn tại: `404 Not Found`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ admin được xem order của mọi user.
- Không giới hạn theo `req.user.sub` như API user order detail.
- Response cần đủ dữ liệu để kiểm tra thanh toán/vé/check-in.

### Tiêu chí chấp nhận
- Admin xem được chi tiết order bất kỳ.
- Order không tồn tại trả `404`.
- User thường không truy cập được.

## API: `GET /admin/revenue/trend`

### Mô tả
API trả dữ liệu xu hướng doanh thu toàn hệ thống trong một khoảng thời gian.

### Luồng chính
1. Admin mở trang revenue.
2. Frontend gửi `from`, `to`, `group_by`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query.
5. Backend lấy order/payment hợp lệ trong range.
6. Backend group doanh thu theo ngày/tuần/tháng.
7. API trả dữ liệu chart.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `from/to` sai định dạng: `400 Bad Request`.
- `group_by` không hợp lệ: `400 Bad Request`.
- Không có dữ liệu: trả mảng rỗng.

### Ràng buộc
- Chỉ tính giao dịch/order đã hoàn thành hợp lệ.
- Không tính pending/cancelled.
- FE nên normalize `to` về cuối ngày khi user chọn ngày.

### Tiêu chí chấp nhận
- Admin xem được biểu đồ doanh thu.
- Range và group_by hoạt động đúng.
- Không có dữ liệu không làm API lỗi.

## API: `GET /admin/revenue/by-concert`

### Mô tả
API trả doanh thu được nhóm theo từng concert để admin so sánh hiệu quả sự kiện.

### Luồng chính
1. Admin mở bảng doanh thu theo sự kiện.
2. Frontend gửi range ngày, status và limit nếu có.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query.
5. Backend tính doanh thu/ticket sold theo từng concert.
6. API trả danh sách concert revenue.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Status không hợp lệ: `400 Bad Request`.
- Limit ngoài khoảng cho phép: `400 Bad Request`.
- Không có doanh thu: trả metric bằng 0 hoặc danh sách rỗng.

### Ràng buộc
- Chỉ admin được xem revenue.
- Limit phải có ngưỡng tối đa để tránh query lớn.
- Khoảng ngày phải được hiển thị rõ trên UI.

### Tiêu chí chấp nhận
- Admin xem được doanh thu theo concert.
- Filter status/range hoạt động.
- Concert không có doanh thu trong range hiển thị đúng 0 hoặc không xuất hiện theo logic UI.

## API: `GET /admin/revenue/concerts/:concert_id/detail`

### Mô tả
API trả chi tiết doanh thu của một concert, gồm tổng doanh thu, số vé bán và breakdown theo ticket tier.

### Luồng chính
1. Admin chọn một concert trong bảng revenue.
2. Frontend gọi API detail với `concert_id` và range ngày.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate `concert_id`, `from`, `to`.
5. Backend lấy dữ liệu order/payment/ticket theo concert.
6. Backend tính breakdown theo tier.
7. API trả detail cho drawer/modal.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `concert_id` sai UUID: `400 Bad Request`.
- Concert không tồn tại: `404 Not Found`.
- Range ngày sai format: `400 Bad Request`.

### Ràng buộc
- Chỉ tính giao dịch hợp lệ.
- Breakdown theo tier cần khớp ticket category.
- Không làm sai dữ liệu lịch sử nếu concert đã soft delete/completed.

### Tiêu chí chấp nhận
- Admin xem được chi tiết doanh thu concert.
- Breakdown theo tier đúng.
- Range ngày ảnh hưởng đúng đến số liệu.

## API: `GET /checkin/assignments`

### Mô tả
API lấy danh sách phân công checker theo concert/gate cho màn hình admin assignments.

### Luồng chính
1. Admin mở trang assignments.
2. Frontend gọi API với pagination/filter.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend lọc theo `concert_id` hoặc `checker_id` nếu có.
5. Backend phân trang kết quả.
6. API trả danh sách assignment.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- UUID filter sai định dạng: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ admin được xem assignment toàn hệ thống.
- Phải dùng pagination.
- Assignment là nguồn phân quyền cho mobile check-in.

### Tiêu chí chấp nhận
- Admin xem được danh sách assignment.
- Filter theo concert/checker hoạt động.
- User thường bị chặn.

## API: `POST /checkin/assignments`

### Mô tả
API tạo phân công checker vào một gate của concert.

### Luồng chính
1. Admin chọn concert, checker và gate.
2. Frontend gửi `checker_id`, `concert_id`, `gate_number`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate body.
5. Backend kiểm tra checker/concert/gate hợp lệ.
6. Backend tạo assignment.
7. API trả assignment mới.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `checker_id` hoặc `concert_id` sai UUID: `400 Bad Request`.
- Checker không tồn tại hoặc không phù hợp: request bị từ chối.
- Concert không tồn tại: request bị từ chối.
- Gate không hợp lệ hoặc đã được phân công: request bị từ chối.

### Ràng buộc
- Chỉ admin được tạo assignment.
- Checker phải là user hợp lệ có role checker.
- Gate number phải thuộc ticket tier của concert.
- Không nên phân công trùng một gate nếu không có chủ đích vận hành.

### Tiêu chí chấp nhận
- Admin tạo assignment thành công.
- Checker thấy assignment trong mobile app.
- Gate được dùng để prefetch/scan đúng.
- Assignment trùng hoặc gate sai bị từ chối.

## API: `GET /checkin/assignments/concerts`

### Mô tả
API lấy danh sách concert đang active/published để admin chọn khi tạo assignment.

### Luồng chính
1. Admin mở form tạo assignment.
2. Frontend gọi API concerts.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend lấy concert đủ điều kiện phân công.
5. API trả danh sách concert option.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ trả concert phù hợp để phân công check-in.
- Không trả quá nhiều dữ liệu không cần thiết.

### Tiêu chí chấp nhận
- Admin thấy danh sách concert để chọn.
- Concert chưa phù hợp không xuất hiện theo logic backend.

## API: `GET /checkin/assignments/checkers`

### Mô tả
API lấy danh sách tài khoản checker đang hoạt động để admin chọn khi tạo assignment.

### Luồng chính
1. Admin mở form assignment.
2. Frontend gọi API checkers.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend lấy user có role checker và trạng thái hợp lệ.
5. API trả danh sách checker option.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ trả tài khoản checker hợp lệ.
- Không trả password hash hoặc dữ liệu nhạy cảm.

### Tiêu chí chấp nhận
- Admin chọn được checker khi tạo assignment.
- User không phải checker không xuất hiện.

## API: `GET /checkin/assignments/gates/:concert_id`

### Mô tả
API lấy danh sách gate còn có thể phân công của một concert.

### Luồng chính
1. Admin chọn concert trong form assignment.
2. Frontend gọi API gates với `concert_id`.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend lấy gate number từ ticket tiers của concert.
5. Backend loại các gate đã được phân công nếu logic yêu cầu.
6. API trả danh sách gate available.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- `concert_id` sai UUID: `400 Bad Request`.
- Concert không tồn tại: request bị từ chối.

### Ràng buộc
- Gate phải xuất phát từ ticket tier của concert.
- Không nên cho chọn gate đã phân công nếu hệ thống muốn mỗi gate chỉ có một checker/phân công.

### Tiêu chí chấp nhận
- Admin thấy gate hợp lệ của concert.
- Gate đã phân công không xuất hiện nếu backend loại trừ.
- Concert sai không trả gate.

## API: `PUT /checkin/assignments/:id`

### Mô tả
API cập nhật gate number của một checker assignment.

### Luồng chính
1. Admin chọn assignment cần sửa.
2. Frontend gửi `gate_number` mới.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate assignment id và body.
5. Backend kiểm tra gate mới hợp lệ.
6. Backend cập nhật assignment.
7. API trả assignment đã cập nhật.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Assignment id sai UUID: `400 Bad Request`.
- Assignment không tồn tại: `404 Not Found`.
- Gate mới không hợp lệ hoặc bị trùng: request bị từ chối.

### Ràng buộc
- Cập nhật assignment ảnh hưởng trực tiếp quyền prefetch/scan của checker.
- Không nên đổi gate trong lúc ca check-in đang diễn ra nếu chưa có quy trình vận hành.

### Tiêu chí chấp nhận
- Admin cập nhật gate assignment thành công.
- Checker dùng assignment mới khi mở lại session.
- Gate sai/trùng bị từ chối.

## API: `DELETE /checkin/assignments/:id`

### Mô tả
API xóa phân công checker khỏi một concert/gate.

### Luồng chính
1. Admin chọn assignment cần xóa.
2. Frontend gọi delete.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend kiểm tra assignment tồn tại.
5. Backend xóa assignment.
6. API trả kết quả thành công.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Assignment id sai UUID: `400 Bad Request`.
- Assignment không tồn tại: `404 Not Found`.

### Ràng buộc
- Xóa assignment sẽ làm checker không còn prefetch/scan gate đó.
- Cần tránh xóa nhầm trong lúc check-in đang vận hành nếu không có quy trình thay thế.

### Tiêu chí chấp nhận
- Admin xóa assignment thành công.
- Checker không còn thấy assignment sau khi reload.
- Checker không prefetch/scan được gate đã bị xóa assignment.

## API: `GET /admin/notifications`

### Mô tả
API cho admin xem danh sách notification trong hệ thống theo query quản trị.

### Luồng chính
1. Admin mở trang notifications.
2. Frontend gọi `GET /admin/notifications` với query.
3. Backend kiểm tra JWT và role `ADMIN`.
4. Backend validate query.
5. Backend lấy notification theo filter/pagination.
6. API trả danh sách notification.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Query sai định dạng: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Chỉ admin được xem notification toàn hệ thống.
- Phải dùng pagination nếu dữ liệu lớn.
- Không để user thường xem notification của người khác.

### Tiêu chí chấp nhận
- Admin xem được notification list.
- Filter/pagination hoạt động.
- User thường bị chặn.

## API: `POST /tickets/init`

### Mô tả
API admin dùng để prewarm Redis inventory cho một ticket category trước demo hoặc trước thời điểm mở bán.

### Luồng chính
1. Admin xác định category cần warm up.
2. Admin tính số vé còn lại hợp lý dựa trên `total_quantity`, vé đã bán và order pending nếu có.
3. Frontend/tool gửi `category_id`, `available`, `max_per_user`.
4. Backend kiểm tra JWT và role `ADMIN`.
5. Backend validate body.
6. Backend ghi inventory và `max_per_user` vào Redis.
7. API trả trạng thái thành công.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Body thiếu/sai dữ liệu: `400 Bad Request`.
- Redis lỗi: API trả lỗi server.
- `available` nhập sai làm inventory demo sai.

### Ràng buộc
- API này chỉ dùng cho admin/test/seeding.
- Production nên ưu tiên lazy seed hoặc đối soát DB.
- Không tạo order/ticket khi init.
- `available` cần phản ánh số vé còn lại hợp lệ.

### Tiêu chí chấp nhận
- Admin init category thành công.
- Redis có inventory và max per user đúng.
- Reserve sau init dùng đúng dữ liệu đã warm up.
