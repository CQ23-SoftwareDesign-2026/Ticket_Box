# TicketBox — Project Proposal

## Bối cảnh
Các concert âm nhạc quy mô lớn tại Việt Nam đang chứng kiến nhu cầu truy cập đồng thời cực cao trong thời điểm mở bán. Hệ thống bán vé hiện tại thường là các kênh rời rạc (Zalo OA, Google Form, chuyển khoản thủ công) hoặc nền tảng cũ, không được thiết kế cho tải đột biến và xử lý đồng thời khắt khe. Điều này kéo theo các lỗi hệ thống, trạng thái giao dịch không nhất quán và rủi ro gian lận.

TicketBox được đề xuất như một hệ thống bán vé tập trung, số hóa toàn bộ quy trình từ mở bán, thanh toán, phát hành e-ticket đến soát vé tại cổng. Mục tiêu là thiết kế một kiến trúc chịu tải cao, an toàn giao dịch, công bằng cho người mua và dễ mở rộng cho các nhu cầu quản trị sự kiện.

## Vấn đề
Sự bùng nổ của các concert âm nhạc quy mô lớn tại Việt Nam (như Anh Trai Say Hi, Chị Đẹp Đạp Gió Rẽ Sóng) với sức chứa hàng chục nghìn khán giả đang làm lộ rõ những điểm yếu chí mạng của các nền tảng bán vé hiện tại. Việc sử dụng các kênh bán vé rời rạc (Zalo OA, Google Form, chuyển khoản thủ công) hoặc các hệ thống monolith cũ kỹ đang gây ra những hậu quả nghiêm trọng:

* **Sập hệ thống (System Crash):** Lượng truy cập khổng lồ đổ dồn vào một thời điểm (Traffic Spikes) làm cạn kiệt tài nguyên máy chủ (Connection Pool, RAM, CPU), dẫn đến tình trạng website treo hoặc sập hoàn toàn trong vài phút đầu mở bán.
* **Trừ tiền nhưng không ra vé (Inconsistent State):** Do độ trễ của cổng thanh toán hoặc lỗi đồng bộ cơ sở dữ liệu, khán giả bị trừ tiền trong tài khoản ngân hàng nhưng hệ thống không ghi nhận việc xuất vé, gây ra sự phẫn nộ và khủng hoảng truyền thông.
* **Tranh chấp và Overbooking:** Xử lý đồng thời (Concurrency) kém khiến nhiều người cùng mua thành công một vị trí ghế cuối cùng.
* **Vấn nạn Scalper Bot (Phe vé):** Thiếu cơ chế giới hạn và chặn request tự động, tạo điều kiện cho bot càn quét toàn bộ vé VIP/SVIP chỉ trong vài giây để bán lại với giá chợ đen gấp nhiều lần.
* **Hỗn loạn tại cổng soát vé:** Sân vận động thường xuyên mất sóng 4G/Wifi do hàng chục nghìn người tập trung. Việc phụ thuộc vào API trực tuyến khiến tiến trình soát vé bị tê liệt, tạo khe hở cho vé giả hoặc vé quét trùng lọt vào.

## Mục tiêu
Dự án TicketBox được xây dựng nhằm số hóa toàn diện quy trình phân phối vé và quản lý sự kiện, với mục tiêu kiến tạo một hệ thống công bằng, minh bạch và có sức chống chịu tải trọng cực đoan.

**Mục tiêu định lượng và kỹ thuật:**
* **Đảm bảo khả năng chống tải đột biến:** Hệ thống phải có cơ chế bảo vệ backend khi 80.000 người truy cập trong 5 phút đầu mở bán (70% dồn vào phút đầu). Trong phạm vi đồ án, nhóm chứng minh bằng rate limiting, Redis atomic reservation, hàng đợi bất đồng bộ và kịch bản stress test cục bộ; triển khai production đầy đủ cần bổ sung hạ tầng autoscaling/edge ở giai đoạn sau.
* **Zero Overbooking:** Đảm bảo tỷ lệ bán trùng vé là 0%, kể cả khi có hàng chục nghìn người cùng tranh chấp 200 vé SVIP giới hạn.
* **Zero Double-charge:** Đảm bảo 100% không có giao dịch nào bị trừ tiền hai lần dù mạng chập chờn hoặc người dùng cố tình spam nút thanh toán.
* **Offline Check-in:** Quá trình soát vé tại cổng phải diễn ra dưới 1 giây trên mỗi vé và hoạt động trơn tru ngay cả khi rớt mạng Internet hoàn toàn.

## Người dùng và nhu cầu
Hệ thống phục vụ ba nhóm tác nhân chính với các nhu cầu chuyên biệt:

1. **Khán giả (Audience)**
	* *Hành vi:* Tìm kiếm sự kiện, xem sơ đồ chỗ ngồi, mua vé, thanh toán và nhận e-ticket.
	* *Nhu cầu cốt lõi:* Luồng mua vé mượt mà, công bằng (không bị bot tranh giành). Minh bạch và an tâm tuyệt đối ở khâu thanh toán (thấy rõ trạng thái giao dịch).
2. **Ban tổ chức (Organizer)**
	* *Hành vi:* Quản trị toàn bộ vòng đời sự kiện (tạo concert, định giá, mở bán, xem dashboard doanh thu).
	* *Nhu cầu cốt lõi:* Hệ thống chịu tải tốt để bảo vệ danh tiếng sự kiện. Công cụ tự động hóa các tác vụ tốn thời gian (đọc CSV khách mời, AI tóm tắt hồ sơ nghệ sĩ từ PDF).
3. **Nhân sự soát vé (Checker)**
	* *Hành vi:* Sử dụng thiết bị di động quét mã QR của khán giả tại cổng.
	* *Nhu cầu cốt lõi:* App phản hồi tức thì, không bị gián đoạn khi sân vận động nghẽn mạng, phát hiện và chặn vé giả hoặc vé đã dùng.

## Phạm vi
**Trong phạm vi đồ án (In-scope):**
* Thiết kế và lập trình hoàn chỉnh kiến trúc Modular Monolith kết hợp Event-Driven.
* Hiện thực hóa các cơ chế bảo vệ hệ thống: Rate Limiting (Token Bucket), Idempotency Key (chống trừ tiền hai lần), Circuit Breaker (xử lý lỗi bên thứ ba), Redis Lua Script (chống overbooking).
* Phát triển Backend API (Node.js/NestJS), kết nối PostgreSQL, Redis và Message Broker (RabbitMQ).
* Lập trình luồng xử lý bất đồng bộ (Background Workers) cho tác vụ AI PDF OCR và import CSV.
* Phát triển mobile app check-in có lưu trữ cục bộ bằng AsyncStorage/local persistent storage để mô phỏng soát vé offline và cơ chế phân luồng cổng (Gate Segregation).
* Triển khai hạ tầng ở môi trường phát triển cục bộ bằng Docker Compose.

**Ngoài phạm vi đồ án (Out-of-scope):**
* Tích hợp đầy đủ nhiều cổng thanh toán thực tế như VNPAY/MoMo; trong đồ án ưu tiên PayOS/sandbox hoặc mock/stub để giả lập delay/timeout nhằm test Circuit Breaker.
* Triển khai production bằng Kubernetes hoặc cloud AWS/GCP (tập trung vào kiến trúc và code logic).
* Tự huấn luyện mô hình AI (sử dụng API LLM có sẵn như OpenAI hoặc Gemini).

## Rủi ro và ràng buộc
Quá trình phát triển hệ thống phải đối mặt và giải quyết các ràng buộc kỹ thuật khắt khe:

1. **Tải trọng đọc đột biến (Read-Heavy Spike):** Không để mọi request đọc trong giờ mở bán đi thẳng xuống PostgreSQL. Trong đồ án dùng Redis/cache-aside cho dữ liệu cần đọc nhiều và rate limit ở backend; ở production có thể bổ sung CDN/edge cache cho tài nguyên tĩnh và trang public.
2. **Tranh chấp vé cường độ cao (Write-Heavy Contention):** Rủi ro bottleneck nếu dùng SQL locking. Bắt buộc xử lý chốt vé nguyên tử trên RAM bằng Redis Lua Script, sau đó lưu trữ bất đồng bộ.
3. **Cổng thanh toán không ổn định:** Rủi ro hệ thống bị treo do cạn thread pool khi cổng thanh toán như PayOS/VNPAY/MoMo phản hồi chậm. Bắt buộc áp dụng Circuit Breaker và Idempotency Key để chống lặp giao dịch.
4. **Phân mảnh dữ liệu ngoại tuyến (Split-brain Offline):** Rủi ro một vé được quét ở hai cổng mất mạng khác nhau. Bắt buộc giải quyết bằng phân luồng cổng (Gate Segregation) kết hợp đồng bộ hàng loạt (Bulk-sync).
5. **Tích hợp hệ thống bên thứ ba chậm chạp:** OCR PDF và đọc CSV kéo dài; không xử lý đồng bộ trên main thread. Bắt buộc kiến trúc event-driven, đẩy task vào RabbitMQ để background worker chạy ngầm.

## Giả định
- Người dùng đăng nhập hợp lệ trước khi mua vé và có thể xác thực qua email hoặc cơ chế tương đương.
- Hạ tầng cache (Redis) và message broker (RabbitMQ) luôn sẵn có trong môi trường phát triển.
- Số lượng vé và giới hạn per-user đã được ban tổ chức cấu hình trước khi mở bán.
- Mobile app check-in là mô phỏng chức năng chính, không yêu cầu phát hành store.

## Tiêu chí chấp nhận
- Các API public và API mua vé có cơ chế trả nhanh khi vượt ngưỡng bằng HTTP 429, không để spike request làm sập backend hoặc kéo lỗi 5xx tăng cao.
- Dữ liệu concert và số vé còn lại được cache/đệm bằng Redis ở các điểm đọc nhiều; các chỉ số như p95 latency và cache hit ratio là mục tiêu vận hành cần đo bằng k6/monitoring khi triển khai production.
- Không có overbooking: tổng vé đã bán không vượt số vé cấu hình, tỷ lệ bán trùng = 0%.
- Giao dịch thanh toán dùng idempotency key, tỷ lệ double-charge = 0% trong kịch bản retry/timeout.
- E-ticket QR được cấp trong <= 5 giây sau khi thanh toán thành công; check-in online p95 <= 5 giây/vé.
- Soát vé offline ghi nhận thành công trong <= 5 giây/vé; đồng bộ sau khi có mạng trong <= 5 phút và không tạo trùng vé.
- Import CSV Guest List (50.000 dòng) hoàn tất trong <= 10 phút, có báo cáo lỗi/trùng và không làm gián đoạn hệ thống.
- Tác vụ AI tóm tắt hồ sơ nghệ sĩ từ PDF hoàn tất trong <= 2 phút/tài liệu ở môi trường dev.
