import { ApiProperty } from '@nestjs/swagger';

class DatabaseHealthDto {
  @ApiProperty({ example: true })
  connected!: boolean;
}

class DiscordHealthDto {
  @ApiProperty({
    example: false,
    description: 'False when no bot token is set.',
  })
  ready!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: DatabaseHealthDto })
  database!: DatabaseHealthDto;

  @ApiProperty({ type: DiscordHealthDto })
  discord!: DiscordHealthDto;

  @ApiProperty({ example: '2026-07-03T10:30:00.000Z' })
  timestamp!: string;
}
