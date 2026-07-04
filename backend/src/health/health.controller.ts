import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discord: DiscordService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe (no secrets exposed)' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check() {
    const dbConnected = await this.prisma.isHealthy();
    return {
      status: dbConnected ? 'ok' : 'degraded',
      database: { connected: dbConnected },
      discord: { ready: this.discord.isReady() },
      timestamp: new Date().toISOString(),
    };
  }
}
