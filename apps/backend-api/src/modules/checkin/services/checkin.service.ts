import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma.service';
import { SyncTicketItemDto } from '../dtos/sync-tickets.dto';
import { ScanTicketDto } from '../dtos/scan-ticket.dto';

@Injectable()
export class CheckInService {
    private readonly logger = new Logger(CheckInService.name);

    constructor(private readonly prisma: PrismaService) { }

    async prefetchTickets(concertId: string, gateId: number): Promise<string[]> {
        if (gateId === undefined || gateId === null) {
            throw new BadRequestException('gate_id or gate_number query parameter is required');
        }

        const concert = await this.prisma.concert.findUnique({
            where: { id: concertId },
            select: {
                status: true,
                ticket_categories: {
                    where: {
                        gate_number: gateId,
                    },
                    select: {
                        tickets: {
                            where: {
                                order: {
                                    status: 'PAID',
                                },
                                is_scanned: false,
                            },
                            select: {
                                qr_code_hash: true,
                            },
                        },
                    },
                },
            },
        });

        if (!concert) {
            throw new NotFoundException(`Concert not found for ID: ${concertId}`);
        }

        if (concert.status !== 'PUBLISHED') {
            throw new BadRequestException(`Concert is not published for ID: ${concertId}`);
        }

        return concert.ticket_categories.flatMap(cat =>
            cat.tickets.map(t => t.qr_code_hash)
        );
    }

    async syncTickets(
        updates: SyncTicketItemDto[],
        concertId?: string,
        gateId?: number,
    ): Promise<{
        success: boolean;
        processed: number;
        updated: number;
        conflicts: number;
        errors: number;
    }> {
        if (!updates || updates.length === 0) {
            return {
                success: true,
                processed: 0,
                updated: 0,
                conflicts: 0,
                errors: 0,
            };
        }

        // Sort items by qr_code_hash to ensure consistent database locking order
        const sortedUpdates = [...updates].sort((a, b) => a.qr_code_hash.localeCompare(b.qr_code_hash));

        // Deduplicate updates: keep the earliest scan time for each hash
        const uniqueUpdatesMap = new Map<string, SyncTicketItemDto>();
        for (const item of sortedUpdates) {
            const existing = uniqueUpdatesMap.get(item.qr_code_hash);
            if (!existing || new Date(item.scanned_at) < new Date(existing.scanned_at)) {
                uniqueUpdatesMap.set(item.qr_code_hash, item);
            }
        }
        const uniqueUpdates = Array.from(uniqueUpdatesMap.values());

        let updated = 0;
        let conflicts = 0;
        let errors = 0;

        try {
            await this.prisma.$transaction(async (tx) => {
                // Fetch all matching tickets in one query to reduce DB roundtrips and lock hold time
                const hashes = uniqueUpdates.map(u => u.qr_code_hash);
                
                const whereClause: Prisma.TicketWhereInput = {
                    qr_code_hash: { in: hashes },
                };

                if (concertId) {
                    whereClause.order = {
                        concert_id: concertId,
                    };
                }

                if (gateId !== undefined && gateId !== null) {
                    whereClause.category = {
                        gate_number: gateId,
                    };
                }

                const tickets = await tx.ticket.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        qr_code_hash: true,
                        is_scanned: true,
                        scanned_at: true,
                        scanned_by: true,
                    },
                });

                const ticketMap = new Map(tickets.map(t => [t.qr_code_hash, t]));
                const toUpdate: { id: string; scanned_at: Date; scanned_by: string }[] = [];

                for (const item of uniqueUpdates) {
                    const ticket = ticketMap.get(item.qr_code_hash);

                    if (!ticket) {
                        this.logger.warn(`[Checkin Sync Error] Ticket hash not found or out of scope: ${item.qr_code_hash}`);
                        errors++;
                        continue;
                    }

                    const incomingScanTime = new Date(item.scanned_at);

                    if (!ticket.is_scanned) {
                        toUpdate.push({
                            id: ticket.id,
                            scanned_at: incomingScanTime,
                            scanned_by: item.scanned_by,
                        });
                        updated++;
                    } else {
                        // Ticket was already scanned. Resolve conflict based on earliest timestamp.
                        const existingScanTime = ticket.scanned_at ? new Date(ticket.scanned_at) : new Date();

                        if (incomingScanTime < existingScanTime) {
                            // Offline scan was earlier, override the DB scan details
                            toUpdate.push({
                                id: ticket.id,
                                scanned_at: incomingScanTime,
                                scanned_by: item.scanned_by,
                            });
                            this.logger.warn(
                                `[Checkin Sync Conflict] Ticket ${item.qr_code_hash} scan overwritten. ` +
                                `Previous scan at ${existingScanTime.toISOString()} by ${ticket.scanned_by} ` +
                                `replaced by earlier offline scan at ${incomingScanTime.toISOString()} by ${item.scanned_by}.`
                            );
                            updated++;
                        } else {
                            // Offline scan is later, reject it
                            this.logger.warn(
                                `[Checkin Sync Conflict] Ticket ${item.qr_code_hash} already scanned at ` +
                                `${existingScanTime.toISOString()} by ${ticket.scanned_by}. ` +
                                `Offline scan at ${incomingScanTime.toISOString()} by ${item.scanned_by} was rejected.`
                            );
                            conflicts++;
                        }
                    }
                }

                // If there are records to update, execute a single raw bulk UPDATE statement
                if (toUpdate.length > 0) {
                    const valuesList = toUpdate.map(
                        t => Prisma.sql`(${t.id}::uuid, ${t.scanned_at}::timestamp, ${t.scanned_by}::uuid)`
                    );
                    
                    await tx.$executeRaw`
                        UPDATE tickets AS t
                        SET 
                          is_scanned = true,
                          scanned_at = u.scanned_at,
                          scanned_by = u.scanned_by
                        FROM (
                          VALUES ${Prisma.join(valuesList)}
                        ) AS u(id, scanned_at, scanned_by)
                        WHERE t.id = u.id;
                    `;
                }
            }, {
                timeout: 15000 // tolerating higher connection contention
            });
        } catch (error) {
            this.logger.error(`[Checkin Sync Failed] Transaction failed`, error);
            return {
                success: false,
                processed: updates.length,
                updated: 0,
                conflicts: 0,
                errors: updates.length,
            };
        }

        const duplicateCount = updates.length - uniqueUpdates.length;
        conflicts += duplicateCount;

        return {
            success: errors === 0,
            processed: updates.length,
            updated,
            conflicts,
            errors,
        };
    }

    async scanTicket(
        userId: string,
        dto: ScanTicketDto,
    ): Promise<{
        status: 'ACCEPTED' | 'DUPLICATE' | 'INVALID_GATE' | 'NOT_FOUND' | 'UNPAID';
        scanned_at?: Date;
        scanned_by?: string;
    }> {
        // Query the ticket by QR code hash, including order and category for verification
        const ticket = await this.prisma.ticket.findUnique({
            where: { qr_code_hash: dto.qr_code_hash },
            include: {
                order: true,
                category: true,
            },
        });

        if (!ticket) {
            return { status: 'NOT_FOUND' };
        }

        // Validate gate matching
        if (ticket.category.gate_number !== dto.gate_id) {
            return { status: 'INVALID_GATE' };
        }

        // Validate concert matching
        if (ticket.order.concert_id !== dto.concert_id) {
            return { status: 'INVALID_GATE' };
        }

        // Validate order status is PAID
        if (ticket.order.status !== 'PAID') {
            return { status: 'UNPAID' };
        }

        // If already scanned, return DUPLICATE
        if (ticket.is_scanned) {
            return {
                status: 'DUPLICATE',
                scanned_at: ticket.scanned_at ?? undefined,
                scanned_by: ticket.scanned_by ?? undefined,
            };
        }

        const scanTime = dto.scanned_at ? new Date(dto.scanned_at) : new Date();

        // Perform an atomic check-and-update using updateMany with is_scanned: false
        const updateResult = await this.prisma.ticket.updateMany({
            where: {
                id: ticket.id,
                is_scanned: false,
            },
            data: {
                is_scanned: true,
                scanned_at: scanTime,
                scanned_by: userId,
            },
        });

        if (updateResult.count === 0) {
            // Concurrently updated by another request. Fetch latest scanned details.
            const refreshedTicket = await this.prisma.ticket.findUnique({
                where: { id: ticket.id },
                select: {
                    scanned_at: true,
                    scanned_by: true,
                },
            });
            return {
                status: 'DUPLICATE',
                scanned_at: refreshedTicket?.scanned_at ?? undefined,
                scanned_by: refreshedTicket?.scanned_by ?? undefined,
            };
        }

        return {
            status: 'ACCEPTED',
            scanned_at: scanTime,
        };
    }
}
