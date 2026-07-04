import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertResponseDto } from './dto/alert-response.dto';
import { AlertView } from './alerts.types';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('api/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Currently active alerts (in-memory)' })
  @ApiOkResponse({ type: [AlertResponseDto] })
  getActive(): AlertView[] {
    return this.alertsService.getActiveAlerts();
  }
}
