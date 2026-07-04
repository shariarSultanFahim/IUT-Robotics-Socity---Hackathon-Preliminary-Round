import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const OFFICE_HOURS_MODES = ['auto', 'open', 'closed'] as const;
export type OfficeHoursModeDto = (typeof OFFICE_HOURS_MODES)[number];

export class SetOfficeHoursDto {
  @ApiProperty({
    enum: OFFICE_HOURS_MODES,
    example: 'closed',
    description:
      "'auto' = real clock, 'open' = force office hours, 'closed' = force after hours.",
  })
  @IsIn(OFFICE_HOURS_MODES as unknown as string[], {
    message: `mode must be one of: ${OFFICE_HOURS_MODES.join(', ')}`,
  })
  mode!: OfficeHoursModeDto;
}

export class OfficeHoursStateDto {
  @ApiProperty({ enum: OFFICE_HOURS_MODES, example: 'auto' })
  mode!: OfficeHoursModeDto;

  @ApiProperty({ example: true })
  withinOfficeHours!: boolean;

  @ApiProperty({ example: 9 })
  startHour!: number;

  @ApiProperty({ example: 17 })
  endHour!: number;

  @ApiProperty({ example: 'Asia/Dhaka' })
  timezone!: string;
}
