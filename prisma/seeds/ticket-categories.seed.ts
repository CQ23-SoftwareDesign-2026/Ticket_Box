import { PrismaClient } from "@prisma/client";
import { concerts } from "./seed-data";
import { chunkArray } from "./seed-utils";

const CHUNK_SIZE = 5000;

export async function seedTicketCategories(prisma: PrismaClient) {
    const rows = concerts.flatMap((concert) => {
        const categories = (concert as any).ticket_categories ?? [];
        return categories.map((category: any) => ({
            concert_id: concert.id,
            name: category.name,
            price: category.price.toString(),
            total_quantity: category.total_quantity,
            max_per_user: category.max_per_user,
            gate_number: category.gate_number,
            position: category.position,
            status: category.status,
            sales_start_at: category.sales_start_at,
        }));
    });

    for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
        await prisma.ticketCategory.createMany({
            data: chunk,
            skipDuplicates: true,
        });
    }
}
