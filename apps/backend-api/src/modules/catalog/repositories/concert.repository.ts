import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { ConcertResponseDto } from '../entities/concert-response.dto';
import { TicketTierDto } from '../entities/ticket-tier.dto';
import { CreateConcertDto } from '../dtos/create-concert.dto';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { ConcertListItemDto } from '../dtos/concert-list-item.dto';
import { ConcertListStatus } from '../dtos/concert-list-query.dto';

type ConcertListRow = {
  id: string;
  name: string;
  description: string | null;
  location: string;
  start_time: Date;
  svg_map_url: string | null;
  poster_url: string | null;
  status: string;
};

type ConcertTicketCategoryRow = {
  id: string;
  name: string;
  price: { toNumber(): number } | number | string;
  total_quantity: number;
  max_per_user: number;
  gate_number?: number | null;
  position?: number | null;
  status?: string | null;
};

type ConcertDetailRow = ConcertListRow & {
  ai_bio: string | null;
  ticket_categories: ConcertTicketCategoryRow[];
};

@Injectable()
export class ConcertRepository {
  constructor(private readonly prisma: PrismaService) { }

  private readonly deletedStatus = 'CANCELLED';

  /**
   * Retrieve concerts with pagination. Returns items + total count.
   */
  async findManyWithPagination(
    page: number,
    limit: number,
    status?: ConcertListStatus,
    search?: string,
  ): Promise<{ items: ConcertListItemDto[]; total: number; page: number; limit: number }> {
    const take = limit;
    const skip = Math.max(0, (page - 1) * limit);
    const trimmedSearch = search?.trim();
    const where = {
      status: status ?? { not: this.deletedStatus },
      ...(trimmedSearch
        ? {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.concert.findMany({
        skip,
        take,
        where,
        select: {
          id: true,
          name: true,
          description: true,
          location: true,
          start_time: true,
          svg_map_url: true,
          poster_url: true,
          status: true,
        },
        orderBy: { start_time: 'desc' },
      }),
      this.prisma.concert.count({ where }),
    ]);

    const mapped = items.map((c: ConcertListRow) => this.mapToListDto(c));
    return { items: mapped, total, page, limit };
  }

  /**
   * Find a single concert by id including related ticket categories (ticket tiers)
   */
  async findById(id: string, includeDeleted = false): Promise<ConcertResponseDto | null> {
    const where = includeDeleted ? { id } : { id, status: { not: this.deletedStatus } };
    const concert = await this.prisma.concert.findFirst({
      where,
      include: { ticket_categories: true },
    });

    if (!concert) return null;
    return this.mapToDto(concert);
  }

  async create(payload: CreateConcertDto): Promise<ConcertResponseDto> {
    const concert = await this.prisma.concert.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        location: payload.location,
        ai_bio: payload.ai_bio ?? null,
        start_time: new Date(payload.start_time),
        svg_map_url: payload.svg_map_url ?? null,
        poster_url: payload.poster_url ?? null,
        status: payload.status,
        ticket_categories: {
          create: (payload.ticketTiers || []).map((category) => ({
            name: category.name,
            price: category.price,
            total_quantity: category.total_quantity,
            max_per_user: category.max_per_user,
            gate_number: category.gate_number ?? null,
            position: category.position ?? 0,
            status: category.status ?? 'book_now',
          })),
        },
      },
      include: { ticket_categories: true },
    });

    return this.mapToDto(concert);
  }

  async update(id: string, payload: UpdateConcertDto): Promise<ConcertResponseDto> {
    if (payload.ticketTiers) {
      const incomingTiers = payload.ticketTiers;

      // Get existing categories to identify deleted ones
      const existing = await this.prisma.ticketCategory.findMany({
        where: { concert_id: id },
        select: { id: true },
      });
      const existingIds = existing.map((e) => e.id);

      const incomingIds = incomingTiers.map((t) => t.id).filter((tierId): tierId is string => !!tierId);
      const toDelete = existingIds.filter((exId) => !incomingIds.includes(exId));

      await this.prisma.$transaction(async (tx) => {
        // 1. Delete removed categories
        if (toDelete.length > 0) {
          await tx.ticketCategory.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        // 2. Create or Update incoming categories
        for (const tier of incomingTiers) {
          if (tier.id && existingIds.includes(tier.id)) {
            // Update
            await tx.ticketCategory.update({
              where: { id: tier.id },
              data: {
                name: tier.name,
                price: tier.price,
                total_quantity: tier.total_quantity,
                max_per_user: tier.max_per_user,
                gate_number: tier.gate_number ?? null,
                position: tier.position ?? 0,
                status: tier.status ?? 'book_now',
              },
            });
          } else {
            // Create
            await tx.ticketCategory.create({
              data: {
                concert_id: id,
                name: tier.name,
                price: tier.price,
                total_quantity: tier.total_quantity,
                max_per_user: tier.max_per_user,
                gate_number: tier.gate_number ?? null,
                position: tier.position ?? 0,
                status: tier.status ?? 'book_now',
              },
            });
          }
        }
      });
    }

    const concert = await this.prisma.concert.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description ?? undefined,
        location: payload.location,
        ai_bio: payload.ai_bio ?? undefined,
        start_time: payload.start_time ? new Date(payload.start_time) : undefined,
        svg_map_url: payload.svg_map_url ?? undefined,
        poster_url: payload.poster_url ?? undefined,
        status: payload.status,
      },
      include: { ticket_categories: true },
    });

    return this.mapToDto(concert);
  }

  async delete(id: string): Promise<ConcertResponseDto> {
    const concert = await this.prisma.concert.update({
      where: { id },
      data: { status: this.deletedStatus },
      include: { ticket_categories: true },
    });

    return this.mapToDto(concert);
  }

  private mapToDto(
    concert: ConcertDetailRow,
  ): ConcertResponseDto {
    const ticketTiers: TicketTierDto[] = (concert.ticket_categories || []).map((tc: ConcertTicketCategoryRow) =>
      new TicketTierDto({
        id: tc.id,
        name: tc.name,
        price: Number(typeof tc.price === 'object' && tc.price !== null ? tc.price.toNumber() : tc.price),
        total_quantity: tc.total_quantity,
        max_per_user: tc.max_per_user,
        gate_number: tc.gate_number ?? null,
        position: tc.position ?? 0,
        status: tc.status ?? 'book_now',
      }),
    );

    return new ConcertResponseDto({
      id: concert.id,
      name: concert.name,
      description: concert.description ?? null,
      location: concert.location,
      ai_bio: concert.ai_bio ?? null,
      start_time: concert.start_time,
      svg_map_url: concert.svg_map_url ?? null,
      poster_url: concert.poster_url ?? null,
      status: concert.status,
      ticketTiers,
    });
  }

  private mapToListDto(concert: ConcertListRow): ConcertListItemDto {
    return new ConcertListItemDto({
      id: concert.id,
      name: concert.name,
      description: concert.description ?? null,
      location: concert.location,
      start_time: concert.start_time,
      svg_map_url: concert.svg_map_url ?? null,
      poster_url: concert.poster_url ?? null,
      status: concert.status,
    });
  }
}
