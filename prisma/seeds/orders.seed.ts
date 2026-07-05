import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import crypto from "crypto";
import { concerts, FAKER_SEED } from "./seed-data";
import { chunkArray } from "./seed-utils";

const ORDER_COUNT = 15000;
const SAMPLE_USER_COUNT = 5000;
const MAX_TICKETS_PER_ORDER = 4;
const CHUNK_SIZE = 5000;

type OrderSeedRow = {
    id: string;
    user_id: string;
    concert_id: string;
    total_amount: string;
    status: string;
    created_at: Date;
    expires_at: Date;
    ticket_metadata: any;
};

type TicketSeedPlan = {
    id: string;
    order_id: string;
    concert_id: string;
    category_name: string;
    qr_code_hash: string;
    is_scanned: boolean;
    scanned_at: Date | null;
};

type OrderPlan = {
    orders: OrderSeedRow[];
    tickets: TicketSeedPlan[];
};

let cachedPlan: OrderPlan | null = null;

function pickOrderStatus() {
    const roll = faker.number.int({ min: 1, max: 100 });
    return roll <= 80 ? "PAID" : "CANCELLED";
}

async function buildOrderPlan(prisma: PrismaClient): Promise<OrderPlan> {
    faker.seed(FAKER_SEED);

    const audienceUsers = await prisma.user.findMany({
        where: {
            user_roles: {
                some: {
                    role: { name: "Audience" },
                },
            },
        },
        select: { id: true },
    });

    if (audienceUsers.length === 0) {
        throw new Error("No audience users found for order seeding.");
    }

    const userIds = audienceUsers.map((user) => user.id);
    const sampleSize = Math.min(SAMPLE_USER_COUNT, userIds.length);
    const sampledUserIds = faker.helpers.shuffle(userIds).slice(0, sampleSize);

    // Fetch actual TicketCategory records from database to get real UUIDs and prices
    const dbCategories = await prisma.ticketCategory.findMany({
        select: { id: true, concert_id: true, name: true, price: true, total_quantity: true },
    });

    const categoriesByConcert = new Map<string, Array<{ id: string; name: string; price: number; total_quantity: number }>>();
    const remainingCapacity = new Map<string, number>();

    for (const dbCat of dbCategories) {
        const concertId = dbCat.concert_id;
        if (!categoriesByConcert.has(concertId)) {
            categoriesByConcert.set(concertId, []);
        }
        categoriesByConcert.get(concertId)!.push({
            id: dbCat.id,
            name: dbCat.name,
            price: Number(dbCat.price),
            total_quantity: dbCat.total_quantity,
        });
        remainingCapacity.set(`${concertId}:${dbCat.name}`, dbCat.total_quantity);
    }

    const concertIds = concerts.map((concert) => concert.id);

    const orders: OrderSeedRow[] = [];
    const tickets: TicketSeedPlan[] = [];

    for (let index = 0; index < ORDER_COUNT; index += 1) {
        const orderId = faker.string.uuid();
        const userId = faker.helpers.arrayElement(sampledUserIds);
        const concertId = faker.helpers.arrayElement(concertIds);
        
        const concert = concerts.find((c) => c.id === concertId);
        if (!concert) {
            throw new Error(`Missing concert details for ID ${concertId}`);
        }

        const status = pickOrderStatus();

        // Generate dynamic creation date: between 60 days before the concert and 1 hour before the concert
        const fromDate = new Date(concert.start_time.getTime() - 60 * 24 * 60 * 60 * 1000);
        const toDate = new Date(concert.start_time.getTime() - 60 * 60 * 1000);

        const createdAt = faker.date.between({
            from: fromDate,
            to: toDate,
        });
        const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

        const concertCategories = categoriesByConcert.get(concertId) ?? [];
        if (concertCategories.length === 0) {
            throw new Error(`No ticket categories found in DB for concert ${concertId}`);
        }

        // Filter categories that have remaining capacity
        const availableCategories = concertCategories.filter(
            (cat) => (remainingCapacity.get(`${concertId}:${cat.name}`) ?? 0) > 0
        );

        if (availableCategories.length === 0) {
            continue; // Skip if no capacity left for any category of this concert
        }

        // Pick a single ticket category for the entire order
        const category = faker.helpers.arrayElement(availableCategories);
        const remCapacity = remainingCapacity.get(`${concertId}:${category.name}`) ?? 0;

        // Ensure ticketCount does not exceed remaining capacity
        const maxTickets = Math.min(MAX_TICKETS_PER_ORDER, remCapacity);
        if (maxTickets <= 0) {
            continue;
        }

        const ticketCount = faker.number.int({ min: 1, max: maxTickets });
        const totalAmount = category.price * ticketCount;

        // Deduct capacity only for PAID orders
        if (status === "PAID") {
            remainingCapacity.set(`${concertId}:${category.name}`, remCapacity - ticketCount);
        }

        for (let ticketIndex = 0; ticketIndex < ticketCount; ticketIndex += 1) {
            if (status === "PAID") {
                const isCompleted = concert.status === "COMPLETED";
                const isScanned = isCompleted;
                
                const scannedAt = isScanned
                    ? faker.date.between({
                        from: concert.start_time,
                        to: new Date(concert.start_time.getTime() + 3 * 60 * 60 * 1000), // 3 hours event duration
                    })
                    : null;

                // Generate real-looking SHA-256 hash for qr_code_hash
                const qrCodeHash = crypto.createHash("sha256")
                    .update(`ticket-${orderId}-${ticketIndex}-${faker.string.uuid()}`)
                    .digest("hex");

                tickets.push({
                    id: faker.string.uuid(),
                    order_id: orderId,
                    concert_id: concertId,
                    category_name: category.name,
                    qr_code_hash: qrCodeHash,
                    is_scanned: isScanned,
                    scanned_at: scannedAt,
                });
            }
        }

        const ticket_metadata = {
            quantity: ticketCount,
            unit_price: category.price,
            category_id: category.id,
            category_name: category.name,
            ticket_breakdown: [
                {
                    quantity: ticketCount,
                    unit_price: category.price,
                    category_id: category.id,
                    category_name: category.name,
                },
            ],
        };

        orders.push({
            id: orderId,
            user_id: userId,
            concert_id: concertId,
            total_amount: totalAmount.toString(),
            status,
            created_at: createdAt,
            expires_at: expiresAt,
            ticket_metadata,
        });
    }

    return { orders, tickets };
}

export async function getOrderPlan(prisma: PrismaClient): Promise<OrderPlan> {
    if (!cachedPlan) {
        cachedPlan = await buildOrderPlan(prisma);
    }

    return cachedPlan;
}

export async function seedOrders(prisma: PrismaClient) {
    const { orders } = await getOrderPlan(prisma);

    for (const chunk of chunkArray(orders, CHUNK_SIZE)) {
        await prisma.order.createMany({ data: chunk });
    }
}
