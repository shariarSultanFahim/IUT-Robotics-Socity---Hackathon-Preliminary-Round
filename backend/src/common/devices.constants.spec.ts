import {
  DEVICE_SEEDS,
  EXPECTED_DEVICE_COUNT,
  FAN_WATTAGE,
  LIGHT_WATTAGE,
  resolveRoomAlias,
} from './devices.constants';

describe('device constants', () => {
  it('defines exactly 15 devices', () => {
    expect(DEVICE_SEEDS).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(EXPECTED_DEVICE_COUNT).toBe(15);
  });

  it('has no duplicate ids', () => {
    const ids = DEVICE_SEEDS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly 6 fans and 9 lights', () => {
    expect(DEVICE_SEEDS.filter((d) => d.type === 'fan')).toHaveLength(6);
    expect(DEVICE_SEEDS.filter((d) => d.type === 'light')).toHaveLength(9);
  });

  it('gives each room 2 fans and 3 lights', () => {
    for (const room of ['drawing', 'work1', 'work2'] as const) {
      const inRoom = DEVICE_SEEDS.filter((d) => d.room === room);
      expect(inRoom).toHaveLength(5);
      expect(inRoom.filter((d) => d.type === 'fan')).toHaveLength(2);
      expect(inRoom.filter((d) => d.type === 'light')).toHaveLength(3);
    }
  });

  it('uses correct wattages (fan 60 W, light 15 W)', () => {
    for (const d of DEVICE_SEEDS) {
      if (d.type === 'fan') expect(d.wattage).toBe(FAN_WATTAGE);
      if (d.type === 'light') expect(d.wattage).toBe(LIGHT_WATTAGE);
    }
    expect(FAN_WATTAGE).toBe(60);
    expect(LIGHT_WATTAGE).toBe(15);
  });

  it('uses the exact predictable device ids', () => {
    expect(DEVICE_SEEDS.map((d) => d.id)).toEqual([
      'drawing-fan-1',
      'drawing-fan-2',
      'drawing-light-1',
      'drawing-light-2',
      'drawing-light-3',
      'work1-fan-1',
      'work1-fan-2',
      'work1-light-1',
      'work1-light-2',
      'work1-light-3',
      'work2-fan-1',
      'work2-fan-2',
      'work2-light-1',
      'work2-light-2',
      'work2-light-3',
    ]);
  });

  describe('resolveRoomAlias', () => {
    it('resolves canonical ids and friendly aliases (case-insensitive)', () => {
      expect(resolveRoomAlias('drawing')).toBe('drawing');
      expect(resolveRoomAlias('Drawing Room')).toBe('drawing');
      expect(resolveRoomAlias('work1')).toBe('work1');
      expect(resolveRoomAlias('WORK ROOM 1')).toBe('work1');
      expect(resolveRoomAlias('work2')).toBe('work2');
      expect(resolveRoomAlias(' work room 2 ')).toBe('work2');
    });

    it('returns null for unknown rooms', () => {
      expect(resolveRoomAlias('kitchen')).toBeNull();
      expect(resolveRoomAlias('')).toBeNull();
    });
  });
});
