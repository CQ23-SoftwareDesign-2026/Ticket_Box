import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { FAKER_SEED } from "./seed-data";
import { chunkArray } from "./seed-utils";

const CHUNK_SIZE = 5000;
const PAYMENT_METHODS = ["PAYOS"] as const;

function generateOrderCode(uuid: string): number {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash); // Ensure positive
}

export async function seedPaymentTransactions(prisma: PrismaClient) {
    faker.seed(FAKER_SEED + 1);

    const paidOrders = await prisma.order.findMany({
        where: { status: "PAID" },
        select: { id: true, total_amount: true, expires_at: true },
    });

    const rows = paidOrders.map((order) => {
        const method = faker.helpers.arrayElement(PAYMENT_METHODS);
        const ref = faker.string.uuid();
        const orderCode = generateOrderCode(order.id);
        const expiredAt = Math.floor(new Date(order.expires_at).getTime() / 1000);
        const paymentLinkId = faker.string.alphanumeric(32);

        return {
            id: faker.string.uuid(),
            order_id: order.id,
            payment_method: method,
            transaction_id_3rd_party: ref,
            amount: order.total_amount,
            status: "SUCCESS",
            idempotency_key: faker.string.uuid(),
            raw_response: {
                process: {
                    bin: "970422",
                    amount: Number(order.total_amount),
                    qrCode: `00020101021238540010A00000072701240006970422011003335353750208QRIBFTTA5303704540770000005802VN62360832CSAEA6O8U64 TICKET BOX ${orderCode}6304C617`,
                    status: "PAID",
                    currency: "VND",
                    expiredAt,
                    orderCode,
                    accountName: "TRAN QUOC VY",
                    checkoutUrl: `https://pay.payos.vn/web/${paymentLinkId}`,
                    description: `CSAEA6O8U64 TICKET BOX ${orderCode}`,
                    accountNumber: "0333535375",
                    paymentLinkId,
                },
                order_snapshot: {
                    status: "PAID",
                    order_id: order.id,
                    current_ticket_count: 0,
                },
            },
        };
    });

    for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
        await prisma.paymentTransaction.createMany({ data: chunk });
    }
}
