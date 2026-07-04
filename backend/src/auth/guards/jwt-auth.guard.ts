import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../auth.types';

/**
 * Global guard: requires a valid Bearer access token unless the route is
 * marked @Public(). On success it attaches the AuthUser to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = this.tokenService.verifyAccessToken(token);
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    (request as Request & { user: AuthUser }).user = user;
    return true;
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
