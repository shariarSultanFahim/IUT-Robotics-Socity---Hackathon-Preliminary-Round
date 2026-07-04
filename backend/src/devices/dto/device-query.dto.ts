import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ROOM_IDS, RoomId } from '../../common/devices.constants';

export class DeviceQueryDto {
  @ApiPropertyOptional({
    description: 'Filter devices by room.',
    enum: ROOM_IDS as unknown as string[],
    example: 'drawing',
  })
  @IsOptional()
  @IsIn(ROOM_IDS as unknown as string[], {
    message: `room must be one of: ${ROOM_IDS.join(', ')}`,
  })
  room?: RoomId;
}
