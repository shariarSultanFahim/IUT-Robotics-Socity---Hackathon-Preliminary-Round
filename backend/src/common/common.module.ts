import { Global, Module } from '@nestjs/common';
import { ClockService } from './clock.service';

/**
 * Shared, cross-cutting providers (currently the injectable ClockService).
 * Global so any feature module can inject them without re-importing.
 */
@Global()
@Module({
  providers: [ClockService],
  exports: [ClockService],
})
export class CommonModule {}
