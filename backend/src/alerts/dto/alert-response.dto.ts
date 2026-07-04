import { ApiProperty } from '@nestjs/swagger';

const ALERT_TYPES = ['AFTER_HOURS', 'ALL_DEVICES_ON_TOO_LONG'] as const;

export class AlertResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ enum: ALERT_TYPES, example: 'AFTER_HOURS' })
  type!: (typeof ALERT_TYPES)[number];

  @ApiProperty({
    nullable: true,
    enum: ['drawing', 'work1', 'work2'],
    example: 'work1',
  })
  room!: string | null;

  @ApiProperty({ nullable: true, example: 'work1-fan-1' })
  deviceId!: string | null;

  @ApiProperty({
    example: 'Fan 1 in Work Room 1 is ON outside office hours (09:00–17:00).',
  })
  message!: string;

  @ApiProperty({ example: '2026-07-03T20:00:00.000Z' })
  triggeredAt!: string;

  @ApiProperty({ nullable: true, example: null })
  resolvedAt!: string | null;

  @ApiProperty({ example: true })
  active!: boolean;
}
