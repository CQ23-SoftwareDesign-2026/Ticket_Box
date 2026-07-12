import { Prisma, PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { concerts, FAKER_SEED } from "./seed-data";
import { chunkArray } from "./seed-utils";

const JOB_COUNT = 30;
const CHUNK_SIZE = 5000;
const JOB_TYPES = ["GUEST_LIST_IMPORT", "GENERATE_BIO"];

export async function seedBackgroundJobs(prisma: PrismaClient) {
    faker.seed(FAKER_SEED + 2);

    const organizer = await prisma.user.findFirst({
        where: {
            user_roles: {
                some: {
                    role: { name: "Organizer" },
                },
            },
        },
        select: { id: true },
    });

    if (!organizer) {
        throw new Error("Organizer user not found for background jobs.");
    }

    const concertIds = concerts.map((concert) => concert.id);
    const rows = Array.from({ length: JOB_COUNT }, () => {
        const statusRoll = faker.number.int({ min: 1, max: 100 });
        const status = statusRoll != 100 ? "COMPLETED" : "FAILED";
        const createdAt = faker.date.between({
            from: new Date("2026-04-01T00:00:00+07:00"),
            to: new Date("2026-05-20T23:59:59+07:00"),
        });
        const completedAt = status === "COMPLETED" || status === "FAILED"
            ? new Date(createdAt.getTime() + faker.number.int({ min: 60, max: 1800 }) * 1000)
            : null;

        const jobType = faker.helpers.arrayElement(JOB_TYPES);
        const targetId = faker.helpers.arrayElement(concertIds);
        const resultData = status === "COMPLETED"
            ? {
                output_url: `https://cdn.ticketbox.local/exports/${faker.string.uuid()}.csv`,
            }
            : Prisma.DbNull;

        return {
            id: faker.string.uuid(),
            trigger_by_user_id: organizer.id,
            job_type: jobType,
            target_id: targetId,
            status,
            progress_percentage: status === "COMPLETED" ? 100 : status === "FAILED" ? 100 : 0,
            payload: {
                source: "seed",
                target_id: targetId,
            },
            result_data: resultData,
            error_message: status === "FAILED" ? "Export failed during processing." : null,
            created_at: createdAt,
            completed_at: completedAt,
        };
    });

    for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
        await prisma.backgroundJob.createMany({ data: chunk });
    }
}
