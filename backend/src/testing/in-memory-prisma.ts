import { Prisma, RefreshSession, Role, User } from '@prisma/client';

/**
 * A tiny in-memory stand-in for PrismaService used by auth unit tests. Postgres
 * now stores only authentication data, so this supports just the `user` and
 * `refreshSession` models with the subset of operations the auth code uses.
 */

type Where = Record<string, any>;

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function matchField(value: any, condition: any): boolean {
  if (
    condition !== null &&
    typeof condition === 'object' &&
    !(condition instanceof Date)
  ) {
    for (const [op, operand] of Object.entries(condition)) {
      const v = value instanceof Date ? value.getTime() : value;
      const o = operand instanceof Date ? operand.getTime() : operand;
      switch (op) {
        case 'gt':
          if (!(v > (o as number))) return false;
          break;
        case 'gte':
          if (!(v >= (o as number))) return false;
          break;
        case 'lt':
          if (!(v < (o as number))) return false;
          break;
        case 'lte':
          if (!(v <= (o as number))) return false;
          break;
        case 'equals':
          if (v !== o) return false;
          break;
        case 'not':
          if (v === o) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }
  return value === condition;
}

function matchWhere(record: any, where?: Where): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (!matchField(record[key], condition)) return false;
  }
  return true;
}

class Collection<T extends { id: string }> {
  hydrate?: (row: any, args: any) => void;

  constructor(
    public rows: T[],
    private readonly idPrefix: string,
    private readonly defaults: () => Partial<T>,
    private readonly beforeCreate?: (data: any, existing: T[]) => void,
  ) {}

  findUnique(args: {
    where: Record<string, any>;
    include?: Record<string, any>;
  }): Promise<T | null> {
    const found = this.rows.find((r) => matchWhere(r, args.where));
    if (!found) return Promise.resolve(null);
    const row = { ...found };
    if (this.hydrate) this.hydrate(row, args);
    return Promise.resolve(row);
  }

  count(args?: { where?: Where }): Promise<number> {
    return Promise.resolve(
      this.rows.filter((r) => matchWhere(r, args?.where)).length,
    );
  }

  create(args: { data: any }): Promise<T> {
    if (this.beforeCreate) this.beforeCreate(args.data, this.rows);
    const now = new Date();
    const row = {
      id: args.data.id ?? genId(this.idPrefix),
      ...this.defaults(),
      createdAt: now,
      updatedAt: now,
      ...args.data,
    } as T;
    this.rows.push(row);
    return Promise.resolve({ ...row });
  }

  update(args: { where: { id: string }; data: any }): Promise<T> {
    const idx = this.rows.findIndex((r) => r.id === args.where.id);
    if (idx === -1) throw new Error(`Record ${args.where.id} not found`);
    this.rows[idx] = { ...this.rows[idx], ...args.data, updatedAt: new Date() };
    return Promise.resolve({ ...this.rows[idx] });
  }

  updateMany(args: { where?: Where; data: any }): Promise<{ count: number }> {
    let count = 0;
    this.rows = this.rows.map((r) => {
      if (matchWhere(r, args.where)) {
        count += 1;
        return { ...r, ...args.data, updatedAt: new Date() };
      }
      return r;
    });
    return Promise.resolve({ count });
  }
}

export class InMemoryPrisma {
  user: Collection<User>;
  refreshSession: Collection<RefreshSession>;

  constructor() {
    this.user = new Collection<User>(
      [],
      'user',
      () => ({ role: Role.VIEWER, active: true }),
      (data, existing) => {
        if (data.email && existing.some((u) => u.email === data.email)) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`email`)',
            { code: 'P2002', clientVersion: 'test' },
          );
        }
      },
    );
    this.refreshSession = new Collection<RefreshSession>([], 'sess', () => ({
      revokedAt: null,
      createdAt: new Date(),
    }));
    this.refreshSession.hydrate = (row: any, args: any) => {
      if (args?.include?.user) {
        row.user = this.user.rows.find((u) => u.id === row.userId) ?? null;
      }
    };
  }

  async $transaction(arg: any): Promise<any> {
    if (typeof arg === 'function') return arg(this);
    return Promise.all(arg);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
