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
  performers: string[];
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
  sales_start_at?: Date | null;
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
          performers: true,
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
        performers: payload.performers ?? [],
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
            sales_start_at: category.sales_start_at ? new Date(category.sales_start_at) : null,
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

      // Get existing categories to identify matching ones and deleted ones
      const existing = await this.prisma.ticketCategory.findMany({
        where: { concert_id: id },
        select: { id: true, name: true },
      });

      const matchedIds = new Set<string>();
      const toUpdate: Array<{ id: string; data: any }> = [];
      const toCreate: Array<any> = [];

      for (const incoming of incomingTiers) {
        // 1. Try to find match by ID
        let existingMatch = existing.find((e) => incoming.id && e.id === incoming.id);

        // 2. Try to find match by Name (case-insensitive) if ID match is not found
        if (!existingMatch) {
          existingMatch = existing.find((e) => e.name.toLowerCase() === incoming.name.toLowerCase() && !matchedIds.has(e.id));
        }

        if (existingMatch) {
          matchedIds.add(existingMatch.id);
          toUpdate.push({
            id: existingMatch.id,
            data: {
              name: incoming.name,
              price: incoming.price,
              total_quantity: incoming.total_quantity,
              max_per_user: incoming.max_per_user,
              gate_number: incoming.gate_number ?? null,
              position: incoming.position ?? 0,
              status: incoming.status ?? 'book_now',
              sales_start_at: incoming.sales_start_at ? new Date(incoming.sales_start_at) : null,
            },
          });
        } else {
          toCreate.push({
            concert_id: id,
            name: incoming.name,
            price: incoming.price,
            total_quantity: incoming.total_quantity,
            max_per_user: incoming.max_per_user,
            gate_number: incoming.gate_number ?? null,
            position: incoming.position ?? 0,
            status: incoming.status ?? 'book_now',
            sales_start_at: incoming.sales_start_at ? new Date(incoming.sales_start_at) : null,
          });
        }
      }

      // Existing categories not matched are deleted
      const toDelete = existing.filter((e) => !matchedIds.has(e.id)).map((e) => e.id);

      await this.prisma.$transaction(async (tx) => {
        // 1. Delete removed categories
        if (toDelete.length > 0) {
          await tx.ticketCategory.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        // 2. Update matched categories
        for (const item of toUpdate) {
          await tx.ticketCategory.update({
            where: { id: item.id },
            data: item.data,
          });
        }

        // 3. Create new categories
        for (const item of toCreate) {
          await tx.ticketCategory.create({
            data: item,
          });
        }
      });
    }

    const concert = await this.prisma.concert.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description ?? undefined,
        location: payload.location,
        performers: payload.performers ?? undefined,
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
        sales_start_at: tc.sales_start_at ?? null,
      }),
    );

    return new ConcertResponseDto({
      id: concert.id,
      name: concert.name,
      description: concert.description ?? null,
      location: concert.location,
      performers: concert.performers,
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
      performers: concert.performers,
      start_time: concert.start_time,
      svg_map_url: concert.svg_map_url ?? null,
      poster_url: concert.poster_url ?? null,
      status: concert.status,
    });
  }
}
