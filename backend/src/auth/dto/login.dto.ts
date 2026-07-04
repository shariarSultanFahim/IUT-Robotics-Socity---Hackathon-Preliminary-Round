import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', format: 'email' })
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  @ApiProperty({ example: 'change-me', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
