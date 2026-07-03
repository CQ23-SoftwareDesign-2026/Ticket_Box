import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueQueryDto {
    @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({ example: '2026-07-31T23:59:59.999Z' })
    @IsDateString()
    @IsOptional()
    to?: string;

    @ApiPropertyOptional({ example: 'day', enum: ['day', 'week', 'month'] })
    @IsIn(['day', 'week', 'month'])
    @IsOptional()
    group_by?: 'day' | 'week' | 'month';
}

export class RecentOrdersQueryDto {
    @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    @IsOptional()
    limit?: number;
}
