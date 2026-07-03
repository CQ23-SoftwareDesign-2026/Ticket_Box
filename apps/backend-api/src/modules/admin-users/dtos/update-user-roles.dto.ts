import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateUserRolesDto {
    @ApiProperty({ example: ['Audience', 'Checker'] })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roles!: string[];
}
