import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  DEVICE_STATUSES,
  DeviceStatusId,
} from '../../common/devices.constants';

export class UpdateStatusDto {
  @ApiProperty({
    enum: DEVICE_STATUSES as unknown as string[],
    example: 'on',
    description: 'Desired device status.',
  })
  @IsIn(DEVICE_STATUSES as unknown as string[], {
    message: `status must be one of: ${DEVICE_STATUSES.join(', ')}`,
  })
  status!: DeviceStatusId;
}
