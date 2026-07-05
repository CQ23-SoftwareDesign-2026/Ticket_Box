import { PrismaClient } from "@prisma/client";
import { concerts } from "./seed-data";

export async function seedCatalog(prisma: PrismaClient) {
    const concertData = concerts.map(({ ticket_categories: _, ...rest }: any) => rest);
    await prisma.concert.createMany({
        data: concertData,
        skipDuplicates: true,
    });
}
