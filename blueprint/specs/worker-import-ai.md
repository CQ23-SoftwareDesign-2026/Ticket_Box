# Đặc tả: Worker, AI bio và CSV import

## Mô tả
Worker module xử lý các tác vụ nền không nên chạy trực tiếp trong request chính, gồm generate AI bio từ PDF press kit, import guest list từ CSV, theo dõi background job và xem guest list theo concert.

Backend chính:

- `apps/backend-api/src/modules/worker/controllers/worker.controller.ts`
- `apps/backend-api/src/modules/worker/services/worker.service.ts`
- RabbitMQ cho job import CSV.

API chính:

- `POST /worker/generate-bio`
- `POST /worker/import-csv`
- `GET /worker/job/:id`
- `GET /worker/concert/:concertId/guests`
- `GET /worker/jobs`

## Luồng chính

### 1. Generate AI bio từ PDF
Admin/Organizer gọi:

```txt
POST /worker/generate-bio
Content-Type: multipart/form-data
fields: concert_id, file
```

Backend validate:

- `concert_id` bắt buộc và đúng UUID.
- File bắt buộc.
- File phải là PDF theo MIME type hoặc extension `.pdf`.

Backend tạo job generate bio thông qua `WorkerService`, response:

```json
{
  "job_id": "job-uuid",
  "status": "PENDING"
}
```

Client dùng `GET /worker/job/:id` để theo dõi tiến trình.

### 2. Import guest list từ CSV
Admin/Organizer gọi:

```txt
POST /worker/import-csv
Content-Type: multipart/form-data
fields: concert_id, file
```

CSV yêu cầu các cột nghiệp vụ như:

- `email`
- `full_name`
- `ticket_category`

Backend xử lý:

1. Validate file `.csv`.
2. Validate concert tồn tại.
3. Lưu file tạm vào `apps/backend-api/tmp/csv-uploads`.
4. Tạo `BackgroundJob` với `job_type = GUEST_LIST_IMPORT`, status `PENDING`.
5. Publish message vào RabbitMQ exchange `guest.import.exchange`, routing key `guest.import`.
6. Worker xử lý import bất đồng bộ và cập nhật tiến trình job.

Nếu publish RabbitMQ lỗi, backend xóa file tạm, đánh dấu job `FAILED` và trả lỗi.

### 3. Xem trạng thái job
Client gọi:

```txt
GET /worker/job/:id
```

Yêu cầu role `ADMIN` hoặc `ORGANIZER`.

Response là bản ghi `BackgroundJob`, gồm:

- `id`
- `job_type`
- `target_id`
- `status`
- `progress_percentage`
- `error_message`
- `created_at`
- `completed_at`

### 4. Xem guest list theo concert
Client gọi:

```txt
GET /worker/concert/:concertId/guests
```

Query:

```txt
page?: number
limit?: number
category?: string
search?: email | full_name
is_scanned?: true | false
```

Backend validate concert tồn tại, sau đó trả danh sách guest list theo pagination.

### 5. Admin xem tất cả background jobs
Admin gọi:

```txt
GET /worker/jobs
```

Query:

```txt
page?: number
limit?: number
status?: string
job_type?: string
concert_id?: uuid
```

Chỉ role `ADMIN` được xem danh sách tất cả jobs. Response có thêm `concert_name`, `triggered_by_name`, `triggered_by_email`.

## Kịch bản lỗi

- User không đăng nhập: `401 Unauthorized`.
- User không có role `ADMIN`/`ORGANIZER`: `403 Forbidden`.
- `concert_id` sai UUID: `400 Bad Request`.
- Concert không tồn tại: `404 Not Found`.
- Không gửi file: `400 Bad Request`.
- Generate bio gửi file không phải PDF: `400 Bad Request`.
- Import CSV gửi file không phải `.csv`: `400 Bad Request`.
- RabbitMQ publish lỗi: job bị đánh dấu `FAILED`, file tạm bị xóa.
- Job ID sai format: `400 Bad Request`.
- Job không tồn tại: `404 Not Found`.

## Ràng buộc

- Tác vụ nặng phải chạy nền, không chặn request admin quá lâu.
- Background job phải có trạng thái và tiến trình để FE poll.
- File upload tạm cần được xóa khi queue job thất bại.
- Guest list query phải dùng pagination.
- `GET /worker/jobs` chỉ dành cho `ADMIN`.

## Tiêu chí chấp nhận

- Admin/Organizer upload PDF và nhận `job_id`.
- Admin/Organizer upload CSV hợp lệ và tạo job import.
- Job status có thể được poll qua `/worker/job/:id`.
- Guest list sau import xem được theo concert.
- Có thể filter guest theo category, search, scan status.
- Admin xem được danh sách toàn bộ jobs.
- File sai định dạng bị từ chối.
## Phân tích trade-off

### Xử lý bất đồng bộ bằng background job
- Ưu điểm: request upload/generate không bị treo lâu, FE có thể poll tiến trình.
- Nhược điểm: hệ thống cần RabbitMQ/worker và phải xử lý job fail/retry.
- Lý do phù hợp: import CSV và generate AI bio có thể mất nhiều thời gian, không nên chạy trong request chính.

### Lưu file CSV tạm trên disk
- Ưu điểm: đơn giản, worker có thể đọc file sau khi job được queue.
- Nhược điểm: nếu deploy nhiều instance hoặc filesystem ephemeral, worker có thể không đọc được file nếu không cùng máy.
- Lý do phù hợp: phù hợp local/demo; production nên dùng shared object storage như S3/Supabase Storage.

### Poll job status thay vì realtime
- Ưu điểm: dễ triển khai, ít phụ thuộc kết nối realtime.
- Nhược điểm: FE phải gọi lặp lại và trạng thái không cập nhật tức thì.
- Lý do phù hợp: background job admin không yêu cầu realtime tuyệt đối.

### Admin-only job list
- Ưu điểm: tránh organizer nhìn thấy toàn bộ job của hệ thống.
- Nhược điểm: organizer chỉ theo dõi được job cụ thể nếu có job id.
- Lý do phù hợp: danh sách jobs toàn hệ thống chứa thông tin vận hành nhạy cảm.
