import { PrismaClient } from "@prisma/client";

const PRIMARY_CHECKER_EMAIL = "quang.checker@ticketbox.local";

export async function seedCheckerAssignments(prisma: PrismaClient) {
  const checkers = await prisma.user.findMany({
    where: { user_roles: { some: { role: { name: "Checker" } } } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  const primaryChecker = checkers.find(
    (checker) => checker.email === PRIMARY_CHECKER_EMAIL,
  );
  if (!primaryChecker) throw new Error(`Missing ${PRIMARY_CHECKER_EMAIL}`);

  const otherCheckers = checkers.filter(
    (checker) => checker.id !== primaryChecker.id,
  );
  const concerts = await prisma.concert.findMany({
    select: {
      id: true,
      name: true,
      start_time: true,
      ticket_categories: { select: { gate_number: true } },
    },
  });
  const rows = concerts.flatMap((concert) => {
    const gates = [
      ...new Set(
        concert.ticket_categories
          .map((category) => category.gate_number)
          .filter((gate): gate is number => gate !== null),
      ),
    ].sort((left, right) => left - right);
    if (gates.length > checkers.length) {
      throw new Error(
        `${concert.name} has ${gates.length} gates but only ${checkers.length} checkers`,
      );
    }

    return gates.map((gate, index) => ({
      concert_id: concert.id,
      gate_number: gate,
      checker_id:
        index === 0
          ? primaryChecker.id
          : otherCheckers[(index - 1) % otherCheckers.length].id,
      created_at: new Date(
        concert.start_time.getTime() - 7 * 24 * 60 * 60 * 1000,
      ),
    }));
  });

  await prisma.checkerAssignment.createMany({ data: rows });
  console.log(
    `[seed] assigned ${rows.length} concert gates to ${checkers.length} checkers`,
  );
}
