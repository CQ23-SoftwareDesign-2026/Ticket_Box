# Đặc tả: Upload media cho concert

## Mô tả
Upload media cho phép admin/organizer tải poster và sơ đồ chỗ ngồi/cổng lên hệ thống, sau đó dùng URL trả về để gắn vào concert.

Backend chính:

- `apps/backend-api/src/modules/upload/upload.controller.ts`
- `apps/backend-api/src/modules/upload/upload.service.ts`

API chính:

- `POST /uploads/image`
- `POST /uploads/svg`

## Luồng chính

### 1. Upload poster image
Admin/Organizer gọi:

```txt
POST /uploads/image
Content-Type: multipart/form-data
field: file
```

Yêu cầu:

- JWT hợp lệ.
- Role `ADMIN` hoặc `ORGANIZER`.
- File bắt buộc.

Backend validate:

- Kích thước tối đa 5MB.
- MIME type chỉ nhận `image/jpeg`, `image/png`, `image/webp`.

Response:

```json
{
  "url": "https://..."
}
```

URL này được dùng làm `poster_url` khi tạo/sửa concert.

### 2. Upload SVG map
Admin/Organizer gọi:

```txt
POST /uploads/svg
Content-Type: multipart/form-data
field: file
```

Backend validate:

- Kích thước tối đa 2MB.
- MIME type `image/svg+xml` hoặc filename kết thúc `.svg`.

Response:

```json
{
  "url": "https://..."
}
```

URL này được dùng làm `svg_map_url` khi tạo/sửa concert.

## Kịch bản lỗi

- Thiếu JWT: `401 Unauthorized`.
- User không phải `ADMIN`/`ORGANIZER`: `403 Forbidden`.
- Không gửi file: `400 Bad Request`.
- Poster lớn hơn 5MB: `400 Bad Request`.
- SVG lớn hơn 2MB: `400 Bad Request`.
- Poster sai định dạng: `400 Bad Request`.
- SVG sai định dạng: `400 Bad Request`.
- Upload service/storage lỗi: API trả lỗi server tương ứng.

## Ràng buộc

- Upload chỉ dành cho admin/organizer.
- Không cho upload file tùy ý ngoài danh sách MIME được phép.
- Poster và SVG dùng URL trả về để lưu vào concert, không nhúng file trực tiếp trong concert payload.
- SVG cần được kiểm soát vì có thể chứa nội dung không mong muốn nếu source không tin cậy.

## Tiêu chí chấp nhận

- Admin upload poster JPEG/PNG/WebP hợp lệ và nhận URL.
- Admin upload SVG map hợp lệ và nhận URL.
- File sai định dạng bị từ chối.
- File vượt giới hạn dung lượng bị từ chối.
- User thường không upload được media.
## Phân tích trade-off

### Upload qua backend
- Ưu điểm: backend kiểm soát quyền, MIME type, dung lượng trước khi đưa file vào storage.
- Nhược điểm: file đi qua backend nên tốn tài nguyên server hơn so với upload trực tiếp lên object storage bằng signed URL.
- Lý do phù hợp: cách này đơn giản, dễ demo và đủ an toàn cho quy mô đồ án.

### Giới hạn định dạng file
- Ưu điểm: giảm rủi ro upload file độc hại hoặc file quá lớn.
- Nhược điểm: admin không upload được các định dạng khác nếu có nhu cầu đặc biệt.
- Lý do phù hợp: poster và map chỉ cần JPEG/PNG/WebP/SVG, không cần mở rộng định dạng.

### SVG map
- Ưu điểm: SVG nhẹ, zoom tốt, phù hợp sơ đồ sân khấu/cổng.
- Nhược điểm: SVG có thể chứa script hoặc nội dung không mong muốn nếu không sanitize kỹ.
- Lý do phù hợp: hệ thống chỉ cho admin/organizer upload, giảm rủi ro so với public upload; production nên bổ sung sanitize SVG.
