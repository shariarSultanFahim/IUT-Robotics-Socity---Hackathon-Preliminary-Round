import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { InMemoryPrisma } from '../testing/in-memory-prisma';
import { PrismaService } from '../database/prisma.service';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL_DAYS: 7,
    ...overrides,
  };
  return {
    get: (key: string, def?: unknown) => (key in values ? values[key] : def),
  } as unknown as ConfigService;
}

describe('AuthService', () => {
  let prisma: InMemoryPrisma;
  let tokens: TokenService;
  let service: AuthService;

  async function seedUser(
    email: string,
    password: string,
    role: Role = Role.VIEWER,
    active = true,
  ) {
    const passwordHash = await AuthService.hashPassword(password);
    return prisma.user.create({
      data: { email, name: 'Test', role, active, passwordHash },
    });
  }

  beforeEach(() => {
    prisma = new InMemoryPrisma();
    tokens = new TokenService(new JwtService({}), makeConfig());
    service = new AuthService(prisma as unknown as PrismaService, tokens);
  });

  it('hashes passwords (never stores plaintext) and verifies them', async () => {
    const hash = await AuthService.hashPassword('supersecret1');
    expect(hash).not.toContain('supersecret1');
    expect(hash.startsWith('$2')).toBe(true);
  });

  describe('login', () => {
    it('succeeds with valid credentials and issues tokens + a session', async () => {
      await seedUser('admin@example.com', 'password123', Role.ADMIN);
      const result = await service.login('admin@example.com', 'password123');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.role).toBe(Role.ADMIN);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(prisma.refreshSession.rows).toHaveLength(1);
      // the access token verifies and carries the role
      expect(tokens.verifyAccessToken(result.accessToken).role).toBe(
        Role.ADMIN,
      );
    });

    it('is case-insensitive on email', async () => {
      await seedUser('admin@example.com', 'password123');
      const result = await service.login('ADMIN@Example.com', 'password123');
      expect(result.accessToken).toBeTruthy();
    });

    it('rejects a wrong password with a generic error', async () => {
      await seedUser('admin@example.com', 'password123');
      await expect(
        service.login('admin@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email with the same generic error', async () => {
      await expect(
        service.login('nobody@example.com', 'password123'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects an inactive user', async () => {
      await seedUser('gone@example.com', 'password123', Role.VIEWER, false);
      await expect(
        service.login('gone@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh (rotation)', () => {
    it('rotates the refresh token and revokes the old session', async () => {
      await seedUser('admin@example.com', 'password123');
      const first = await service.login('admin@example.com', 'password123');

      const second = await service.refresh(first.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(second.accessToken).toBeTruthy();

      // old session revoked, new session active
      const active = prisma.refreshSession.rows.filter((s) => !s.revokedAt);
      expect(active).toHaveLength(1);
    });

    it('rejects a reused (already-rotated) refresh token', async () => {
      await seedUser('admin@example.com', 'password123');
      const first = await service.login('admin@example.com', 'password123');
      await service.refresh(first.refreshToken);

      await expect(service.refresh(first.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired session', async () => {
      await seedUser('admin@example.com', 'password123');
      const first = await service.login('admin@example.com', 'password123');
      // force the stored session to be expired
      prisma.refreshSession.rows[0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.refresh(first.refreshToken)).rejects.toThrow();
    });

    it('rejects a missing refresh token', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the presented session (idempotent)', async () => {
      await seedUser('admin@example.com', 'password123');
      const first = await service.login('admin@example.com', 'password123');
      await service.logout(first.refreshToken);
      expect(prisma.refreshSession.rows[0].revokedAt).not.toBeNull();
      // the revoked token can no longer refresh
      await expect(service.refresh(first.refreshToken)).rejects.toThrow();
      // logging out again is a no-op
      await expect(service.logout(first.refreshToken)).resolves.toBeUndefined();
    });
  });

  describe('me', () => {
    it('returns the current user without the password hash', async () => {
      const user = await seedUser('viewer@example.com', 'password123');
      const view = await service.me(user.id);
      expect(view.email).toBe('viewer@example.com');
      expect((view as any).passwordHash).toBeUndefined();
    });
  });
});
