import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../shared/prisma.service';
import { PaginationMetaDto } from '../../../shared/dtos/pagination-meta.dto';
import { AdminUserQueryDto } from '../dtos/admin-user-query.dto';
import { CreateAdminUserDto } from '../dtos/create-admin-user.dto';
import { UpdateUserRolesDto } from '../dtos/update-user-roles.dto';
import { UpdateUserStatusDto } from '../dtos/update-user-status.dto';

const BCRYPT_ROUNDS = 10;

type MoneyLike = { toString(): string } | string | number | null | undefined;

type AdminUserListRow = {
    id: string;
    email: string;
    full_name: string;
    status: string;
    created_at: Date;
    user_roles: Array<{ role: { name: string } }>;
    orders: Array<{ tickets: Array<{ id: string }> }>;
    _count?: { orders: number };
};

type AdminUserDetailRow = {
    id: string;
    email: string;
    full_name: string;
    status: string;
    created_at: Date;
    user_roles: Array<{ role: { name: string } }>;
    orders: Array<{
        id: string;
        status: string;
        total_amount: MoneyLike;
        created_at: Date;
        concert: { name: string };
        tickets: Array<{ id: string }>;
    }>;
};

@Injectable()
export class AdminUsersService {
    constructor(private readonly prisma: PrismaService) { }

    async getUsers(query: AdminUserQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = Math.max(0, (page - 1) * limit);
        const search = query.search?.trim();

        const where: Prisma.UserWhereInput = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.role ? { user_roles: { some: { role: { name: query.role } } } } : {}),
            ...(search
                ? {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { full_name: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };

        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                skip,
                take: limit,
                where,
                include: {
                    user_roles: {
                        include: {
                            role: {
                                select: { name: true },
                            },
                        },
                    },
                    orders: {
                        select: {
                            tickets: {
                                select: { id: true },
                            },
                        },
                    },
                    _count: {
                        select: { orders: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        const mapped = (users as AdminUserListRow[]).map((user) => this.mapListUser(user));
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            items: mapped,
            meta: new PaginationMetaDto({
                totalItems: total,
                itemCount: mapped.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            }),
        };
    }

    async createUser(dto: CreateAdminUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true },
        });

        if (existing) {
            throw new BadRequestException('Email already registered');
        }

        const roles = await this.getRolesOrThrow(dto.roles);
        const passwordHash = bcrypt.hashSync(dto.password, BCRYPT_ROUNDS);

        const user = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const created = await tx.user.create({
                data: {
                    email: dto.email,
                    password_hash: passwordHash,
                    full_name: dto.full_name,
                    status: dto.status ?? 'ACTIVE',
                },
            });

            await tx.userRole.createMany({
                data: roles.map((role) => ({
                    user_id: created.id,
                    role_id: role.id,
                })),
            });

            return created;
        });

        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            status: user.status,
            roles: roles.map((role) => role.name),
            created_at: user.created_at,
        };
    }

    async getUserDetail(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                user_roles: {
                    include: {
                        role: {
                            select: { name: true },
                        },
                    },
                },
                orders: {
                    take: 5,
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        status: true,
                        total_amount: true,
                        created_at: true,
                        concert: {
                            select: { name: true },
                        },
                        tickets: {
                            select: { id: true },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [orderCount, paidOrderCount, ticketCount, spentAggregate] = await this.prisma.$transaction([
            this.prisma.order.count({ where: { user_id: userId } }),
            this.prisma.order.count({ where: { user_id: userId, status: 'PAID' } }),
            this.prisma.ticket.count({ where: { order: { user_id: userId, status: 'PAID' } } }),
            this.prisma.order.aggregate({
                where: { user_id: userId, status: 'PAID' },
                _sum: { total_amount: true },
            }),
        ]);

        const row = user as AdminUserDetailRow;

        return {
            id: row.id,
            email: row.email,
            full_name: row.full_name,
            status: row.status,
            roles: this.mapRoles(row),
            created_at: row.created_at,
            stats: {
                order_count: orderCount,
                paid_order_count: paidOrderCount,
                ticket_count: ticketCount,
                total_spent: this.toNumber(spentAggregate._sum.total_amount),
            },
            recent_orders: row.orders.map((order) => ({
                order_id: order.id,
                concert_name: order.concert.name,
                status: order.status,
                total_amount: this.toNumber(order.total_amount),
                ticket_count: order.tickets.length,
                created_at: order.created_at,
            })),
        };
    }

    async updateStatus(userId: string, actorId: string, dto: UpdateUserStatusDto) {
        this.assertNotSelf(userId, actorId, 'Admin cannot update own status');

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { status: dto.status },
            include: {
                user_roles: {
                    include: {
                        role: {
                            select: { name: true },
                        },
                    },
                },
                orders: {
                    select: {
                        tickets: {
                            select: { id: true },
                        },
                    },
                },
                _count: {
                    select: { orders: true },
                },
            },
        }).catch((error) => {
            if (this.isPrismaNotFound(error)) {
                throw new NotFoundException('User not found');
            }

            throw error;
        });

        return this.mapListUser(user as AdminUserListRow);
    }

    async updateRoles(userId: string, actorId: string, dto: UpdateUserRolesDto) {
        this.assertNotSelf(userId, actorId, 'Admin cannot update own roles');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const roles = await this.getRolesOrThrow(dto.roles);

        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.userRole.deleteMany({
                where: { user_id: userId },
            });

            await tx.userRole.createMany({
                data: roles.map((role) => ({
                    user_id: userId,
                    role_id: role.id,
                })),
            });
        });

        return this.getUserDetail(userId);
    }

    private async getRolesOrThrow(roleNames: string[]) {
        const uniqueRoleNames = [...new Set(roleNames.map((role) => role.trim()).filter(Boolean))];

        if (uniqueRoleNames.length === 0) {
            throw new BadRequestException('At least one role is required');
        }

        const roles = await this.prisma.role.findMany({
            where: {
                name: { in: uniqueRoleNames },
            },
            select: {
                id: true,
                name: true,
            },
        });

        const found = new Set(roles.map((role) => role.name));
        const missing = uniqueRoleNames.filter((role) => !found.has(role));

        if (missing.length > 0) {
            throw new BadRequestException(`Role not found: ${missing.join(', ')}`);
        }

        return roles;
    }

    private mapListUser(user: AdminUserListRow) {
        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            status: user.status,
            roles: this.mapRoles(user),
            created_at: user.created_at,
            order_count: user._count?.orders ?? user.orders.length,
            ticket_count: this.sumTickets(user.orders),
        };
    }

    private mapRoles(user: { user_roles: Array<{ role: { name: string } }> }): string[] {
        return user.user_roles.map((userRole) => userRole.role.name);
    }

    private sumTickets(orders: Array<{ tickets: Array<{ id: string }> }>): number {
        return orders.reduce((total, order) => total + order.tickets.length, 0);
    }

    private toNumber(value: MoneyLike): number {
        if (value === null || value === undefined) {
            return 0;
        }

        if (typeof value === 'number') {
            return value;
        }

        return Number(value.toString());
    }

    private assertNotSelf(userId: string, actorId: string, message: string) {
        if (userId === actorId) {
            throw new BadRequestException(message);
        }
    }

    private isPrismaNotFound(error: unknown): boolean {
        return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
    }
}
