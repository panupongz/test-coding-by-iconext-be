import { z } from 'zod';

const numericEnvironmentValue = (minimum: number, maximum: number) =>
  z
    .string()
    .regex(/^\d+$/, 'must be a base-10 integer')
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(minimum).max(maximum));

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: numericEnvironmentValue(1, 65_535),
  TZ: z.literal('UTC'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  DB_HOST: z.string().trim().min(1),
  DB_PORT: numericEnvironmentValue(1, 65_535),
  DB_NAME: z.string().trim().min(1),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_CONNECT_MAX_ATTEMPTS: numericEnvironmentValue(1, 300),
  DB_CONNECT_RETRY_MS: numericEnvironmentValue(0, 60_000),
});

export type NodeEnvironment = z.infer<typeof environmentSchema>['NODE_ENV'];
export type LogLevel = z.infer<typeof environmentSchema>['LOG_LEVEL'];

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
}

export interface DatabaseReadinessConfig {
  readonly maxAttempts: number;
  readonly retryDelayMs: number;
}

export interface AppConfig {
  readonly nodeEnvironment: NodeEnvironment;
  readonly port: number;
  readonly timezone: 'UTC';
  readonly logLevel: LogLevel;
  readonly database: DatabaseConfig;
  readonly databaseReadiness: DatabaseReadinessConfig;
}

export class ConfigurationError extends Error {
  public constructor(invalidFields: readonly string[]) {
    super(`Invalid or missing environment variables: ${invalidFields.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsedEnvironment = environmentSchema.safeParse(environment);

  if (!parsedEnvironment.success) {
    const invalidFields = [
      ...new Set(
        parsedEnvironment.error.issues.map((issue) => String(issue.path[0] ?? 'environment')),
      ),
    ].sort();

    throw new ConfigurationError(invalidFields);
  }

  const values = parsedEnvironment.data;

  return Object.freeze({
    nodeEnvironment: values.NODE_ENV,
    port: values.PORT,
    timezone: values.TZ,
    logLevel: values.LOG_LEVEL,
    database: Object.freeze({
      host: values.DB_HOST,
      port: values.DB_PORT,
      name: values.DB_NAME,
      user: values.DB_USER,
      password: values.DB_PASSWORD,
    }),
    databaseReadiness: Object.freeze({
      maxAttempts: values.DB_CONNECT_MAX_ATTEMPTS,
      retryDelayMs: values.DB_CONNECT_RETRY_MS,
    }),
  });
};
