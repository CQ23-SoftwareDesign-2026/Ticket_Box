import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING'] as const;
export type UserStatus = typeof USER_STATUSES[number];

export class AdminUserQueryDto extends PaginationDto {
    @ApiPropertyOptional({ example: 'nguyen', description: 'Search by email or full name' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: USER_STATUSES })
    @IsIn(USER_STATUSES)
    @IsOptional()
    status?: UserStatus;

    @ApiPropertyOptional({ example: 'Checker', description: 'Filter by role name' })
    @IsString()
    @IsOptional()
    role?: string;
}
