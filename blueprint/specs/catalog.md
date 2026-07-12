# Đặc tả: Catalog và xem concert

## Mô tả
Catalog cung cấp dữ liệu public để người dùng xem danh sách concert, xem chi tiết concert và chọn ticket tier trước khi đặt vé. Phần admin/organizer cũng dùng cùng module để tạo, sửa, xóa concert.

Backend chính:

- `apps/backend-api/src/modules/catalog/controllers/concert.controller.ts`
- `apps/backend-api/src/modules/catalog/services/concert.service.ts`

Frontend chính:

- Trang danh sách/chi tiết concert của web app.
- Admin create/edit event.

## Luồng chính

### 1. Xem danh sách concert
Client gọi:

```txt
GET /concerts
```

Query:

```txt
page?: number
limit?: number
status?: DRAFT | PUBLISHED | COMPLETED
search?: string
```

Response gồm:

- `data`: danh sách concert.
- `meta`: thông tin pagination.

Mục đích:

- User tìm concert đang mở bán.
- Admin lọc concert theo trạng thái.
- Mobile check-in có thể lấy thông tin concert khi cần hiển thị ticket type.

### 2. Xem chi tiết concert
Client gọi:

```txt
GET /concerts/:id
```

Endpoint này có `ConcertDetailRateLimitGuard` để hạn chế spam request vào chi tiết concert.

Response gồm thông tin concert và `ticketTiers`:

- `id`
- `name`
- `description`
- `location`
- `start_time`
- `poster_url`
- `svg_map_url`
- `status`
- `ticketTiers`

Mỗi ticket tier chứa:

- `id`
- `name`
- `price`
- `total_quantity`
- `max_per_user`
- `gate_number`

### 3. Tạo concert
Admin/Organizer gọi:

```txt
POST /concerts
```

Yêu cầu:

- JWT hợp lệ.
- Role `ADMIN` hoặc `ORGANIZER`.
- Permission `CREATE_CONCERT`.

Body gồm thông tin concert và danh sách `ticketTiers`.

### 4. Cập nhật concert
Admin/Organizer gọi:

```txt
PATCH /concerts/:id
```

Yêu cầu:

- Role `ADMIN` hoặc `ORGANIZER`.
- Permission `UPDATE_CONCERT`.

Cho phép cập nhật thông tin concert, trạng thái, poster/map URL và ticket tier.

### 5. Xóa concert
Admin/Organizer gọi:

```txt
DELETE /concerts/:id
```

Yêu cầu:

- Role `ADMIN` hoặc `ORGANIZER`.
- Permission `DELETE_CONCERT`.

API thực hiện soft delete để giữ dữ liệu lịch sử.

## Kịch bản lỗi

- Concert không tồn tại: `404 Not Found`.
- Payload tạo/sửa sai validation: `400 Bad Request`.
- `start_time` không phải ngày tương lai khi tạo/sửa: `400 Bad Request`.
- User không có quyền tạo/sửa/xóa concert: `403 Forbidden`.
- Spam concert detail vượt rate limit: `429 Too Many Requests`.

## Ràng buộc

- Public user có thể xem list/detail concert.
- Chỉ admin/organizer có permission mới được mutate concert.
- Mỗi concert khi tạo phải có ít nhất một ticket tier.
- `gate_number` trong ticket tier phải nhất quán với check-in assignment.
- Soft delete không được làm mất order/ticket lịch sử.
- Concert detail cần rate limit vì đây là endpoint dễ bị hit nhiều trước khi mở bán.

## Tiêu chí chấp nhận

- User xem được danh sách concert có pagination.
- User xem được chi tiết concert và ticket tier.
- Admin tạo concert mới thành công với ticket tier hợp lệ.
- Admin cập nhật concert/ticket tier thành công.
- Admin xóa mềm concert thành công.
- Request chi tiết concert spam bị rate limit.
## Phân tích trade-off

### Concert detail public nhưng có rate limit
- Ưu điểm: user không cần đăng nhập vẫn xem thông tin sự kiện, đồng thời backend được bảo vệ khỏi spam detail.
- Nhược điểm: user thật cùng IP có thể bị ảnh hưởng nếu cấu hình limit quá thấp.
- Lý do phù hợp: chi tiết concert là endpoint bị truy cập nhiều trước khi mua vé, cần bảo vệ nhẹ nhưng không yêu cầu auth.

### Ticket tier nằm trong concert payload
- Ưu điểm: FE có đủ thông tin để hiển thị giá, số lượng, giới hạn mua và gate trong một lần lấy detail.
- Nhược điểm: payload detail lớn hơn, update tier phải cẩn thận để không làm sai dữ liệu bán vé.
- Lý do phù hợp: trải nghiệm mua vé cần dữ liệu ticket tier ngay trên trang chi tiết concert.

### Soft delete concert
- Ưu điểm: bảo toàn lịch sử order, revenue, ticket.
- Nhược điểm: cần filter dữ liệu đã xóa ở các màn hình public.
- Lý do phù hợp: concert đã có giao dịch không nên bị xóa cứng khỏi hệ thống.
