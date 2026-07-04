import { Role, User } from '@prisma/client';

/** Signed into the access JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

/** Attached to the request / socket after authentication. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Public user shape (never includes passwordHash). */
export interface UserView {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
