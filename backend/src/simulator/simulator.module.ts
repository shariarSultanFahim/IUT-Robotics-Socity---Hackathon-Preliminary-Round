import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  providers: [SimulatorService],
})
export class SimulatorModule {}
