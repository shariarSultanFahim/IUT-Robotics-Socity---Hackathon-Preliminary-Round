import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function ctx(
  request: any,
  meta: Record<string, unknown> = {},
): {
  context: ExecutionContext;
  reflector: Reflector;
} {
  const reflector = {
    getAllAndOverride: (key: string) => meta[key],
  } as unknown as Reflector;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, reflector };
}

function makeTokens(): TokenService {
  const config = {
    get: (key: string, def?: unknown) =>
      key === 'JWT_ACCESS_SECRET'
        ? 'access'
        : key === 'JWT_REFRESH_SECRET'
          ? 'refresh'
          : def,
  } as unknown as ConfigService;
  return new TokenService(new JwtService({}), config);
}

describe('JwtAuthGuard', () => {
  const tokens = makeTokens();

  it('allows public routes without a token', () => {
    const { context, reflector } = ctx(
      { headers: {} },
      { [IS_PUBLIC_KEY]: true },
    );
    const guard = new JwtAuthGuard(reflector, tokens);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a missing token with 401', () => {
    const { context, reflector } = ctx({ headers: {} });
    const guard = new JwtAuthGuard(reflector, tokens);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an invalid token with 401', () => {
    const { context, reflector } = ctx({
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    const guard = new JwtAuthGuard(reflector, tokens);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('accepts a valid token and attaches the user', () => {
    const token = tokens.signAccessToken({
      sub: 'u1',
      email: 'a@b.com',
      name: 'A',
      role: Role.ADMIN,
    });
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const { context, reflector } = ctx(request);
    const guard = new JwtAuthGuard(reflector, tokens);
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject({ id: 'u1', role: Role.ADMIN });
  });
});

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const { context, reflector } = ctx({ user: { role: Role.VIEWER } });
    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('allows a matching role (ADMIN)', () => {
    const { context, reflector } = ctx(
      { user: { role: Role.ADMIN } },
      { [ROLES_KEY]: [Role.ADMIN] },
    );
    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('rejects an insufficient role (VIEWER on ADMIN route) with 403', () => {
    const { context, reflector } = ctx(
      { user: { role: Role.VIEWER } },
      { [ROLES_KEY]: [Role.ADMIN] },
    );
    expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
