import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import {
  AuthUser,
  JwtPayload,
  UserView,
  toAuthUser,
  toUserView,
} from './auth.types';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  /** Verify credentials with a generic error (no user-enumeration). */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    const ok =
      user &&
      user.active &&
      (await bcrypt.compare(password, user.passwordHash));
    if (!ok || !user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  /** Rotate a refresh token: validate, revoke the old session, issue a new one. */
  async refresh(rawRefreshToken: string | undefined): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.user.active
    ) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Rotate: revoke the presented session, then issue a fresh one.
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(session.user);
  }

  /** Revoke the presented refresh session (idempotent). */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<UserView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return toUserView(user);
  }

  private async issueSession(user: User): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: this.tokenService.hashRefreshToken(refreshToken),
        expiresAt: this.tokenService.refreshExpiryDate(),
      },
    });

    return { accessToken, refreshToken, user: toUserView(user) };
  }

  /** Exposed for tests/other callers that need the AuthUser shape. */
  toAuthUser(user: User): AuthUser {
    return toAuthUser(user);
  }
}
