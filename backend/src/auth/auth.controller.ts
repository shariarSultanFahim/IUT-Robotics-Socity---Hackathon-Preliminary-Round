import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './auth.types';
import { CONFIG_KEYS } from '../config/configuration';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with email + password' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the refresh cookie, get a new access token',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const raw = this.readRefreshCookie(req);
    const result = await this.authService.refresh(raw);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiOkResponse({ description: '{ success: true }' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.authService.me(user.id);
  }

  // --- cookie helpers ---

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_COOKIE];
  }

  private cookieOptions() {
    const secure = this.config.get<boolean>(
      CONFIG_KEYS.AUTH_COOKIE_SECURE,
      false,
    );
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>(
      CONFIG_KEYS.AUTH_COOKIE_SAME_SITE,
      'lax',
    );
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: REFRESH_COOKIE_PATH,
    } as const;
  }

  private setRefreshCookie(res: Response, token: string): void {
    const days = this.config.get<number>(CONFIG_KEYS.JWT_REFRESH_TTL_DAYS, 7);
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}
