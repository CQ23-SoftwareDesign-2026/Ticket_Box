import { checkinApi } from '@/features/checkin/api/checkin-api';
import { concertApi } from '@/features/checkin/api/concert-api';
import { prefetchStorage, scanSessionStorage } from '@/features/checkin/storage/checkin-storage';
import type { CheckinAssignment } from '@/features/checkin/types/checkin.types';

export type AssignmentWithTicketTypes = CheckinAssignment & {
  ticketTypeLabels: string[];
};

export function buildAssignmentId(assignment: CheckinAssignment) {
  return `${assignment.concert_id}:${assignment.gate_number}`;
}

export async function loadAssignmentsWithTicketTypes(): Promise<AssignmentWithTicketTypes[]> {
  const assignments = await checkinApi.getMyAssignments();
  const concertCache = new Map<string, string[]>();

  return Promise.all(
    assignments.map(async (assignment) => {
      const cacheKey = `${assignment.concert_id}:${assignment.gate_number}`;
      const cachedLabels = concertCache.get(cacheKey);

      if (cachedLabels) {
        return {
          ...assignment,
          ticketTypeLabels: cachedLabels,
        };
      }

      try {
        const concert = await concertApi.getConcert(assignment.concert_id);
        const ticketTypeLabels = concert.ticketTiers
          .filter((tier) => tier.gate_number === assignment.gate_number)
          .map((tier) => tier.name);

        concertCache.set(cacheKey, ticketTypeLabels);

        return {
          ...assignment,
          ticketTypeLabels,
        };
      } catch {
        return {
          ...assignment,
          ticketTypeLabels: [],
        };
      }
    }),
  );
}

export async function startCheckinSession(assignment: AssignmentWithTicketTypes) {
  const hashes = await checkinApi.prefetchTickets(assignment.concert_id, assignment.gate_number);
  const prefetchedAt = new Date().toISOString();

  await prefetchStorage.setPrefetchedTicketSet({
    concertId: assignment.concert_id,
    gateNumber: assignment.gate_number,
    hashes,
    prefetchedAt,
  });

  await scanSessionStorage.setCurrentSession({
    concertId: assignment.concert_id,
    concertTitle: assignment.concert_name,
    concertVenue: assignment.location,
    gateNumber: assignment.gate_number,
    gateLabel: assignment.gate_label,
    ticketTypeLabels: assignment.ticketTypeLabels,
    prefetchedHashCount: hashes.length,
    prefetchedAt,
  });
}
