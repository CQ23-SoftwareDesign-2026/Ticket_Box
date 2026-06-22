import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppModule } from '../../../app.module';
import { CheckInService } from '../services/checkin.service';

const prisma = new PrismaClient();

async function runPerformanceCheck() {
    console.log('=== Performance Check: Database Concurrency & Lock boundaries ===');

    // Bootstrap NestJS application context to get the real CheckInService instance
    console.log('Bootstrapping NestJS application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const checkInService = app.get(CheckInService);

    // 1. Prepare test data (Concert, Category, Tickets)
    const concertId = randomUUID();
    const categoryId = randomUUID();
    const userId = randomUUID();

    console.log('Seeding temporary test concert & categories...');
    await prisma.concert.create({
        data: {
            id: concertId,
            name: 'Performance Check Concert',
            location: 'Gate Test Arena',
            start_time: new Date(),
            status: 'PUBLISHED',
        }
    });

    await prisma.ticketCategory.create({
        data: {
            id: categoryId,
            concert_id: concertId,
            name: 'VIP',
            price: 1000000,
            total_quantity: 1000,
            max_per_user: 10,
        }
    });

    const userEmail = `checker-${randomUUID()}@performance.test`;
    await prisma.user.create({
        data: {
            id: userId,
            email: userEmail,
            password_hash: 'hash',
            full_name: 'Checker Worker',
            status: 'ACTIVE',
        }
    });

    const ticketCount = 50;
    const ticketHashes: string[] = [];
    const ticketsData: any[] = [];

    // Create a temporary order
    const orderId = randomUUID();
    await prisma.order.create({
        data: {
            id: orderId,
            user_id: userId,
            concert_id: concertId,
            total_amount: 1000000,
            status: 'PAID',
            expires_at: new Date(Date.now() + 1000 * 60 * 60),
        }
    });

    for (let i = 0; i < ticketCount; i++) {
        const hash = `perf-hash-${randomUUID()}`;
        ticketHashes.push(hash);
        ticketsData.push({
            id: randomUUID(),
            order_id: orderId,
            category_id: categoryId,
            qr_code_hash: hash,
            is_scanned: false,
        });
    }

    console.log(`Creating ${ticketCount} test tickets in DB...`);
    await prisma.ticket.createMany({
        data: ticketsData,
    });

    // 2. Simulate concurrent bulk synchronizations using the real CheckInService
    console.log('Simulating 10 concurrent bulk sync operations with overlapping tickets...');

    async function simulateSync(batch: { qr_code_hash: string; scanned_at: string; scanned_by: string }[]) {
        return checkInService.syncTickets(batch);
    }

    const concurrentBatches: any[] = [];
    const clientCount = 10;

    for (let c = 0; c < clientCount; c++) {
        // Each batch takes a random/shuffled selection of the ticketHashes
        const batchSize = 15;
        const shuffled = [...ticketHashes].sort(() => 0.5 - Math.random());
        const selectedHashes = shuffled.slice(0, batchSize);

        const updates = selectedHashes.map(hash => ({
            qr_code_hash: hash,
            scanned_at: new Date(Date.now() - Math.floor(Math.random() * 10000)).toISOString(),
            scanned_by: userId,
        }));
        concurrentBatches.push(updates);
    }

    const startTime = Date.now();
    let deadlockErrors = 0;
    let successfulSyncs = 0;

    try {
        await Promise.all(
            concurrentBatches.map(async (batch, index) => {
                try {
                    const res = await simulateSync(batch);
                    if (res.success) {
                        successfulSyncs++;
                    } else {
                        console.error(`Batch ${index} returned failed response status`);
                    }
                } catch (error: any) {
                    console.error(`Batch ${index} failed:`, error.message);
                    if (error.code === 'P2034' || error.message.includes('deadlock') || error.message.includes('deadlock detected')) {
                        deadlockErrors++;
                    }
                }
            })
        );
    } catch (e: any) {
        console.error('Unhandled concurrency failure:', e.message);
    }

    const elapsed = Date.now() - startTime;
    console.log(`\n=== Performance Check Summary ===`);
    console.log(`Elapsed Time: ${elapsed}ms`);
    console.log(`Simultaneous clients: ${clientCount}`);
    console.log(`Successful sync transactions: ${successfulSyncs}/${clientCount}`);
    console.log(`Deadlock errors encountered: ${deadlockErrors}`);

    // Verify all tickets got scanned
    const scannedCount = await prisma.ticket.count({
        where: {
            order_id: orderId,
            is_scanned: true,
        }
    });
    console.log(`Total tickets scanned in database: ${scannedCount}/${ticketCount}`);

    // 3. Clean up
    console.log('\nCleaning up temporary test records...');
    await prisma.ticket.deleteMany({ where: { order_id: orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.ticketCategory.delete({ where: { id: categoryId } });
    await prisma.concert.delete({ where: { id: concertId } });
    await prisma.user.delete({ where: { id: userId } });

    console.log('Closing NestJS context...');
    await app.close();

    console.log('Cleanup complete. Performance test successfully completed!');

    if (deadlockErrors > 0) {
        throw new Error(`Performance check failed: ${deadlockErrors} deadlock errors occurred.`);
    }
}

runPerformanceCheck()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((err) => {
        console.error('Performance check failed with error:', err);
        prisma.$disconnect();
        process.exit(1);
    });
