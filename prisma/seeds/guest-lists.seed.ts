import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { concerts, FAKER_SEED } from "./seed-data";
import { chunkArray } from "./seed-utils";

const GUESTS_PER_CONCERT = 10;
const CHUNK_SIZE = 5000;

export async function seedGuestLists(prisma: PrismaClient) {
    faker.seed(FAKER_SEED + 3);

    const rows = concerts.flatMap((concert, concertIndex) => {
        const categories = (concert as any).ticket_categories ?? [];
        return Array.from({ length: GUESTS_PER_CONCERT }, (_, index) => {
            const randomCategory = faker.helpers.arrayElement(categories);
            const categoryName = randomCategory ? (randomCategory as any).name : "GA";
            return {
                concert_id: concert.id,
                email: `guest${concertIndex + 1}-${index + 1}@ticketbox.local`,
                full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
                ticket_category: categoryName,
                is_scanned: faker.number.int({ min: 1, max: 100 }) <= 10,
            };
        });
    });

    for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
        await prisma.guestList.createMany({ data: chunk, skipDuplicates: true });
    }
}
