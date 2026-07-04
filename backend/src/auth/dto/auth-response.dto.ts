import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'clx0user123' })
  id!: string;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;

  @ApiProperty({ example: 'Office Admin' })
  name!: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role!: Role;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-07-03T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-03T10:00:00.000Z' })
  updatedAt!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Short-lived access token (store in memory, send as Bearer).',
  })
  accessToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
