import { PrismaClient } from "@prisma/client";
import { seedAuth } from "./seeds/auth.seed";
import { seedBackgroundJobs } from "./seeds/background-jobs.seed";
import { seedCatalog } from "./seeds/catalog.seed";
import { seedCheckerAssignments } from "./seeds/checker-assignments.seed";
import { seedGuestLists } from "./seeds/guest-lists.seed";
import { seedNotifications } from "./seeds/notifications.seed";
import { seedOrders } from "./seeds/orders.seed";
import { seedPaymentTransactions } from "./seeds/payment-transactions.seed";
import { seedTicketCategories } from "./seeds/ticket-categories.seed";
import { seedTickets } from "./seeds/tickets.seed";

const prisma = new PrismaClient();

async function runSeed(name: string, task: () => Promise<void>) {
  const startedAt = Date.now();
  console.log(`[seed] starting ${name}`);
  await task();
  const elapsedMs = Date.now() - startedAt;
  console.log(`[seed] finished ${name} in ${elapsedMs}ms`);
}

async function clearDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "checker_assignments",
      "payment_transactions",
      "tickets",
      "notifications",
      "orders",
      "guest_lists",
      "background_jobs",
      "user_roles",
      "role_permissions",
      "permissions",
      "roles",
      "ticket_categories",
      "concerts",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

async function seedAll() {
  await runSeed("clear", () => clearDatabase());
  await runSeed("auth", () => seedAuth(prisma));
  await runSeed("catalog", () => seedCatalog(prisma));
  await runSeed("ticket_categories", () => seedTicketCategories(prisma));
  await runSeed("checker_assignments", () => seedCheckerAssignments(prisma));
  await runSeed("orders", () => seedOrders(prisma));
  await runSeed("payment_transactions", () => seedPaymentTransactions(prisma));
  await runSeed("tickets", () => seedTickets(prisma));
  await runSeed("notifications", () => seedNotifications(prisma));
  await runSeed("guest_lists", () => seedGuestLists(prisma));
  await runSeed("background_jobs", () => seedBackgroundJobs(prisma));
}

seedAll()
  .then(() => {
    console.log("Seed completed.");
  })
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
