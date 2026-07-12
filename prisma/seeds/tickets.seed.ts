import { PrismaClient } from "@prisma/client";
import { getOrderPlan } from "./orders.seed";
import { chunkArray } from "./seed-utils";

const CHUNK_SIZE = 5000;

export async function seedTickets(prisma: PrismaClient) {
  const { tickets } = await getOrderPlan(prisma);
  if (tickets.length === 0) {
    return;
  }

  const categories = await prisma.ticketCategory.findMany({
    select: { id: true, concert_id: true, name: true, gate_number: true },
  });
  const categoryMap = new Map(
    categories.map((category) => [
      `${category.concert_id}:${category.name}`,
      category,
    ]),
  );
  const assignments = await prisma.checkerAssignment.findMany({
    select: { concert_id: true, gate_number: true, checker_id: true },
  });
  const checkerByGate = new Map(
    assignments.map((assignment) => [
      `${assignment.concert_id}:${assignment.gate_number}`,
      assignment.checker_id,
    ]),
  );

  const rows = tickets.map((ticket) => {
    const category = categoryMap.get(
      `${ticket.concert_id}:${ticket.category_name}`,
    );
    if (!category) {
      throw new Error(
        `Missing category ${ticket.category_name} for concert ${ticket.concert_id}`,
      );
    }
    const checkerId =
      category.gate_number === null
        ? null
        : (checkerByGate.get(`${ticket.concert_id}:${category.gate_number}`) ??
          null);

    return {
      id: ticket.id,
      order_id: ticket.order_id,
      category_id: category.id,
      qr_code_hash: ticket.qr_code_hash,
      is_scanned: ticket.is_scanned,
      scanned_at: ticket.is_scanned ? ticket.scanned_at : null,
      scanned_by: ticket.is_scanned ? checkerId : null,
    };
  });

  for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
    await prisma.ticket.createMany({ data: chunk });
  }
}
