# Đặc tả: Admin APIs và màn hình quản trị

## Mô tả
Nhóm API admin phục vụ các màn hình quản trị trong web app:

- Dashboard tổng quan.
- Quản lý sự kiện/concert và ticket tier.
- Quản lý đơn hàng.
- Quản lý doanh thu.
- Quản lý người dùng/role/status.
- Phân công checker theo concert/gate.
- Xem notification phía admin.

Phần frontend nằm chủ yếu trong `apps/web-app/src/app/admin`, gọi API qua các service trong `apps/web-app/src/services`.

## Quyền truy cập chung

Đa số API admin yêu cầu:

- JWT hợp lệ qua `JwtAuthGuard`.
- Role `ADMIN` qua `RolesGuard`.
- ValidationPipe với `transform: true`, `whitelist: true`.

Một số API quản lý concert cho phép cả `ADMIN` và `ORGANIZER`, nhưng vẫn yêu cầu permission cụ thể:

- `CREATE_CONCERT`
- `UPDATE_CONCERT`
- `DELETE_CONCERT`

## Luồng chính

### 1. Dashboard admin
Frontend:

- `apps/web-app/src/app/admin/dashboard`

Backend:

- `GET /admin/dashboard/summary`
- `GET /admin/dashboard/revenue`
- `GET /admin/dashboard/recent-orders`

Mục đích:

- Hiển thị số liệu tổng quan của hệ thống.
- Hiển thị biểu đồ doanh thu theo ngày/tuần/tháng.
- Hiển thị danh sách đơn hàng mới nhất.

Query của revenue dashboard:

```txt
from?: ISO datetime
to?: ISO datetime
group_by?: day | week | month
```

Query của recent orders:

```txt
limit?: 1..20
```

Ràng buộc:

- Chỉ role `ADMIN` được xem dashboard.
- Dữ liệu doanh thu nên tính trên order/payment đã hoàn thành, không tính order pending/cancelled.

### 2. Quản lý concert và ticket tier
Frontend:

- `apps/web-app/src/app/admin/events`
- `apps/web-app/src/app/admin/create-event`

Backend:

- `GET /concerts`
- `GET /concerts/:id`
- `POST /concerts`
- `PATCH /concerts/:id`
- `DELETE /concerts/:id`

API public/list/detail:

- `GET /concerts` hỗ trợ pagination, filter `status`, search theo tên concert.
- `GET /concerts/:id` trả chi tiết concert và ticket tier.

API tạo/sửa/xóa:

- Yêu cầu role `ADMIN` hoặc `ORGANIZER`.
- Yêu cầu permission tương ứng.
- `DELETE /concerts/:id` là soft delete.

Body tạo concert gồm các nhóm thông tin:

```json
{
  "name": "Anh Trai Say Hi",
  "description": "Concert description",
  "location": "Ho Chi Minh City",
  "performers": ["Artist A", "Artist B"],
  "ai_bio": "AI generated bio",
  "start_time": "2026-07-20T19:30:00+07:00",
  "svg_map_url": "https://...",
  "poster_url": "https://...",
  "status": "PUBLISHED",
  "ticketTiers": [
    {
      "name": "SVIP",
      "price": 2500000,
      "total_quantity": 200,
      "max_per_user": 2,
      "gate_number": 1
    }
  ]
}
```

Ràng buộc quan trọng:

- `start_time` phải là ngày trong tương lai khi tạo/cập nhật.
- Mỗi concert phải có ít nhất một ticket tier khi tạo.
- `gate_number` của ticket tier được dùng cho check-in và phân công checker.
- Khi update concert có `ticketTiers`, backend sẽ cập nhật lại thông tin tier theo payload.

### 3. Warm up Redis inventory cho ticketing
Backend:

- `POST /tickets/init`

Mục đích:

- Khởi tạo inventory của một ticket category vào Redis để test/demo luồng đặt vé.
- API này chỉ dành cho admin/test/seeding.

Body:

```json
{
  "category_id": "category-uuid",
  "available": 200,
  "max_per_user": 2
}
```

Response:

```json
{
  "status": "SUCCESS",
  "message": "Category inventory initialized"
}
```

Lưu ý:

- Luồng production nên ưu tiên lazy seed từ database khi category chưa có trong Redis.
- Warm up dùng khi cần prewarm trước mở bán hoặc demo stress test.
- Giá trị `available` cần khớp với số vé còn lại hợp lệ của category.

### 4. Quản lý đơn hàng
Frontend:

- `apps/web-app/src/app/admin/orders`
- `apps/web-app/src/app/admin/orders/[orderId]`

Backend:

- `GET /orders/admin`
- `GET /orders/admin/:id`

`GET /orders/admin` hỗ trợ:

```txt
page?: number
limit?: number
status?: PENDING | PAID | CANCELLED
search?: order id | concert name | user email | user name
payment_method?: string
user_id?: string
concert_id?: string
```

`GET /orders/admin/:id` trả chi tiết một order bất kỳ cho admin, gồm thông tin người mua, concert, payment transaction và ticket breakdown.

Ràng buộc:

- Chỉ role `ADMIN` được xem tất cả order.
- User thường chỉ xem được order của chính mình qua `/orders/:id`.
- Admin order detail phải dùng API riêng `/orders/admin/:id` để không bị giới hạn theo `req.user.sub`.

### 5. Quản lý doanh thu
Frontend:

- `apps/web-app/src/app/admin/revenue`

Backend:

- `GET /admin/revenue/trend`
- `GET /admin/revenue/by-concert`
- `GET /admin/revenue/concerts/:concert_id/detail`

Query chung:

```txt
from?: ISO datetime
to?: ISO datetime
```

Trend:

```txt
group_by?: day | week | month
```

Doanh thu theo concert:

```txt
status?: DRAFT | PUBLISHED | COMPLETED
limit?: 1..100
```

Mục đích:

- `trend`: vẽ biểu đồ doanh thu theo thời gian.
- `by-concert`: so sánh doanh thu từng concert trong khoảng ngày.
- `concerts/:concert_id/detail`: xem chi tiết doanh thu, ticket sold, breakdown theo tier của một concert.

Ràng buộc:

- Chỉ role `ADMIN` được xem revenue.
- Khoảng ngày `from/to` cần được FE hiển thị rõ trên biểu đồ và bảng doanh thu.
- `to` nên được normalize về cuối ngày khi người dùng chọn ngày trên UI để không bị mất doanh thu trong ngày đó.

### 6. Quản lý user, role và status
Frontend:

- `apps/web-app/src/app/admin/users`

Backend:

- `GET /admin/users`
- `POST /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id/status`
- `PATCH /admin/users/:id/roles`

`GET /admin/users` hỗ trợ:

```txt
page?: number
limit?: number
search?: email | full name
status?: ACTIVE | INACTIVE | BANNED | PENDING
role?: string
```

Tạo user:

```json
{
  "email": "checker@example.com",
  "password": "Password123!",
  "full_name": "Nguyen Van Checker",
  "status": "ACTIVE",
  "roles": ["Checker"]
}
```

Cập nhật status:

```json
{
  "status": "ACTIVE"
}
```

Cập nhật roles:

```json
{
  "roles": ["Audience", "Checker"]
}
```

Ràng buộc:

- Chỉ role `ADMIN` được quản lý user.
- Role trong request phải tồn tại trong database.
- Email tạo mới không được trùng.
- Status chỉ nằm trong `ACTIVE`, `INACTIVE`, `BANNED`, `PENDING`.

### 7. Phân công checker theo concert/gate
Frontend:

- `apps/web-app/src/app/admin/assignments`

Backend:

- `GET /checkin/assignments`
- `POST /checkin/assignments`
- `PUT /checkin/assignments/:id`
- `DELETE /checkin/assignments/:id`
- `GET /checkin/assignments/concerts`
- `GET /checkin/assignments/checkers`
- `GET /checkin/assignments/gates/:concert_id`

Query danh sách assignment:

```txt
page?: number
limit?: number
concert_id?: uuid
checker_id?: uuid
```

Tạo assignment:

```json
{
  "checker_id": "checker-user-uuid",
  "concert_id": "concert-uuid",
  "gate_number": 1
}
```

Cập nhật assignment:

```json
{
  "gate_number": 2
}
```

Mục đích các API phụ:

- `/concerts`: lấy concert `PUBLISHED` để admin chọn.
- `/checkers`: lấy tài khoản checker đang hoạt động.
- `/gates/:concert_id`: lấy danh sách gate còn trống/chưa được phân công.

Ràng buộc:

- Chỉ role `ADMIN` được quản lý assignment.
- Checker phải là user hợp lệ có role checker.
- Concert phải hợp lệ.
- Gate number phải thuộc các ticket tier của concert.
- Một gate trong một concert không nên bị phân công trùng nếu không có chủ đích vận hành rõ ràng.

### 8. Notification admin
Frontend:

- `apps/web-app/src/app/admin/notifications`

Backend:

- `GET /admin/notifications`

Mục đích:

- Cho admin xem danh sách notification của hệ thống/người dùng theo query.

Ràng buộc:

- Chỉ role `ADMIN` được truy cập.
- Query được validate theo `AdminNotificationQueryDto`.

## Kịch bản lỗi

### Auth và permission
- Thiếu JWT: `401 Unauthorized`.
- JWT hết hạn/không hợp lệ: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- API concert create/update/delete thiếu permission tương ứng: `403 Forbidden`.

### Validation
- UUID sai format: `400 Bad Request`.
- Query/body sai type: `400 Bad Request`.
- `start_time` không phải ngày tương lai khi tạo/sửa concert: `400 Bad Request`.
- Status/role/group_by không nằm trong enum hợp lệ: `400 Bad Request`.

### Nghiệp vụ
- Tạo user với email đã tồn tại: request bị từ chối.
- Update role không tồn tại: request bị từ chối.
- Lấy detail order/concert/user không tồn tại: `404 Not Found`.
- Tạo assignment cho checker/concert/gate không hợp lệ: request bị từ chối.
- Xem revenue với khoảng ngày không có dữ liệu: trả mảng rỗng hoặc metric bằng 0, không coi là lỗi.

## Ràng buộc

- API admin không được expose dữ liệu quản trị cho user thường.
- Các màn hình danh sách phải dùng pagination để tránh query quá lớn.
- Các thao tác tạo/sửa/xóa phải được validate ở DTO.
- Revenue chỉ tính trên giao dịch/order đã hoàn thành hợp lệ.
- Assignment checker là nguồn phân quyền cho mobile check-in.
- Gate number trong ticket tier, assignment và check-in phải thống nhất.
- Soft delete concert không nên làm mất dữ liệu order/ticket lịch sử.

## Tiêu chí chấp nhận

- Admin đăng nhập xem được dashboard summary, revenue chart và recent orders.
- User không phải admin không truy cập được `/admin/*`.
- Admin tạo/sửa/xóa concert thành công với payload hợp lệ.
- Concert tạo mới có ticket tier và gate number để phục vụ ticketing/check-in.
- Admin xem, lọc và mở chi tiết order bất kỳ.
- Admin xem revenue theo range và theo concert.
- Admin tạo user checker và gán role thành công.
- Admin đổi status/roles của user thành công.
- Admin tạo assignment checker cho concert/gate thành công.
- Checker sau khi được assign thấy assignment trong mobile app.
- Gate đã assign được dùng để prefetch và scan ticket đúng cổng.

## Kiểm thử đề xuất

### Manual test
- Đăng nhập bằng admin, mở `/admin/dashboard`, kiểm tra summary/revenue/recent orders có data.
- Mở `/admin/create-event`, tạo concert có ít nhất một ticket tier và `gate_number`.
- Mở `/admin/events`, search/filter concert, sửa concert, kiểm tra detail thay đổi.
- Mở `/admin/users`, tạo checker mới, gán role `Checker`, đổi status.
- Mở `/admin/assignments`, chọn concert PUBLISHED, chọn checker, chọn gate, tạo assignment.
- Đăng nhập mobile bằng checker, kiểm tra assignment vừa tạo xuất hiện.
- Mở `/admin/orders`, filter theo status/concert, vào chi tiết order.
- Mở `/admin/revenue`, chọn range ngày, kiểm tra trend và revenue by concert hiện đúng range.

### Automated test nên có
- Guard test: user không có role admin bị chặn với `/admin/*`.
- DTO validation test cho create/update concert.
- Service test cho admin users: email trùng, role không tồn tại, update status.
- Service test cho checker assignment: gate không hợp lệ, assignment trùng, delete assignment.
- Revenue test: chỉ tính order paid/completed, không tính pending/cancelled.
## Phân tích trade-off

### Gom nhiều admin API dưới role `ADMIN`
- Ưu điểm: đơn giản, dễ kiểm soát, phù hợp dashboard quản trị tập trung.
- Nhược điểm: chưa đủ mịn nếu production cần nhiều vai trò như finance admin, event manager, support.
- Lý do phù hợp: hiện tại ưu tiên chính là chặn user thường khỏi dữ liệu và thao tác quản trị.

### Pagination cho danh sách quản trị
- Ưu điểm: tránh query quá lớn ở users, orders, assignments, jobs.
- Nhược điểm: FE phải quản lý state page/filter và có thể cần nhiều request hơn khi admin duyệt dữ liệu.
- Lý do phù hợp: dữ liệu quản trị tăng theo thời gian, pagination là bắt buộc để UI và DB ổn định.

### Soft delete concert
- Ưu điểm: giữ được lịch sử order, ticket, revenue liên quan đến concert.
- Nhược điểm: query phải cẩn thận để không hiển thị dữ liệu đã xóa ở nơi không cần.
- Lý do phù hợp: hệ thống ticketing cần audit lịch sử, không nên hard delete concert đã có giao dịch.
