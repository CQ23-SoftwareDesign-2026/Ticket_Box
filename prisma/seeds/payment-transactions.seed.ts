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
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash); // Ensure positive
}

export async function seedPaymentTransactions(prisma: PrismaClient) {
  faker.seed(FAKER_SEED + 1);

  const paidOrders = await prisma.order.findMany({
    where: { status: "PAID" },
    select: {
      id: true,
      total_amount: true,
      expires_at: true,
      created_at: true,
    },
  });

  const rows = paidOrders.map((order) => {
    const method = faker.helpers.arrayElement(PAYMENT_METHODS);
    const reference = `FT${faker.string.numeric(14)}`;
    const orderCode = generateOrderCode(order.id);
    const expiredAt = Math.floor(new Date(order.expires_at).getTime() / 1000);
    const paymentLinkId = faker.string
      .hexadecimal({ length: 32, prefix: "" })
      .toLowerCase();
    const descriptionPrefix = faker.string.alphanumeric(11).toUpperCase();
    const description = `${descriptionPrefix} TICKET BOX ${orderCode}`;
    const webhookReceivedAt = faker.date.between({
      from: order.created_at,
      to: order.expires_at,
    });
    const transactionDateTime = webhookReceivedAt
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    return {
      id: faker.string.uuid(),
      order_id: order.id,
      payment_method: method,
      transaction_id_3rd_party: reference,
      amount: order.total_amount,
      status: "SUCCESS",
      idempotency_key: faker.string.uuid(),
      raw_response: {
        process: {
          bin: "970422",
          amount: Number(order.total_amount),
          qrCode: `00020101021238540010A00000072701240006970422011003335353750208QRIBFTTA53037045404${Number(order.total_amount)}5802VN62360832${description}6304${faker.string.alphanumeric(4).toUpperCase()}`,
          status: "PENDING",
          currency: "VND",
          expiredAt,
          orderCode,
          accountName: "TRAN QUOC VY",
          checkoutUrl: `https://pay.payos.vn/web/${paymentLinkId}`,
          description,
          accountNumber: "0333535375",
          paymentLinkId,
        },
        webhook: {
          code: "00",
          data: {
            code: "00",
            desc: "success",
            amount: Number(order.total_amount),
            currency: "VND",
            orderCode,
            reference,
            description,
            accountNumber: "0333535375",
            paymentLinkId,
            counterAccountName: null,
            virtualAccountName: "",
            transactionDateTime,
            counterAccountBankId: "970422",
            counterAccountNumber: faker.string.numeric(13),
            virtualAccountNumber: "",
            counterAccountBankName: "",
          },
          desc: "success",
          success: true,
          signature: faker.string
            .hexadecimal({ length: 64, prefix: "" })
            .toLowerCase(),
          received_at: webhookReceivedAt.toISOString(),
          signature_verified: true,
        },
        order_snapshot: {
          status: "PENDING",
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
