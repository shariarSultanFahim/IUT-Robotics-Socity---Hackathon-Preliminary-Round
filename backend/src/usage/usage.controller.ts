import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { UsageResponseDto } from './dto/usage-response.dto';
import { UsageSnapshot } from './usage.types';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('api/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({
    summary: 'Current office watts, room breakdown and today’s persisted kWh',
  })
  @ApiOkResponse({ type: UsageResponseDto })
  async getUsage(): Promise<UsageSnapshot> {
    return this.usageService.getUsageSnapshot();
  }
}
