import { Cooldown } from './cooldown';

describe('Cooldown', () => {
  it('allows the first acquire and blocks repeats within the window', () => {
    const cd = new Cooldown(5 * 60 * 1000); // 5 min
    const t0 = 1_000_000;
    expect(cd.tryAcquire('after-hours:drawing-fan-1', t0)).toBe(true);
    // repeats within 5 minutes are blocked
    expect(cd.tryAcquire('after-hours:drawing-fan-1', t0 + 10_000)).toBe(false);
    expect(cd.tryAcquire('after-hours:drawing-fan-1', t0 + 4 * 60_000)).toBe(
      false,
    );
  });

  it('allows again once the window has fully elapsed', () => {
    const cd = new Cooldown(5 * 60 * 1000);
    const t0 = 1_000_000;
    expect(cd.tryAcquire('k', t0)).toBe(true);
    expect(cd.tryAcquire('k', t0 + 5 * 60_000)).toBe(true); // exactly 5 min later
    expect(cd.tryAcquire('k', t0 + 5 * 60_000 + 1)).toBe(false);
  });

  it('tracks keys independently', () => {
    const cd = new Cooldown(1000);
    expect(cd.tryAcquire('a', 0)).toBe(true);
    expect(cd.tryAcquire('b', 0)).toBe(true);
    expect(cd.tryAcquire('a', 500)).toBe(false);
    expect(cd.tryAcquire('b', 500)).toBe(false);
  });

  it('clear() lets a key acquire immediately again', () => {
    const cd = new Cooldown(1000);
    expect(cd.tryAcquire('a', 0)).toBe(true);
    expect(cd.tryAcquire('a', 100)).toBe(false);
    cd.clear('a');
    expect(cd.tryAcquire('a', 100)).toBe(true);
  });
});
