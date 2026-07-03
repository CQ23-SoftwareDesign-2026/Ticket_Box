import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminUserQueryDto } from '../dtos/admin-user-query.dto';
import { CreateAdminUserDto } from '../dtos/create-admin-user.dto';
import { UpdateUserRolesDto } from '../dtos/update-user-roles.dto';
import { UpdateUserStatusDto } from '../dtos/update-user-status.dto';

@Controller('admin/users')
@ApiTags('Admin Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminUsersController {
    constructor(private readonly adminUsersService: AdminUsersService) { }

    @Get()
    @ApiOperation({ summary: 'Get users for admin management' })
    @ApiOkResponse({ description: 'Paginated admin user list' })
    getUsers(@Query() query: AdminUserQueryDto) {
        return this.adminUsersService.getUsers(query);
    }

    @Post()
    @ApiOperation({ summary: 'Create a user from admin portal' })
    @ApiCreatedResponse({ description: 'User created by admin' })
    createUser(@Body() dto: CreateAdminUserDto) {
        return this.adminUsersService.createUser(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user detail for admin management' })
    @ApiOkResponse({ description: 'Admin user detail' })
    getUserDetail(@Param('id') userId: string) {
        return this.adminUsersService.getUserDetail(userId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update user status from admin portal' })
    @ApiOkResponse({ description: 'Updated user status' })
    updateStatus(
        @Req() req: any,
        @Param('id') userId: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.adminUsersService.updateStatus(userId, req.user.sub, dto);
    }

    @Patch(':id/roles')
    @ApiOperation({ summary: 'Update user roles from admin portal' })
    @ApiOkResponse({ description: 'Updated user roles' })
    updateRoles(
        @Req() req: any,
        @Param('id') userId: string,
        @Body() dto: UpdateUserRolesDto,
    ) {
        return this.adminUsersService.updateRoles(userId, req.user.sub, dto);
    }
}
