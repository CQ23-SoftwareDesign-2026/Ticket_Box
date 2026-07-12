import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service";
import {
  CreateCheckerAssignmentDto,
  UpdateCheckerAssignmentDto,
  QueryCheckerAssignmentDto,
} from "../dtos/checker-assignment.dto";
import { PaginationMetaDto } from "../../../shared/dtos/pagination-meta.dto";

@Injectable()
export class CheckerAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssignment(dto: CreateCheckerAssignmentDto) {
    // 1. Check if user exists and has 'Checker' role
    const checkerUser = await this.prisma.user.findUnique({
      where: { id: dto.checker_id },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!checkerUser) {
      throw new NotFoundException(`User with ID ${dto.checker_id} not found`);
    }

    const isChecker = checkerUser.user_roles.some(
      (ur) => ur.role.name === "Checker",
    );
    if (!isChecker) {
      throw new BadRequestException(
        `User ${dto.checker_id} does not have the 'Checker' role`,
      );
    }

    // 2. Check if concert exists
    const concert = await this.prisma.concert.findUnique({
      where: { id: dto.concert_id },
      include: {
        ticket_categories: true,
      },
    });

    if (!concert) {
      throw new NotFoundException(
        `Concert with ID ${dto.concert_id} not found`,
      );
    }

    if (concert.start_time <= new Date()) {
      throw new BadRequestException(
        "Cannot assign a checker after the concert has started",
      );
    }

    // 3. Check if gate_number is valid for this concert
    const validGates = concert.ticket_categories
      .map((tc) => tc.gate_number)
      .filter((g): g is number => g !== null && g !== undefined);

    if (!validGates.includes(dto.gate_number)) {
      throw new BadRequestException(
        `Gate number ${dto.gate_number} is not valid for concert ${dto.concert_id}`,
      );
    }

    // 4. Check for existing assignment (Unique constraint: one checker per concert)
    const existing = await this.prisma.checkerAssignment.findUnique({
      where: {
        checker_id_concert_id: {
          checker_id: dto.checker_id,
          concert_id: dto.concert_id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        "Checker is already assigned to this concert",
      );
    }

    // Check if gate is already assigned to another checker at this concert
    const existingGate = await this.prisma.checkerAssignment.findUnique({
      where: {
        concert_id_gate_number: {
          concert_id: dto.concert_id,
          gate_number: dto.gate_number,
        },
      },
    });

    if (existingGate) {
      throw new BadRequestException(
        `Gate number ${dto.gate_number} is already assigned to another checker`,
      );
    }

    // 5. Create assignment
    return this.prisma.checkerAssignment.create({
      data: {
        checker_id: dto.checker_id,
        concert_id: dto.concert_id,
        gate_number: dto.gate_number,
      },
    });
  }

  async getAssignments(query: QueryCheckerAssignmentDto) {
    const { concert_id, checker_id, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (concert_id) {
      whereClause.concert_id = concert_id;
    }
    if (checker_id) {
      whereClause.checker_id = checker_id;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.checkerAssignment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          checker: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          concert: {
            select: {
              id: true,
              name: true,
              location: true,
              start_time: true,
              status: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prisma.checkerAssignment.count({
        where: whereClause,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const meta = new PaginationMetaDto({
      totalItems: total,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    });

    return { data: items, meta };
  }

  async updateAssignment(id: string, dto: UpdateCheckerAssignmentDto) {
    // 1. Check if assignment exists
    const assignment = await this.prisma.checkerAssignment.findUnique({
      where: { id },
      include: {
        concert: {
          include: {
            ticket_categories: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    // 2. Check if gate_number is valid for this concert
    const validGates = assignment.concert.ticket_categories
      .map((tc) => tc.gate_number)
      .filter((g): g is number => g !== null && g !== undefined);

    if (!validGates.includes(dto.gate_number)) {
      throw new BadRequestException(
        `Gate number ${dto.gate_number} is not valid for concert ${assignment.concert_id}`,
      );
    }

    // Check if gate is already assigned to another checker at this concert
    const existingGate = await this.prisma.checkerAssignment.findUnique({
      where: {
        concert_id_gate_number: {
          concert_id: assignment.concert_id,
          gate_number: dto.gate_number,
        },
      },
    });

    if (existingGate && existingGate.id !== id) {
      throw new BadRequestException(
        `Gate number ${dto.gate_number} is already assigned to another checker`,
      );
    }

    // 3. Update assignment
    return this.prisma.checkerAssignment.update({
      where: { id },
      data: {
        gate_number: dto.gate_number,
      },
    });
  }

  async deleteAssignment(id: string) {
    // 1. Check if assignment exists
    const assignment = await this.prisma.checkerAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    // 2. Delete assignment
    await this.prisma.checkerAssignment.delete({
      where: { id },
    });

    return { success: true, message: "Phân công đã được xóa thành công" };
  }

  async getActiveConcerts() {
    return this.prisma.concert.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        location: true,
        start_time: true,
      },
      orderBy: {
        start_time: "desc",
      },
    });
  }

  async getCheckers() {
    return this.prisma.user.findMany({
      where: {
        user_roles: {
          some: {
            role: { name: "Checker" },
          },
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        full_name: true,
      },
    });
  }

  async getAvailableGates(concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      include: {
        ticket_categories: {
          select: {
            gate_number: true,
          },
        },
        checker_assignments: {
          select: {
            gate_number: true,
          },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID ${concertId} not found`);
    }

    const allGates = concert.ticket_categories
      .map((tc) => tc.gate_number)
      .filter((g): g is number => g !== null && g !== undefined);

    const assignedGates = concert.checker_assignments.map(
      (ca) => ca.gate_number,
    );

    const availableGates = allGates.filter((g) => !assignedGates.includes(g));

    return Array.from(new Set(availableGates)).sort((a, b) => a - b);
  }
}
