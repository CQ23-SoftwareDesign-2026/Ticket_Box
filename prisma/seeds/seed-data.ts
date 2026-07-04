export const DEFAULT_PASSWORD = "123456";
export const BCRYPT_SALT = "$2b$10$EixZaYVK1fsbw1ZfbX3OXe";
export const FAKER_SEED = 9;

export const roles = [
    { name: "Admin", description: "System administrator" },
    { name: "Organizer", description: "Concert organizer" },
    { name: "Checker", description: "Gate staff" },
    { name: "Audience", description: "Regular customer" },
];

export const permissions = [
    { code: "CREATE_CONCERT", description: "Create concerts" },
    { code: "UPDATE_CONCERT", description: "Update concerts" },
    { code: "DELETE_CONCERT", description: "Delete concerts" },
    { code: "VIEW_REVENUE", description: "View revenue reports" },
    { code: "SCAN_TICKET", description: "Scan tickets at gate" },
];

export const rolePermissions: Record<string, string[]> = {
    Admin: ["CREATE_CONCERT", "UPDATE_CONCERT", "DELETE_CONCERT", "VIEW_REVENUE", "SCAN_TICKET"],
    Organizer: ["CREATE_CONCERT", "UPDATE_CONCERT", "VIEW_REVENUE"],
    Checker: ["SCAN_TICKET"],
    Audience: [],
};

export const staticUsers = [
    {
        email: "vy.admin@ticketbox.local",
        full_name: "Vy Admin",
        status: "ACTIVE",
        roles: ["Admin"],
    },
    {
        email: "vuong.admin@ticketbox.local",
        full_name: "Vuong Admin",
        status: "ACTIVE",
        roles: ["Admin"],
    },
    {
        email: "tuan.organizer@ticketbox.local",
        full_name: "Tuan Organizer",
        status: "ACTIVE",
        roles: ["Organizer"],
    },
    {
        email: "quang.checker@ticketbox.local",
        full_name: "Quang Checker",
        status: "ACTIVE",
        roles: ["Checker"],
    },
];

export const concerts = [
    {
        id: "c09a6502-e081-483a-96f6-d0001c06b5d1",
        name: "[CONCERT ENCORE] ANH TRAI VƯỢT NGÀN CHÔNG GAI DAY7, DAY8",
        description:
            "Concert Encore quy mô hoành tráng tập hợp các Anh Tài của Anh Trai Vượt Ngàn Chông Gai. Sân khấu đỉnh cao với âm thanh ánh sáng hiện đại và những màn trình diễn tràn đầy nhiệt huyết tái hiện các ca khúc hit làm mưa làm gió trong thời gian qua.",
        location: "The Global City, Đỗ Xuân Hợp, Tp Thủ Đức, Phường An Phú, Quận 2, Thành Phố Hồ Chí Minh",
        ai_bio:
            "Dàn Anh Tài thực lực với phong cách đa dạng, cống hiến hết mình vì nghệ thuật. Đêm diễn hứa hẹn mang đến những tiết mục kết hợp bùng nổ và cảm xúc thăng hoa khó quên cho người hâm mộ.",
        start_time: new Date("2025-09-07T18:30:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/9a07b16a-4532-4e1a-b074-547c3bb58ede.jpg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/c09a6502-e081-483a-96f6-d0001c06b5d1.png",
        status: "COMPLETED",
        ticket_categories: [
            { name: "S-VIP 1", price: 10000000, max_per_user: 10, gate_number: 1, position: 1, status: "sold_out", total_quantity: 300 },
            { name: "S-VIP 2", price: 10000000, max_per_user: 10, gate_number: 1, position: 2, status: "sold_out", total_quantity: 300 },

            { name: "Xương Rồng 1", price: 3500000, max_per_user: 4, gate_number: 2, position: 3, status: "sold_out", total_quantity: 1800 },
            { name: "Xương Rồng 2", price: 3500000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 1800 },

            { name: "Sao Sáng 1", price: 3000000, max_per_user: 4, gate_number: 2, position: 5, status: "sold_out", total_quantity: 2200 },
            { name: "Sao Sáng 2", price: 3000000, max_per_user: 4, gate_number: 2, position: 6, status: "sold_out", total_quantity: 2200 },

            { name: "Xuân Hạ Thu Đông 1", price: 3000000, max_per_user: 4, gate_number: 3, position: 7, status: "sold_out", total_quantity: 2200 },
            { name: "Xuân Hạ Thu Đông 2", price: 3000000, max_per_user: 4, gate_number: 3, position: 8, status: "sold_out", total_quantity: 2200 },

            { name: "Đa Sắc", price: 2500000, max_per_user: 4, gate_number: 4, position: 9, status: "sold_out", total_quantity: 3500 },
            { name: "Đa Tình", price: 2500000, max_per_user: 4, gate_number: 4, position: 10, status: "sold_out", total_quantity: 3500 },
            { name: "Rực Lửa 1", price: 2500000, max_per_user: 4, gate_number: 5, position: 11, status: "sold_out", total_quantity: 3500 },
            { name: "Rực Lửa 2", price: 2500000, max_per_user: 4, gate_number: 5, position: 12, status: "sold_out", total_quantity: 3500 },

            { name: "Tái Sinh 1", price: 2500000, max_per_user: 4, gate_number: 3, position: 13, status: "sold_out", total_quantity: 2500 },
            { name: "Tái Sinh 2", price: 2500000, max_per_user: 4, gate_number: 3, position: 14, status: "sold_out", total_quantity: 2500 },

            { name: "Đam Mê 1", price: 2500000, max_per_user: 4, gate_number: 3, position: 15, status: "sold_out", total_quantity: 2500 },
            { name: "Đam Mê 2", price: 2500000, max_per_user: 4, gate_number: 3, position: 16, status: "sold_out", total_quantity: 2500 },

            { name: "Bí Ẩn 1", price: 2000000, max_per_user: 4, gate_number: 6, position: 17, status: "sold_out", total_quantity: 4000 },
            { name: "Bí Ẩn 2", price: 2000000, max_per_user: 4, gate_number: 6, position: 18, status: "sold_out", total_quantity: 4000 },

            { name: "Ngũ Hành 1", price: 2000000, max_per_user: 4, gate_number: 7, position: 19, status: "sold_out", total_quantity: 3000 },
            { name: "Ngũ Hành 2", price: 2000000, max_per_user: 4, gate_number: 7, position: 20, status: "sold_out", total_quantity: 3000 },

            { name: "Nham Thạch 1", price: 1500000, max_per_user: 4, gate_number: 6, position: 21, status: "sold_out", total_quantity: 5000 },
            { name: "Nham Thạch 2", price: 1500000, max_per_user: 4, gate_number: 6, position: 22, status: "sold_out", total_quantity: 5000 },

            { name: "Nhà Hát 1", price: 1500000, max_per_user: 4, gate_number: 7, position: 23, status: "sold_out", total_quantity: 3500 },
            { name: "Nhà Hát 2", price: 1500000, max_per_user: 4, gate_number: 7, position: 24, status: "sold_out", total_quantity: 3500 },

            { name: "KK 1", price: 1500000, max_per_user: 4, gate_number: 8, position: 25, status: "sold_out", total_quantity: 3500 },
            { name: "KK 2", price: 1500000, max_per_user: 4, gate_number: 8, position: 26, status: "sold_out", total_quantity: 3500 },

            { name: "Sục Sôi 1", price: 1500000, max_per_user: 4, gate_number: 8, position: 27, status: "sold_out", total_quantity: 3500 },
            { name: "Sục Sôi 2", price: 1500000, max_per_user: 4, gate_number: 8, position: 28, status: "sold_out", total_quantity: 3500 },

            { name: "Thanh Xuân 1", price: 800000, max_per_user: 4, gate_number: 9, position: 29, status: "sold_out", total_quantity: 7000 },
            { name: "Thanh Xuân 2", price: 800000, max_per_user: 4, gate_number: 9, position: 30, status: "sold_out", total_quantity: 7000 },

            { name: "Huyền Thoại 1", price: 800000, max_per_user: 4, gate_number: 10, position: 31, status: "sold_out", total_quantity: 6000 },
            { name: "Huyền Thoại 2", price: 800000, max_per_user: 4, gate_number: 10, position: 32, status: "sold_out", total_quantity: 6000 },
        ],
    },
    {
        id: "f3d948b0-2ca9-4cd6-8fd0-0fcf10dcaa4f",
        name: "ANH TRAI \"SAY HI\" CONCERT - DAY 9",
        description:
            "Đêm nhạc bùng nổ tiếp theo của chuỗi concert Anh Trai Say Hi. Nơi hội tụ các gương mặt ca sĩ, rapper trẻ trung và tài năng hàng đầu V-Pop mang đến năng lượng bùng cháy cùng các phần trình diễn mãn nhãn mãn nhĩ.",
        location: "Khu Đô Thị Vạn Phúc City, Khu Đô Thị Vạn Phúc, Phường Hiệp Bình, Thành phố Hồ Chí Minh",
        ai_bio:
            "Dàn Anh Trai năng động, cá tính với tư duy âm nhạc hiện đại, vũ đạo cực chất và khả năng tương tác tuyệt vời với khán giả. Show diễn hứa hẹn sẽ mang đến những khoảnh khắc bùng nổ tuyệt đỉnh.",
        start_time: new Date("2026-04-18T12:00:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/c6c387ba-6cd8-4aa6-a5f9-9801b112a261.jpg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/f3d948b0-2ca9-4cd6-8fd0-0fcf10dcaa4f.jpeg",
        status: "COMPLETED",
        ticket_categories: [
            { name: "SKY LOUNGE", price: 10000000, max_per_user: 2, gate_number: 1, position: 1, status: "sold_out", total_quantity: 800 },
            { name: "SVIP A", price: 5000000, max_per_user: 2, gate_number: 1, position: 2, status: "sold_out", total_quantity: 1500 },
            { name: "SVIP B", price: 5000000, max_per_user: 2, gate_number: 1, position: 3, status: "sold_out", total_quantity: 1500 },
            { name: "VIP A", price: 4000000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 2500 },
            { name: "VIP B", price: 4000000, max_per_user: 4, gate_number: 2, position: 5, status: "sold_out", total_quantity: 2500 },
            { name: "FANZONE A", price: 2500000, max_per_user: 4, gate_number: 3, position: 6, status: "sale_closed", total_quantity: 4000 },
            { name: "FANZONE B", price: 2500000, max_per_user: 4, gate_number: 3, position: 7, status: "sale_closed", total_quantity: 4000 },
            { name: "CAT 1A", price: 2000000, max_per_user: 4, gate_number: 4, position: 8, status: "sold_out", total_quantity: 3500 },
            { name: "CAT 1B", price: 2000000, max_per_user: 4, gate_number: 5, position: 9, status: "sold_out", total_quantity: 3500 },
            { name: "CAT 2A", price: 1500000, max_per_user: 6, gate_number: 4, position: 10, status: "sold_out", total_quantity: 4000 },
            { name: "CAT 2B", price: 1500000, max_per_user: 6, gate_number: 5, position: 11, status: "sold_out", total_quantity: 4000 },
            { name: "CAT 3A", price: 1200000, max_per_user: 6, gate_number: 4, position: 12, status: "sold_out", total_quantity: 4500 },
            { name: "CAT 3B", price: 1200000, max_per_user: 6, gate_number: 5, position: 13, status: "sold_out", total_quantity: 4500 },
            { name: "GA 1A", price: 1500000, max_per_user: 6, gate_number: 6, position: 14, status: "sale_closed", total_quantity: 6000 },
            { name: "GA 1B", price: 1500000, max_per_user: 6, gate_number: 7, position: 15, status: "sale_closed", total_quantity: 6000 },
            { name: "GA 2A", price: 1000000, max_per_user: 6, gate_number: 6, position: 16, status: "sale_closed", total_quantity: 7000 },
            { name: "GA 2B", price: 1000000, max_per_user: 6, gate_number: 7, position: 17, status: "sale_closed", total_quantity: 7000 },
        ],
    },
    {
        id: "aa1064b6-095e-4cc3-a3ad-0aa46a364f28",
        name: "[CONCERT] CHỊ ĐẸP 12.04.2025",
        description:
            "Show diễn tôn vinh sức mạnh, vẻ đẹp và tài năng của các Chị Đẹp sau hành trình vượt sóng gió. Đêm nhạc mang tới những bản phối ballad sâu lắng và các tiết mục vũ đạo kết hợp đầy quyến rũ trên sân khấu The Global City.",
        location: "The Global City, Đỗ Xuân Hợp, Tp Thủ Đức, Phường An Phú, Quận 2, Thành Phố Hồ Chí Minh",
        ai_bio:
            "Sự kết hợp của các giọng ca nữ hàng đầu V-Pop mang đậm tính nghệ thuật, tôn vinh nữ quyền và lan tỏa nguồn năng lượng tích cực thông qua âm nhạc đỉnh cao.",
        start_time: new Date("2025-04-12T19:00:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/fa3719d9-a043-442d-bb74-af2af73e0f4c.png",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/aa1064b6-095e-4cc3-a3ad-0aa46a364f28.jpg",
        status: "COMPLETED",
        ticket_categories: [
            { name: "X-VIP 1", price: 8000000, max_per_user: 10, gate_number: 1, position: 1, status: "sold_out", total_quantity: 300 },
            { name: "X-VIP 2", price: 8000000, max_per_user: 10, gate_number: 1, position: 2, status: "sold_out", total_quantity: 300 },

            { name: "Chị Đẹp 1", price: 3500000, max_per_user: 10, gate_number: 2, position: 3, status: "sold_out", total_quantity: 1600 },
            { name: "Chị Đẹp 2", price: 3500000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 1600 },

            { name: "Đạp Gió 1", price: 2500000, max_per_user: 10, gate_number: 2, position: 5, status: "sold_out", total_quantity: 2200 },
            { name: "Đạp Gió 2", price: 2500000, max_per_user: 10, gate_number: 2, position: 6, status: "sold_out", total_quantity: 2200 },

            { name: "Gió Em 1", price: 2000000, max_per_user: 10, gate_number: 3, position: 7, status: "sold_out", total_quantity: 3500 },
            { name: "Gió Em 2", price: 2000000, max_per_user: 10, gate_number: 3, position: 8, status: "sold_out", total_quantity: 3500 },

            { name: "Rẽ Sóng 1", price: 2000000, max_per_user: 10, gate_number: 4, position: 9, status: "sold_out", total_quantity: 2500 },
            { name: "Rẽ Sóng 2", price: 2000000, max_per_user: 10, gate_number: 4, position: 10, status: "sold_out", total_quantity: 2500 },

            { name: "Nội Trú 1", price: 2000000, max_per_user: 10, gate_number: 4, position: 11, status: "sold_out", total_quantity: 2500 },
            { name: "Nội Trú 2", price: 2000000, max_per_user: 10, gate_number: 4, position: 12, status: "sold_out", total_quantity: 2500 },

            { name: "Hoa Sóng 1", price: 1800000, max_per_user: 10, gate_number: 3, position: 13, status: "sold_out", total_quantity: 4000 },
            { name: "Hoa Sóng 2", price: 1800000, max_per_user: 10, gate_number: 3, position: 14, status: "sold_out", total_quantity: 4000 },

            { name: "Bình Minh Đầy Nắng 1", price: 1500000, max_per_user: 10, gate_number: 5, position: 15, status: "sold_out", total_quantity: 3200 },
            { name: "Bình Minh Đầy Nắng 2", price: 1500000, max_per_user: 10, gate_number: 5, position: 16, status: "sold_out", total_quantity: 3200 },

            { name: "Hoa Trong Mắt Bão 1", price: 1500000, max_per_user: 10, gate_number: 5, position: 17, status: "sold_out", total_quantity: 3200 },
            { name: "Hoa Trong Mắt Bão 2", price: 1500000, max_per_user: 10, gate_number: 5, position: 18, status: "sold_out", total_quantity: 3200 },

            { name: "Thiên Hà 1", price: 1200000, max_per_user: 10, gate_number: 6, position: 19, status: "sold_out", total_quantity: 5000 },
            { name: "Thiên Hà 2", price: 1200000, max_per_user: 10, gate_number: 6, position: 20, status: "sold_out", total_quantity: 5000 },

            { name: "Ngôi Sao 1", price: 800000, max_per_user: 10, gate_number: 7, position: 21, status: "sold_out", total_quantity: 6500 },
            { name: "Ngôi Sao 2", price: 800000, max_per_user: 10, gate_number: 7, position: 22, status: "sold_out", total_quantity: 6500 },

            { name: "Chuyển Mình Rực Rỡ 1", price: 800000, max_per_user: 10, gate_number: 8, position: 23, status: "sold_out", total_quantity: 5000 },
            { name: "Chuyển Mình Rực Rỡ 2", price: 800000, max_per_user: 10, gate_number: 8, position: 24, status: "sold_out", total_quantity: 5000 },

            { name: "Màn Đêm Rực Sáng 1", price: 800000, max_per_user: 10, gate_number: 8, position: 25, status: "sold_out", total_quantity: 5000 },
            { name: "Màn Đêm Rực Sáng 2", price: 800000, max_per_user: 10, gate_number: 8, position: 26, status: "sold_out", total_quantity: 5000 },
        ],
    },
    {
        id: "2b7e14d8-2a17-4ac4-bc9c-02fa998bf293",
        name: "'GIỮA MỘT VẠN TOUR' - PHÙNG KHÁNH LINH | CHAPTER 3: LIVE EXPERIENCE IN HÀ NỘI",
        description:
            "Live concert đánh dấu sự trở lại đầy ngoạn mục của nữ ca sĩ Phùng Khánh Linh tại Hà Nội. Với concept độc đáo, đêm nhạc hứa hẹn mang đến trải nghiệm nghệ thuật kết hợp giữa âm nhạc chất lượng cao và câu chuyện hình ảnh đầy ẩn dụ.",
        location: "TRUNG TÂM HỘI NGHỊ QUỐC GIA, Số 57 Đường Phạm Hùng, Phường Từ Liêm, Thành phố Hà Nội",
        ai_bio:
            "Phùng Khánh Linh là nghệ sĩ indie-pop/city-pop tài năng của Việt Nam với giọng ca trong trẻo đầy nội lực và phong cách sáng tác đầy chiều sâu. Live experience lần này sẽ là hành trình khám phá thế giới nội tâm đầy sắc màu của cô.",
        start_time: new Date("2026-08-08T19:00:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/efa1fefb-8aff-4885-9155-901e2e59f6c9.jpg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/2b7e14d8-2a17-4ac4-bc9c-02fa998bf293.png",
        status: "PUBLISHED",
        ticket_categories: [
            { name: "BLACK SWAN", price: 10000000, max_per_user: 2, gate_number: 1, position: 1, status: "sold_out", total_quantity: 120 },
            { name: "SWAN", price: 3000000, max_per_user: 4, gate_number: 1, position: 2, status: "sold_out", total_quantity: 900 },
            { name: "SWORD", price: 2200000, max_per_user: 4, gate_number: 2, position: 3, status: "sold_out", total_quantity: 1500 },
            { name: "BALLERINA", price: 1600000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 2200 },
            { name: "FEATHER", price: 1100000, max_per_user: 4, gate_number: 3, position: 5, status: "sold_out", total_quantity: 3000 },
            { name: "MOONLIGHT", price: 860000, max_per_user: 4, gate_number: 3, position: 6, status: "sold_out", total_quantity: 3800 },
        ],
    },
    {
        id: "1054bc1a-1b0e-4810-b2df-76fa27e5745e",
        name: "'GIỮA MỘT VẠN TOUR' - PHÙNG KHÁNH LINH | CHAPTER 4: LIVE EXPERIENCE IN HÀ NỘI",
        description:
            "Tiếp nối thành công của chương trước, Chapter 4 của Giữa Một Vạn Tour mang lại những màn trình diễn hoàn toàn mới mẻ, mở rộng câu chuyện âm nhạc của Phùng Khánh Linh và tạo dựng không gian kết nối sâu sắc hơn với khán giả thủ đô.",
        location: "TRUNG TÂM HỘI NGHỊ QUỐC GIA, Số 57 Đường Phạm Hùng, Phường Từ Liêm, Thành phố Hà Nội",
        ai_bio:
            "Đêm nhạc thứ hai trong chuỗi live concert của Phùng Khánh Linh tại Hà Nội, được thiết kế với kịch bản âm nhạc và hòa âm phối khí thay đổi nhằm đem lại bất ngờ trọn vẹn nhất cho khán giả tham dự cả hai đêm.",
        start_time: new Date("2026-08-09T19:00:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/efa1fefb-8aff-4885-9155-901e2e59f6c9.jpg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/1054bc1a-1b0e-4810-b2df-76fa27e5745e.jpeg",
        status: "PUBLISHED",
        ticket_categories: [
            { name: "BLACK SWAN", price: 10000000, max_per_user: 2, gate_number: 1, position: 1, status: "sold_out", total_quantity: 120 },
            { name: "SWAN", price: 3000000, max_per_user: 4, gate_number: 1, position: 2, status: "sold_out", total_quantity: 900 },
            { name: "SWORD", price: 2200000, max_per_user: 4, gate_number: 2, position: 3, status: "sold_out", total_quantity: 1500 },
            { name: "BALLERINA", price: 1600000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 2200 },
            { name: "FEATHER", price: 1100000, max_per_user: 4, gate_number: 3, position: 5, status: "sold_out", total_quantity: 3000 },
            { name: "MOONLIGHT", price: 860000, max_per_user: 4, gate_number: 3, position: 6, status: "sold_out", total_quantity: 3800 },
        ],
    },
    {
        id: "3ac46e1d-8f5b-47a9-b9d1-cfbe7d8c92ed",
        name: "HÀ NHI - NGƯỜI YÊU CŨ LÀ TRI KỶ",
        description:
            "Đêm nhạc acoustic lãng mạn cùng 'Miêu Quý Tộc' Hà Nhi tại không gian sân vườn ấm cúng của The Garden Bistro. Một bữa tiệc âm nhạc đầy cảm xúc đưa khán giả đi qua mọi cung bậc của tình yêu và sự thấu hiểu.",
        location: "The Garden Bistro - Ecopark Hưng Yên, Công Viên Biệt Thự Đảo, Xã Phụng Công, Tỉnh Hưng Yên",
        ai_bio:
            "Hà Nhi là nữ ca sĩ sở hữu chất giọng khàn đặc trưng, ấm áp và đầy cảm xúc, nổi tiếng với các bản tình ca buồn ngọt ngào. Đêm nhạc sẽ là nơi cô chia sẻ những câu chuyện tình yêu mộc mạc và chân thành cùng người hâm mộ.",
        start_time: new Date("2026-08-23T18:30:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/bfb2bc9a-5c55-4af1-9ef6-eba3f9499140.jpg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/3ac46e1d-8f5b-47a9-b9d1-cfbe7d8c92ed.jpg",
        status: "PUBLISHED",
        ticket_categories: [
            { name: "Hạng Sky", price: 3100000, max_per_user: 10, gate_number: 1, position: 1, status: "book_now", total_quantity: 120 },
            { name: "Hạng Melody", price: 2750000, max_per_user: 10, gate_number: 1, position: 2, status: "book_now", total_quantity: 160 },
            { name: "Hạng Soul", price: 2000000, max_per_user: 10, gate_number: 2, position: 3, status: "book_now", total_quantity: 220 },
            { name: "Hạng Shine", price: 1800000, max_per_user: 10, gate_number: 2, position: 4, status: "book_now", total_quantity: 280 },
            { name: "Hạng Sun", price: 1450000, max_per_user: 10, gate_number: 3, position: 5, status: "book_now", total_quantity: 350 },
            { name: "Hạng Cloud", price: 1150000, max_per_user: 10, gate_number: 3, position: 6, status: "book_now", total_quantity: 450 },
        ],
    },
    {
        id: "6865c479-b18d-4e0a-b1e8-e9a7160d3308", 
        name: "MẮT NHẮM MẮT MỞ CONCERT",
        description:
            "Live concert hoành tráng Mắt Nhắm Mắt Mở quy tụ những cá tính âm nhạc độc đáo hàng đầu hiện nay. Đêm nhạc là sự giao thoa giữa không gian nghệ thuật đương đại và những giai điệu Indie/Pop giàu cảm xúc.",
        location: "Nhà Thi Đấu Phú Thọ, Số 1, Đường Lữ Gia, Phường Phú Thọ, Thành phố Hồ Chí Minh",
        ai_bio:
            "Sự kết hợp đầy ngẫu hứng và mới mẻ của thế hệ nghệ sĩ trẻ, mang đến trải nghiệm thưởng thức âm nhạc đa giác quan độc đáo và những ca khúc tự sự sâu lắng.",
        start_time: new Date("2026-08-01T19:00:00+07:00"),
        svg_map_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/bf4cfc05-8dd8-46f0-ac2b-38e9bcbb0303.jpeg",
        poster_url: "https://ovhsrgugrzbbqtlvplef.supabase.co/storage/v1/object/public/concert-assets/posters/6865c479-b18d-4e0a-b1e8-e9a7160d3308.jpeg",
        status: "PUBLISHED",
        ticket_categories: [
            { name: "BAN CÔNG 1", price: 3500000, max_per_user: 4, gate_number: 1, position: 1, status: "sold_out", total_quantity: 700 },
            { name: "BAN CÔNG 2", price: 3500000, max_per_user: 4, gate_number: 1, position: 2, status: "sold_out", total_quantity: 700 },
            { name: "BAN CÔNG 3", price: 3500000, max_per_user: 4, gate_number: 1, position: 3, status: "sold_out", total_quantity: 700 },

            { name: "TÂM TRÍ A", price: 3000000, max_per_user: 4, gate_number: 2, position: 4, status: "sold_out", total_quantity: 1800 },
            { name: "TÂM TRÍ B", price: 3000000, max_per_user: 4, gate_number: 2, position: 5, status: "sold_out", total_quantity: 1800 },

            { name: "HÀNH LANG A", price: 2500000, max_per_user: 4, gate_number: 3, position: 6, status: "sold_out", total_quantity: 2200 },
            { name: "HÀNH LANG B", price: 2500000, max_per_user: 4, gate_number: 3, position: 7, status: "sold_out", total_quantity: 2200 },

            { name: "SÂN TRƯỚC A", price: 1800000, max_per_user: 4, gate_number: 4, position: 8, status: "sold_out", total_quantity: 3000 },
            { name: "SÂN TRƯỚC B", price: 1800000, max_per_user: 4, gate_number: 4, position: 9, status: "sold_out", total_quantity: 3000 },

            { name: "MÁI NHÀ A", price: 1600000, max_per_user: 4, gate_number: 5, position: 10, status: "sold_out", total_quantity: 3500 },
            { name: "MÁI NHÀ B", price: 1600000, max_per_user: 4, gate_number: 5, position: 11, status: "sold_out", total_quantity: 3500 },

            { name: "NHÀ KHO A", price: 500000, max_per_user: 4, gate_number: 6, position: 12, status: "sold_out", total_quantity: 5000 },
            { name: "NHÀ KHO B", price: 500000, max_per_user: 4, gate_number: 6, position: 13, status: "sold_out", total_quantity: 5000 },
        ],
    },
];
