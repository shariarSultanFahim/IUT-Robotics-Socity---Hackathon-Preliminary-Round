import { ApiProperty } from '@nestjs/swagger';

/** API-facing device shape (lowercase transformed values). */
export class DeviceResponseDto {
  @ApiProperty({ example: 'drawing-fan-1' })
  id!: string;

  @ApiProperty({ enum: ['fan', 'light'], example: 'fan' })
  type!: 'fan' | 'light';

  @ApiProperty({ enum: ['drawing', 'work1', 'work2'], example: 'drawing' })
  room!: 'drawing' | 'work1' | 'work2';

  @ApiProperty({ example: 'Fan 1' })
  label!: string;

  @ApiProperty({ enum: ['on', 'off'], example: 'off' })
  status!: 'on' | 'off';

  @ApiProperty({ example: 60, description: 'Watts drawn while ON.' })
  wattage!: number;

  @ApiProperty({
    example: '2026-07-03T10:00:00.000Z',
    description: 'ISO-8601 timestamp of the last status change.',
  })
  lastChanged!: string;
}
