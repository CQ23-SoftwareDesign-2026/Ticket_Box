import {
  Controller,
  Get,
  Query,
  Param,
  UsePipes,
  ValidationPipe,
  Body,
  Post,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConcertService } from '../services/concert.service';
import { CreateConcertDto } from '../dtos/create-concert.dto';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ConcertResponseDto } from '../entities/concert-response.dto';
import { ConcertListResponseDto } from '../dtos/concert-list-response.dto';
import { ConcertListQueryDto } from '../dtos/concert-list-query.dto';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import { ConcertDetailRateLimitGuard } from '../guards/concert-detail-rate-limit.guard';

@Controller('concerts')
@ApiTags('Catalog - Concerts')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ConcertController {
  constructor(private readonly concertService: ConcertService) { }

  @Get()
  @ApiOperation({ summary: 'Get concerts with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (DRAFT, PUBLISHED, COMPLETED)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by concert name' })
  @ApiOkResponse({ type: ConcertListResponseDto })
  async listConcerts(@Query() query: ConcertListQueryDto) {
    return this.concertService.getConcerts(query);
  }

  @Get(':id')
  @UseGuards(ConcertDetailRateLimitGuard)
  @ApiOperation({ summary: 'Get concert detail by id' })
  @ApiParam({ name: 'id', description: 'Concert id (UUID)' })
  @ApiOkResponse({ type: ConcertResponseDto })
  async getConcert(@Param('id') id: string) {
    return this.concertService.getConcertById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @Permissions('CREATE_CONCERT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create concert (Admin/Organizer)' })
  @ApiCreatedResponse({ type: ConcertResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createConcert(@Body() payload: CreateConcertDto) {
    return this.concertService.createConcert(payload);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @Permissions('UPDATE_CONCERT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update concert (Admin/Organizer)' })
  @ApiParam({ name: 'id', description: 'Concert id (UUID)' })
  @ApiOkResponse({ type: ConcertResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async updateConcert(@Param('id') id: string, @Body() payload: UpdateConcertDto) {
    return this.concertService.updateConcert(id, payload);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @Permissions('DELETE_CONCERT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete concert (Admin)' })
  @ApiParam({ name: 'id', description: 'Concert id (UUID)' })
  @ApiOkResponse({ type: ConcertResponseDto })
  async deleteConcert(@Param('id') id: string) {
    return this.concertService.deleteConcert(id);
  }
}
