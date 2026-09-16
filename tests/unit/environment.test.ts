import { describe, expect, it } from 'vitest';

import { ConfigurationError, loadConfig } from '../../src/config/environment.js';

const createValidEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  PORT: '3000',
  TZ: 'UTC',
  LOG_LEVEL: 'silent',
  DB_HOST: 'mysql',
  DB_PORT: '3306',
  DB_NAME: 'iconext_backend',
  DB_USER: 'iconext_app',
  DB_PASSWORD: 'test-only-password',
  DB_CONNECT_MAX_ATTEMPTS: '3',
  DB_CONNECT_RETRY_MS: '10',
});

describe('loadConfig', () => {
  it('returns typed configuration from valid environment values', () => {
    const config = loadConfig(createValidEnvironment());

    expect(config.port).toBe(3000);
    expect(config.database.host).toBe('mysql');
    expect(config.database.port).toBe(3306);
    expect(config.timezone).toBe('UTC');
  });

  it('fails fast and names missing fields without exposing values', () => {
    const environment = createValidEnvironment();
    const secret = environment.DB_PASSWORD;
    delete environment.DB_HOST;

    expect(() => loadConfig(environment)).toThrow(ConfigurationError);

    try {
      loadConfig(environment);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).toContain('DB_HOST');
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('rejects non-integer environment numbers', () => {
    const environment = createValidEnvironment();
    environment.PORT = '3000.5';

    expect(() => loadConfig(environment)).toThrow(ConfigurationError);
  });
});
