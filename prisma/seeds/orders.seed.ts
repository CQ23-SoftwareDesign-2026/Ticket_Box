import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import crypto from "crypto";
import { concerts, FAKER_SEED } from "./seed-data";
import { chunkArray } from "./seed-utils";

const SAMPLE_USER_COUNT = 5000;
const CHUNK_SIZE = 5000;
const BOOK_NOW_MIN_SOLD_PERCENT = 50;
const BOOK_NOW_MAX_SOLD_PERCENT = 90;
const CANCELLED_ORDER_PERCENT = 2;
const CONCERT_DURATION_HOURS = 3;
const ALLOWED_CATEGORY_STATUSES = new Set(["book_now", "sold_out"]);

type OrderSeedRow = {
  id: string;
  user_id: string;
  concert_id: string;
  total_amount: string;
  status: string;
  created_at: Date;
  expires_at: Date;
  ticket_metadata: Record<string, unknown>;
};

export type TicketSeedPlan = {
  id: string;
  order_id: string;
  concert_id: string;
  category_name: string;
  qr_code_hash: string;
  is_scanned: boolean;
  scanned_at: Date | null;
};

type OrderPlan = { orders: OrderSeedRow[]; tickets: TicketSeedPlan[] };
let cachedPlan: OrderPlan | null = null;

async function buildOrderPlan(prisma: PrismaClient): Promise<OrderPlan> {
  faker.seed(FAKER_SEED);
  const audienceUsers = await prisma.user.findMany({
    where: { user_roles: { some: { role: { name: "Audience" } } } },
    select: { id: true },
  });
  if (audienceUsers.length === 0)
    throw new Error("No audience users found for order seeding.");

  const sampledUserIds = faker.helpers
    .shuffle(audienceUsers.map((user) => user.id))
    .slice(0, Math.min(SAMPLE_USER_COUNT, audienceUsers.length));
  const concertMap = new Map(concerts.map((concert) => [concert.id, concert]));
  const categories = await prisma.ticketCategory.findMany({
    orderBy: [{ concert_id: "asc" }, { position: "asc" }],
    select: {
      id: true,
      concert_id: true,
      name: true,
      price: true,
      total_quantity: true,
      max_per_user: true,
      status: true,
      sales_start_at: true,
    },
  });

  const orders: OrderSeedRow[] = [];
  const tickets: TicketSeedPlan[] = [];
  let userCursor = 0;

  for (const category of categories) {
    const status = category.status ?? "book_now";
    if (!ALLOWED_CATEGORY_STATUSES.has(status)) {
      throw new Error(
        `Unsupported ticket category status '${status}' for ${category.name}. Use book_now or sold_out.`,
      );
    }
    const concert = concertMap.get(category.concert_id);
    if (!concert)
      throw new Error(`Missing concert seed data for ${category.concert_id}`);

    const now = new Date();
    if (category.sales_start_at && now < category.sales_start_at) {
      console.log(
        `[seed] skipped ${concert.name} / ${category.name}: sales start at ${category.sales_start_at.toISOString()}`,
      );
      continue;
    }

    const soldPercent =
      status === "sold_out"
        ? 100
        : faker.number.int({
            min: BOOK_NOW_MIN_SOLD_PERCENT,
            max: BOOK_NOW_MAX_SOLD_PERCENT,
          });
    const targetTicketCount =
      status === "sold_out"
        ? category.total_quantity
        : Math.floor((category.total_quantity * soldPercent) / 100);
    let remaining = targetTicketCount;
    const categoryOrderStartIndex = orders.length;
    const unitPrice = Number(category.price);

    while (remaining > 0) {
      const maxTickets = Math.max(
        1,
        Math.min(category.max_per_user, remaining),
      );
      const ticketCount =
        remaining <= maxTickets
          ? remaining
          : faker.number.int({ min: 1, max: maxTickets });
      const orderId = faker.string.uuid();
      const userId = sampledUserIds[userCursor % sampledUserIds.length];
      userCursor += 1;
      const defaultFromDate = new Date(
        concert.start_time.getTime() - 60 * 24 * 60 * 60 * 1000,
      );
      const fromDate =
        category.sales_start_at && category.sales_start_at > defaultFromDate
          ? category.sales_start_at
          : defaultFromDate;
      const toDate = new Date(
        Math.min(now.getTime(), concert.start_time.getTime() - 60 * 60 * 1000),
      );
      const createdAt = faker.date.between({ from: fromDate, to: toDate });
      const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
      const hasStarted = now >= concert.start_time;

      for (let index = 0; index < ticketCount; index += 1) {
        tickets.push({
          id: faker.string.uuid(),
          order_id: orderId,
          concert_id: category.concert_id,
          category_name: category.name,
          qr_code_hash: crypto
            .createHash("sha256")
            .update(`ticket-${orderId}-${index}-${faker.string.uuid()}`)
            .digest("hex"),
          is_scanned: hasStarted,
          scanned_at: hasStarted
            ? faker.date.between({
                from: concert.start_time,
                to: new Date(
                  Math.min(
                    now.getTime(),
                    concert.start_time.getTime() +
                      CONCERT_DURATION_HOURS * 60 * 60 * 1000,
                  ),
                ),
              })
            : null,
        });
      }

      orders.push({
        id: orderId,
        user_id: userId,
        concert_id: category.concert_id,
        total_amount: (unitPrice * ticketCount).toString(),
        status: "PAID",
        created_at: createdAt,
        expires_at: expiresAt,
        ticket_metadata: {
          quantity: ticketCount,
          unit_price: unitPrice,
          updated_at: createdAt.toISOString(),
          category_id: category.id,
          category_name: category.name,
          ticket_breakdown: [
            {
              quantity: ticketCount,
              category_id: category.id,
            },
          ],
        },
      });
      remaining -= ticketCount;
    }

    const paidOrderCount = orders.length - categoryOrderStartIndex;
    const cancelledOrderCount = Math.max(
      1,
      Math.round((paidOrderCount * CANCELLED_ORDER_PERCENT) / 100),
    );
    for (let index = 0; index < cancelledOrderCount; index += 1) {
      const createdAt = faker.date.between({
        from:
          category.sales_start_at ??
          new Date(concert.start_time.getTime() - 60 * 24 * 60 * 60 * 1000),
        to: new Date(
          Math.min(
            now.getTime(),
            concert.start_time.getTime() - 60 * 60 * 1000,
          ),
        ),
      });
      const quantity = faker.number.int({
        min: 1,
        max: Math.max(1, category.max_per_user),
      });
      orders.push({
        id: faker.string.uuid(),
        user_id: sampledUserIds[userCursor % sampledUserIds.length],
        concert_id: category.concert_id,
        total_amount: (unitPrice * quantity).toString(),
        status: "CANCELLED",
        created_at: createdAt,
        expires_at: new Date(createdAt.getTime() + 10 * 60 * 1000),
        ticket_metadata: {
          quantity,
          unit_price: unitPrice,
          updated_at: createdAt.toISOString(),
          category_id: category.id,
          category_name: category.name,
          ticket_breakdown: [{ quantity, category_id: category.id }],
        },
      });
      userCursor += 1;
    }

    console.log(
      `[seed] ${concert.name} / ${category.name}: ${targetTicketCount}/${category.total_quantity} tickets (${soldPercent}%, ${status})`,
    );
  }

  console.log(
    `[seed] generated ${orders.length} paid orders and ${tickets.length} tickets`,
  );
  return { orders, tickets };
}

export async function getOrderPlan(prisma: PrismaClient): Promise<OrderPlan> {
  if (!cachedPlan) cachedPlan = await buildOrderPlan(prisma);
  return cachedPlan;
}

export async function seedOrders(prisma: PrismaClient) {
  const { orders } = await getOrderPlan(prisma);
  for (const chunk of chunkArray(orders, CHUNK_SIZE)) {
    await prisma.order.createMany({ data: chunk });
  }
}
