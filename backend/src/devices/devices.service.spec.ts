import { EventEmitter2 } from '@nestjs/event-emitter';
import { DevicesService } from './devices.service';
import { DOMAIN_EVENTS } from '../common/events';

describe('DevicesService (in-memory)', () => {
  let emitter: { emit: jest.Mock };
  let service: DevicesService;

  beforeEach(() => {
    emitter = { emit: jest.fn() };
    service = new DevicesService(emitter as unknown as EventEmitter2);
    service.onModuleInit(); // seed
  });

  it('seeds exactly 15 devices (6 fans, 9 lights), all OFF', () => {
    const all = service.getAll();
    expect(all).toHaveLength(15);
    expect(all.filter((d) => d.type === 'fan')).toHaveLength(6);
    expect(all.filter((d) => d.type === 'light')).toHaveLength(9);
    expect(all.every((d) => d.status === 'off')).toBe(true);
  });

  it('gives each room 2 fans and 3 lights', () => {
    for (const room of ['drawing', 'work1', 'work2'] as const) {
      const inRoom = service.getByRoom(room);
      expect(inRoom).toHaveLength(5);
      expect(inRoom.filter((d) => d.type === 'fan')).toHaveLength(2);
      expect(inRoom.filter((d) => d.type === 'light')).toHaveLength(3);
    }
  });

  describe('setStatus — actual change', () => {
    it('updates status + lastChanged and emits device.updated', async () => {
      const before = service.getById('drawing-fan-1');
      await new Promise((r) => setTimeout(r, 2));

      const result = service.setStatus('drawing-fan-1', 'on', 'manual');
      expect(result.status).toBe('on');
      expect(new Date(result.lastChanged).getTime()).toBeGreaterThan(
        new Date(before.lastChanged).getTime(),
      );

      const events = emitter.emit.mock.calls.map((c) => c[0]);
      expect(events).toContain(DOMAIN_EVENTS.DEVICE_UPDATED);
      const payload = emitter.emit.mock.calls.find(
        (c) => c[0] === DOMAIN_EVENTS.DEVICE_UPDATED,
      )![1];
      expect(payload).toMatchObject({
        previousStatus: 'off',
        source: 'manual',
      });
    });
  });

  describe('setStatus — unchanged status', () => {
    it('does not mutate lastChanged or emit any event', () => {
      const before = service.getById('drawing-fan-1'); // OFF
      const result = service.setStatus('drawing-fan-1', 'off', 'manual');
      expect(result.lastChanged).toBe(before.lastChanged);
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  it('toggleStatus flips OFF -> ON', () => {
    expect(service.toggleStatus('work1-light-2', 'simulator').status).toBe(
      'on',
    );
  });

  it('throws on unknown device and invalid room', () => {
    expect(() => service.getById('nope')).toThrow();
    expect(() => service.getByRoom('kitchen' as never)).toThrow();
  });

  describe('summaries reflect current in-memory state', () => {
    it('reports room and office totals', () => {
      service.setStatus('work2-fan-1', 'on', 'manual'); // 60 W
      service.setStatus('work2-light-1', 'on', 'manual'); // 15 W

      const room = service.getRoomSummary('work2');
      expect(room.watts).toBe(75);
      expect(room.activeFans).toBe(1);
      expect(room.activeLights).toBe(1);
      expect(room.totalFans).toBe(2);
      expect(room.totalLights).toBe(3);

      const office = service.getOfficeSummary();
      expect(office.totalWatts).toBe(75);
      expect(office.totalDevices).toBe(15);
    });
  });
});
