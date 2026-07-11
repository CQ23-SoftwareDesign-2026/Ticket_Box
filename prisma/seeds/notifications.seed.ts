import { NotificationType, PrismaClient } from "@prisma/client";

export async function seedNotifications(prisma: PrismaClient) {
    const paidOrders = await prisma.order.findMany({
        where: { status: "PAID" },
        include: { concert: { select: { name: true } } },
        take: 20,
    });

    for (const order of paidOrders) {
        await prisma.notification.upsert({
            where: { deduplication_key: `ticket-purchased:${order.id}` },
            create: {
                user_id: order.user_id,
                order_id: order.id,
                type: NotificationType.TICKET_PURCHASED,
                concert_id: order.concert_id,
                deduplication_key: `ticket-purchased:${order.id}`,
                title: "Mua vé thành công",
                message: `Vé concert ${order.concert.name} của bạn đã sẵn sàng.`,
                data: { orderId: order.id, route: `/orders/${order.id}` },
            },
            update: {},
        });
    }
}
