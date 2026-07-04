import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Idempotent auth seed.
 *
 * PostgreSQL now stores ONLY authentication data, so the seed just upserts one
 * ADMIN + one VIEWER user from environment variables (existing users' passwords
 * are updated to the configured value — safe to re-run). Simulated devices,
 * usage and alerts live in backend memory and need no seeding.
 *
 * If the SEED_* variables are absent, user seeding is skipped with a warning.
 */
const prisma = new PrismaClient();

async function upsertUser(
  role: Role,
  name: string | undefined,
  email: string | undefined,
  password: string | undefined,
) {
  if (!email || !password) {
    console.warn(
      `Skipping ${role} seed — set SEED_${role}_EMAIL and SEED_${role}_PASSWORD.`,
    );
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    create: {
      email: email.toLowerCase().trim(),
      name: name ?? role,
      role,
      passwordHash,
      active: true,
    },
    update: { name: name ?? role, role, passwordHash, active: true },
  });
  console.log(`Seeded ${role} user: ${email}`);
}

async function main() {
  console.log('Seeding auth users (idempotent)...');
  await upsertUser(
    Role.ADMIN,
    process.env.SEED_ADMIN_NAME ?? 'Office Admin',
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_ADMIN_PASSWORD,
  );
  await upsertUser(
    Role.VIEWER,
    process.env.SEED_VIEWER_NAME ?? 'Office Viewer',
    process.env.SEED_VIEWER_EMAIL,
    process.env.SEED_VIEWER_PASSWORD,
  );
  const count = await prisma.user.count();
  console.log(`Seed complete. User rows: ${count}`);
}

main()
  .catch((error) => {
    console.error(
      'Seed failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
