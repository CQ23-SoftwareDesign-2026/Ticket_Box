import { NotificationType, PrismaClient } from "@prisma/client";
import { chunkArray } from "./seed-utils";

const CHUNK_SIZE = 5000;
const READ_PERCENT = 90;

export async function seedNotifications(prisma: PrismaClient) {
  const orders = await prisma.order.findMany({
    include: { concert: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  const readCount = Math.floor((orders.length * READ_PERCENT) / 100);

  const rows = orders.map((order, index) => ({
    user_id: order.user_id,
    order_id: order.id,
    type: NotificationType.TICKET_PURCHASED,
    concert_id: order.concert_id,
    deduplication_key: `ticket-purchased:${order.id}`,
    title: "Mua vé thành công",
    message:
        `Vé concert ${order.concert.name} của bạn đã sẵn sàng.`,
    data: {
      orderId: order.id,
      orderStatus: order.status,
      route: `/orders/${order.id}`,
    },
    created_at: order.created_at,
    read_at:
      index < readCount
        ? new Date(order.created_at.getTime() + 5 * 60 * 1000)
        : null,
  }));

  for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
    await prisma.notification.createMany({ data: chunk });
  }

  console.log(
    `[seed] generated ${rows.length} notifications (${readCount} read, ${rows.length - readCount} unread)`,
  );
}
