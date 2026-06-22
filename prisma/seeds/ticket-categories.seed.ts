import { PrismaClient } from "@prisma/client";
import {
    concerts,
    ticketCategoryAllocations,
    ticketCategoryPricing,
} from "./seed-data";
import { chunkArray } from "./seed-utils";

const CHUNK_SIZE = 5000;

export async function seedTicketCategories(prisma: PrismaClient) {
    const allocationByConcert = new Map(
        ticketCategoryAllocations.map((allocation) => [
            allocation.concert_id,
            allocation.quantities,
        ]),
    );

    const rows = concerts.flatMap((concert) => {
        const quantities = allocationByConcert.get(concert.id);
        if (!quantities) {
            throw new Error(`Missing ticket allocation for concert ${concert.id}`);
        }

        return ticketCategoryPricing.map((category) => {
            const totalQuantity = quantities[category.name];
            if (totalQuantity === undefined) {
                throw new Error(
                    `Missing quantity for ${category.name} on concert ${concert.id}`,
                );
            }

            return {
                concert_id: concert.id,
                name: category.name,
                price: category.price.toString(),
                total_quantity: totalQuantity,
                max_per_user: category.max_per_user,
                gate_number: category.gate_number,
            };
        });
    });

    for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
        await prisma.ticketCategory.createMany({
            data: chunk,
            skipDuplicates: true,
        });
    }
}
