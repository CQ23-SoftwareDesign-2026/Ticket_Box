import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CheckerAssignmentService } from '../services/checker-assignment.service';
import { CreateCheckerAssignmentDto, UpdateCheckerAssignmentDto, QueryCheckerAssignmentDto } from '../dtos/checker-assignment.dto';

@ApiTags('Admin Checker Assignments')
@Controller('checkin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CheckerAssignmentController {
    constructor(private readonly assignmentService: CheckerAssignmentService) {}

    @Post()
    @ApiOperation({ summary: 'Tạo phân công cổng mới cho Checker' })
    create(@Body() dto: CreateCheckerAssignmentDto) {
        return this.assignmentService.createAssignment(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách phân công' })
    findAll(@Query() query: QueryCheckerAssignmentDto) {
        return this.assignmentService.getAssignments(query);
    }

    @Get('concerts')
    @ApiOperation({ summary: 'Lấy danh sách các concert đang bán vé (PUBLISHED)' })
    findActiveConcerts() {
        return this.assignmentService.getActiveConcerts();
    }

    @Get('checkers')
    @ApiOperation({ summary: 'Lấy danh sách tài khoản Checker đang hoạt động' })
    findCheckers() {
        return this.assignmentService.getCheckers();
    }

    @Get('gates/:concert_id')
    @ApiOperation({ summary: 'Lấy danh sách các cổng còn trống (chưa được phân công) của một concert' })
    findAvailableGates(@Param('concert_id', new ParseUUIDPipe()) concertId: string) {
        return this.assignmentService.getAvailableGates(concertId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật cổng của phân công' })
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateCheckerAssignmentDto,
    ) {
        return this.assignmentService.updateAssignment(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa phân công' })
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.assignmentService.deleteAssignment(id);
    }
}
