const DISPOSABLE_DATABASE_CONTEXT = 'disposable';

export const isDisposableDatabaseTestContext = (
  environment: Readonly<NodeJS.ProcessEnv>,
): boolean =>
  environment.NODE_ENV === 'test' &&
  environment.DB_TEST_CONTEXT === DISPOSABLE_DATABASE_CONTEXT;
