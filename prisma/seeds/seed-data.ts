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
        id: "0edb0b61-8c91-4d2c-9b7c-9b6e2e3e7cf1",
        name: "Anh Trai Say Hi",
        description:
            "A high-energy showcase with headline performances and a packed fan meetup. The stage design blends neon city visuals with live band moments to test long text wrapping in the UI. Cover: https://cdn.ticketbox.local/covers/anh-trai-say-hi.jpg",
        location: "District 1 Stadium, Ho Chi Minh City",
        ai_bio:
            "A crowd-favorite lineup delivering upbeat pop anthems, sharp choreography, and extended encore segments. The bio is intentionally long to stress test truncation and preview cards in the catalog UI.",
        start_time: new Date("2026-06-10T19:30:00+07:00"),
        svg_map_url: "https://cdn.ticketbox.local/maps/anh-trai-say-hi.svg",
        status: "PUBLISHED",
    },
    {
        id: "41e6a7a3-2fdf-4f7b-8e5a-2b38c2af6b70",
        name: "Anh Trai Vuot Ngan Chong Gai",
        description:
            "A stadium-scale collaboration concert with multiple guest artists. Use this entry to test the COMING_SOON label and pre-sale UI messaging. Cover: https://cdn.ticketbox.local/covers/anh-trai-vuot-ngan-chong-gai.jpg",
        location: "Hoa Xuan Stadium, Da Nang",
        ai_bio:
            "A high-stamina stage set that blends rock accents with modern pop, designed to simulate long-form artist bios and detailed event descriptions in admin tools.",
        start_time: new Date("2026-07-10T20:00:00+07:00"),
        svg_map_url: "https://cdn.ticketbox.local/maps/anh-trai-vuot-ngan-chong-gai.svg",
        status: "COMING_SOON",
    },
    {
        id: "b51f1c19-27a2-49af-8f25-9c1f6fa82d3b",
        name: "Em Xinh Say Hi",
        description:
            "A vibrant showcase spotlighting fresh voices and dance crews. This record is intentionally placed in the past to validate the COMPLETED state and archived UI views. Cover: https://cdn.ticketbox.local/covers/em-xinh-say-hi.jpg",
        location: "My Dinh Arena, Hanoi",
        ai_bio:
            "A feel-good concert with bright visuals, layered choreography, and audience sing-alongs that help exercise long text handling in client screens.",
        start_time: new Date("2026-04-12T19:00:00+07:00"),
        svg_map_url: "https://cdn.ticketbox.local/maps/em-xinh-say-hi.svg",
        status: "COMPLETED",
    },
    {
        id: "a1ff5dd8-4f83-4c64-a4c4-17b8bf90dc3d",
        name: "Chi Dep Dap Gio Re Song",
        description:
            "An intimate evening performance with cinematic staging and live band arrangements. Ticket quantities are intentionally lower to test low-stock UI. Cover: https://cdn.ticketbox.local/covers/chi-dep-dap-gio-re-song.jpg",
        location: "Da Lat Valley Theater, Lam Dong",
        ai_bio:
            "A theatrical performance blending ballads with orchestration, designed to test long bios and layout clipping in the catalog detail page.",
        start_time: new Date("2026-06-28T19:30:00+07:00"),
        svg_map_url: "https://cdn.ticketbox.local/maps/chi-dep-dap-gio-re-song.svg",
        status: "PUBLISHED",
    },
];

export const ticketCategoryPricing = [
    { name: "SVIP", price: 5000000, max_per_user: 2, gate_number: 1 },
    { name: "VIP 1", price: 3000000, max_per_user: 4, gate_number: 1 },
    { name: "VIP 2", price: 2000000, max_per_user: 4, gate_number: 1 },
    { name: "GA", price: 500000, max_per_user: 6, gate_number: 2 },
];

export const ticketCategoryAllocations: { concert_id: string; quantities: Record<string, number> }[] = [
    {
        concert_id: concerts[0].id,
        quantities: {
            "SVIP": 2000,
            "VIP 1": 7000,
            "VIP 2": 7000,
            "GA": 14000,
        },
    },
    {
        concert_id: concerts[1].id,
        quantities: {
            "SVIP": 2000,
            "VIP 1": 7000,
            "VIP 2": 7000,
            "GA": 14000,
        },
    },
    {
        concert_id: concerts[2].id,
        quantities: {
            "SVIP": 1500,
            "VIP 1": 6000,
            "VIP 2": 6000,
            "GA": 11500,
        },
    },
    {
        concert_id: concerts[3].id,
        quantities: {
            "SVIP": 1000,
            "VIP 1": 3500,
            "VIP 2": 3500,
            "GA": 7000,
        },
    },
];
