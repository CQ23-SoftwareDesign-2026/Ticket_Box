import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { USER_STATUSES, UserStatus } from './admin-user-query.dto';

export class CreateAdminUserDto {
    @ApiProperty({ example: 'checker@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password!: string;

    @ApiProperty({ example: 'Nguyen Van Checker' })
    @IsString()
    @IsNotEmpty()
    full_name!: string;

    @ApiPropertyOptional({ enum: USER_STATUSES, default: 'ACTIVE' })
    @IsIn(USER_STATUSES)
    @IsOptional()
    status?: UserStatus;

    @ApiProperty({ example: ['Checker'] })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roles!: string[];
}
