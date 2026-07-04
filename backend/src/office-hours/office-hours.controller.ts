import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OfficeHoursService } from './office-hours.service';
import { OfficeHoursStateDto, SetOfficeHoursDto } from './dto/office-hours.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { OfficeHoursState } from '../common/events';

@ApiTags('Office Hours')
@ApiBearerAuth()
@Controller('api/office-hours')
export class OfficeHoursController {
  constructor(private readonly officeHoursService: OfficeHoursService) {}

  @Get()
  @ApiOperation({ summary: 'Current office-hours mode + whether within hours' })
  @ApiOkResponse({ type: OfficeHoursStateDto })
  getState(): OfficeHoursState {
    return this.officeHoursService.getState();
  }

  @Patch()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Set the office-hours override (demo control)',
    description:
      'Switch between auto / office hours / after hours. Re-evaluates alerts immediately.',
  })
  @ApiOkResponse({ type: OfficeHoursStateDto })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  setMode(@Body() dto: SetOfficeHoursDto): OfficeHoursState {
    return this.officeHoursService.setMode(dto.mode);
  }
}
