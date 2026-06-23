import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdDto {
  @ApiProperty({ example: 'cmqotgog30005advvy6o3hauf', description: 'Unique identifier' })
  @IsString()
  id: string;
}
