import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * One reusable database module. Global so every feature module shares the
 * single PrismaService instance instead of creating its own Prisma client.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
