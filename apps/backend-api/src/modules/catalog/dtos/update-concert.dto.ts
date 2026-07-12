import { IsDateString, IsOptional, IsString, IsEnum, MaxLength, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../../shared/validators/is-future-date.decorator';
import { ConcertStatus } from '../constants/concert-status.enum';
import { CreateTicketCategoryDto } from './create-ticket-category.dto';

export class UpdateConcertDto {
  @ApiPropertyOptional({ example: 'Anh Trai Say Hi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'District 1 Stadium, Ho Chi Minh City' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: [String], example: ['Phung Khanh Linh', 'Chi Dep'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  performers?: string[];

  @ApiPropertyOptional({ example: 'Updated AI bio' })
  @IsOptional()
  @IsString()
  ai_bio?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-06-10T19:30:00+07:00' })
  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  start_time?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ticketbox.local/maps/anh-trai-say-hi.svg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  svg_map_url?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ticketbox.local/posters/anh-trai-say-hi.png' })
  @IsOptional()
  @IsString()
  @IsUrl()
  poster_url?: string;

  @ApiPropertyOptional({ enum: ConcertStatus, example: ConcertStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(ConcertStatus)
  status?: ConcertStatus;

  @ApiPropertyOptional({ type: [CreateTicketCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketCategoryDto)
  ticketTiers?: CreateTicketCategoryDto[];
}
