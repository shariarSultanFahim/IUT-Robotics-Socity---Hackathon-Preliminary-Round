import { validateEnv } from './env.validation';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

describe('validateEnv', () => {
  it('applies safe defaults', () => {
    const env = validateEnv({ ...base });
    expect(env.PORT).toBe(3001);
    expect(env.OFFICE_TIMEZONE).toBe('Asia/Dhaka');
    expect(env.OFFICE_START_HOUR).toBe(9);
    expect(env.OFFICE_END_HOUR).toBe(17);
    expect(env.SIMULATOR_ENABLED).toBe(true);
    expect(env.DISCORD_COMMAND_PREFIX).toBe('!');
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('coerces numeric strings and booleans', () => {
    const env = validateEnv({
      ...base,
      PORT: '4000',
      SIMULATOR_ENABLED: 'false',
      SIMULATOR_INTERVAL_MS: '5000',
    });
    expect(env.PORT).toBe(4000);
    expect(env.SIMULATOR_ENABLED).toBe(false);
    expect(env.SIMULATOR_INTERVAL_MS).toBe(5000);
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnv({ ...base, PORT: '70000' })).toThrow(
      /environment/i,
    );
  });

  it('rejects OFFICE_END_HOUR <= OFFICE_START_HOUR', () => {
    expect(() =>
      validateEnv({ ...base, OFFICE_START_HOUR: '17', OFFICE_END_HOUR: '9' }),
    ).toThrow(/OFFICE_END_HOUR/);
  });

  it('does not leak secret values in error messages', () => {
    try {
      validateEnv({ PORT: '-1', DATABASE_URL: 'super-secret-url' });
      fail('should have thrown');
    } catch (e) {
      expect((e as Error).message).not.toContain('super-secret-url');
    }
  });
});
