import { ApiProperty } from '@nestjs/swagger';

export class RoomBreakdownDto {
  @ApiProperty({ example: 75 })
  drawing!: number;

  @ApiProperty({ example: 60 })
  work1!: number;

  @ApiProperty({ example: 90 })
  work2!: number;
}

export class UsageResponseDto {
  @ApiProperty({
    example: 225,
    description: 'Sum of watts for all ON devices.',
  })
  currentWatts!: number;

  @ApiProperty({
    example: 1.4325,
    description: 'kWh consumed today, integrated from persisted snapshots.',
  })
  todayKwh!: number;

  @ApiProperty({ type: RoomBreakdownDto })
  roomBreakdown!: RoomBreakdownDto;

  @ApiProperty({ example: '2026-07-03T10:30:00.000Z' })
  calculatedAt!: string;
}
