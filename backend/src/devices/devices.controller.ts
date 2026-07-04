import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DevicesService } from './devices.service';
import { DeviceQueryDto } from './dto/device-query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { DeviceView } from './devices.types';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all devices, optionally filtered by room' })
  @ApiOkResponse({ type: [DeviceResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid room value' })
  async list(@Query() query: DeviceQueryDto): Promise<DeviceView[]> {
    if (query.room) {
      return this.devicesService.getByRoom(query.room);
    }
    return this.devicesService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single device by id' })
  @ApiParam({ name: 'id', example: 'drawing-fan-1' })
  @ApiOkResponse({ type: DeviceResponseDto })
  @ApiNotFoundResponse({ description: 'Device not found' })
  async getOne(@Param('id') id: string): Promise<DeviceView> {
    return this.devicesService.getById(id);
  }

  /**
   * SIMULATION / DEMO CONTROL ONLY.
   * Manually set a device status. Runs the exact same transactional flow as
   * the simulator: creates history, writes a power snapshot and emits the same
   * device.updated / usage.updated / history.invalidate events.
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Manually set a device status (simulation control)',
    description:
      'ADMIN-only demo/simulation control. Runs the same transactional flow as the simulator and emits device:update, usage:update and history:invalidate.',
  })
  @ApiParam({ name: 'id', example: 'drawing-fan-1' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiOkResponse({ type: DeviceResponseDto, description: 'The updated device' })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  @ApiNotFoundResponse({ description: 'Device not found' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
  ): Promise<DeviceView> {
    return this.devicesService.setStatus(id, body.status, 'manual');
  }
}
