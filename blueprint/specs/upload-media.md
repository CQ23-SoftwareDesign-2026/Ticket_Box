# Đặc tả: Upload media cho concert

## Tổng quan
Upload media cho phép admin/organizer tải poster và sơ đồ chỗ ngồi/cổng lên Supabase Storage. API trả về public URL để lưu vào `poster_url` hoặc `svg_map_url` khi tạo/cập nhật concert.

Backend liên quan:

- `apps/backend-api/src/modules/upload/upload.controller.ts`
- `apps/backend-api/src/modules/upload/upload.service.ts`

Biến môi trường liên quan:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_BUCKET`

## API: `POST /uploads/image`

### Mô tả
Upload poster concert dạng ảnh. URL trả về được dùng làm `poster_url` trong catalog/admin concert.

### Luồng chính
1. Admin/Organizer gửi request `multipart/form-data` với field `file`.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN` hoặc `ORGANIZER`.
4. Controller kiểm tra file có tồn tại.
5. Controller kiểm tra kích thước tối đa `5MB`.
6. Controller chỉ cho phép MIME type `image/jpeg`, `image/png`, `image/webp`.
7. `UploadService` tạo tên file bằng `randomUUID`.
8. File được upload lên Supabase Storage vào folder `posters`.
9. API trả về `{ url }`.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`/`ORGANIZER`: `403 Forbidden`.
- Không gửi file: `400 Bad Request`.
- File lớn hơn `5MB`: `400 Bad Request`.
- MIME type không thuộc JPEG/PNG/WebP: `400 Bad Request`.
- Thiếu `SUPABASE_URL` hoặc `SUPABASE_KEY`: `400 Bad Request` với thông báo upload service chưa cấu hình.
- Supabase Storage trả lỗi: `400 Bad Request` với thông báo upload thất bại.

### Ràng buộc
- Không cho public user upload file.
- Poster chỉ nhận định dạng ảnh phổ biến để giảm rủi ro file độc hại.
- Backend không lưu file vào database, chỉ trả URL public để entity concert tham chiếu.

### Tiêu chí chấp nhận
- Admin/Organizer upload JPEG/PNG/WebP hợp lệ và nhận URL.
- File quá dung lượng bị từ chối.
- File sai định dạng bị từ chối.
- User thường không upload được poster.

## API: `POST /uploads/svg`

### Mô tả
Upload sơ đồ chỗ ngồi/cổng dạng SVG. URL trả về được dùng làm `svg_map_url` trong catalog/admin concert.

### Luồng chính
1. Admin/Organizer gửi request `multipart/form-data` với field `file`.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN` hoặc `ORGANIZER`.
4. Controller kiểm tra file có tồn tại.
5. Controller kiểm tra kích thước tối đa `2MB`.
6. Controller chấp nhận MIME type `image/svg+xml` hoặc filename kết thúc bằng `.svg`.
7. Nếu multer parse SVG thành `application/octet-stream`, controller ép lại `file.mimetype = image/svg+xml`.
8. `UploadService` tạo tên file bằng `randomUUID`.
9. File được upload lên Supabase Storage vào folder `maps`.
10. API trả về `{ url }`.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`/`ORGANIZER`: `403 Forbidden`.
- Không gửi file: `400 Bad Request`.
- File lớn hơn `2MB`: `400 Bad Request`.
- File không phải SVG theo MIME type hoặc extension: `400 Bad Request`.
- Thiếu cấu hình Supabase: `400 Bad Request`.
- Supabase Storage trả lỗi: `400 Bad Request`.

### Ràng buộc
- SVG chỉ dành cho admin/organizer, không mở upload public.
- SVG cần kiểm soát vì có thể chứa nội dung không mong muốn nếu nguồn không tin cậy.
- Production nên bổ sung bước sanitize SVG trước khi public.

### Tiêu chí chấp nhận
- Admin/Organizer upload SVG hợp lệ và nhận URL.
- File không phải SVG bị từ chối.
- File SVG quá `2MB` bị từ chối.
- URL trả về có thể gắn vào `svg_map_url` của concert.

## Phân tích trade-off

### Vấn đề
Concert cần ảnh poster và sơ đồ chỗ ngồi để hiển thị trên frontend, nhưng upload file trực tiếp từ client lên storage cần kiểm soát quyền, dung lượng và định dạng.

### Giải pháp đang sử dụng
Client upload file qua backend. Backend xác thực role, validate file, sau đó upload lên Supabase Storage và trả public URL.

### Trade-off
- Upload qua backend giúp kiểm soát quyền và validation tập trung, dễ demo và dễ debug.
- Nhược điểm là file đi qua backend nên tốn tài nguyên server hơn signed URL upload trực tiếp.
- Signed URL phù hợp hơn production quy mô lớn, nhưng cần thêm flow cấp URL, giới hạn thời gian, policy storage và xử lý callback. Với phạm vi đồ án, upload qua backend là lựa chọn đơn giản và đủ an toàn.
- SVG nhẹ và zoom tốt cho seating map, nhưng có rủi ro bảo mật nếu không sanitize; vì vậy hệ thống hiện giới hạn quyền upload cho admin/organizer và production nên bổ sung sanitizer.
