import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { CONFIG_KEYS } from '../config/configuration';
import { JwtPayload } from './auth.types';

/**
 * Signs/verifies short-lived access JWTs and mints opaque refresh tokens.
 *
 * Refresh tokens are high-entropy random strings; only their SHA-256 hash is
 * ever stored in PostgreSQL (deterministic hash so it can be looked up by the
 * unique `tokenHash`). If JWT secrets are not configured, a random per-process
 * secret is generated with a warning so the app still boots (tokens simply do
 * not survive a restart) — production must set real secrets.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret = this.resolveSecret(CONFIG_KEYS.JWT_ACCESS_SECRET);
    this.refreshSecret = this.resolveSecret(CONFIG_KEYS.JWT_REFRESH_SECRET);
  }

  private resolveSecret(key: string): string {
    const value = this.config.get<string>(key);
    if (value && value.length > 0) return value;
    this.logger.warn(
      `${key} is not set — using a random per-process secret. ` +
        'Tokens will be invalidated on restart. Set this in production.',
    );
    return randomBytes(48).toString('hex');
  }

  get accessTtl(): string {
    return this.config.get<string>(CONFIG_KEYS.JWT_ACCESS_TTL, '15m');
  }

  get refreshTtlDays(): number {
    return this.config.get<number>(CONFIG_KEYS.JWT_REFRESH_TTL_DAYS, 7);
  }

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.accessSecret,
      // jsonwebtoken accepts a duration string (e.g. "15m"); cast for its typing.
      expiresIn: this.accessTtl as unknown as number,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, { secret: this.accessSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /** A new opaque refresh token (raw value sent to the client cookie). */
  generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  /** Deterministic hash stored in the database (never the raw token). */
  hashRefreshToken(raw: string): string {
    return createHash('sha256')
      .update(`${raw}:${this.refreshSecret}`)
      .digest('hex');
  }

  refreshExpiryDate(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }
}
