import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { USER_STATUSES, UserStatus } from './admin-user-query.dto';

export class UpdateUserStatusDto {
    @ApiProperty({ enum: USER_STATUSES })
    @IsIn(USER_STATUSES)
    status!: UserStatus;
}
