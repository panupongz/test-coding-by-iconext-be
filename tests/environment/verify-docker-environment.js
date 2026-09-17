import { spawnSync } from 'node:child_process';
import process from 'node:process';

const projectName = `t009-${String(process.pid)}-${String(Date.now())}`;
const composeEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(40_000 + (process.pid % 10_000)),
  LOG_LEVEL: 'silent',
  DB_NAME: 'iconext_t009',
  DB_USER: 'iconext_t009',
  DB_PASSWORD: 't009-local-password',
  DB_ROOT_PASSWORD: 't009-local-root-password',
  DB_CONNECT_MAX_ATTEMPTS: '240',
  DB_CONNECT_RETRY_MS: '250',
};
const composeArguments = ['compose', '--project-name', projectName];

const formatCommand = (arguments_) => `docker ${arguments_.join(' ')}`;

const runDocker = (arguments_, options = {}) => {
  const fullArguments = [...composeArguments, ...arguments_];
  const capture = options.capture ?? false;

  process.stdout.write(`> ${formatCommand(fullArguments)}\n`);
  const result = spawnSync('docker', fullArguments, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: composeEnvironment,
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = capture
      ? `\n${result.stdout ?? ''}${result.stderr ?? ''}`
      : '';
    throw new Error(
      `${formatCommand(fullArguments)} failed with exit code ${String(result.status)}${output}`,
    );
  }

  return capture ? (result.stdout ?? '').trim() : '';
};

const runDockerCli = (arguments_) => {
  process.stdout.write(`> docker ${arguments_.join(' ')}\n`);
  const result = spawnSync('docker', arguments_, {
    encoding: 'utf8',
    env: composeEnvironment,
    stdio: 'pipe',
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `docker ${arguments_.join(' ')} failed with exit code ${String(result.status)}\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    );
  }

  return (result.stdout ?? '').trim();
};

const runDockerForStatus = (arguments_) => {
  const fullArguments = [...composeArguments, ...arguments_];

  process.stdout.write(`> ${formatCommand(fullArguments)}\n`);
  const result = spawnSync('docker', fullArguments, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: composeEnvironment,
    stdio: 'pipe',
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  return result.status;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const getContainerState = (service) => {
  const containerId = runDocker(['ps', '-aq', service], { capture: true });

  if (containerId.length === 0) {
    return undefined;
  }

  const state = runDockerCli([
    'inspect',
    '--format',
    '{{json .State}}',
    containerId,
  ]);

  return JSON.parse(state);
};

const waitForHealthy = async (service, timeoutMilliseconds = 120_000) => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const state = getContainerState(service);

    if (state?.Health?.Status === 'healthy') {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`${service} did not become healthy before the timeout`);
};

const queryScalar = (sql) =>
  runDocker(
    [
      'exec',
      '-T',
      'mysql',
      'sh',
      '-c',
      `MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE" --batch --skip-column-names --execute='${sql}'`,
    ],
    { capture: true },
  );

let failure;

try {
  const config = JSON.parse(
    runDocker(['config', '--format', 'json'], { capture: true }),
  );
  const serviceNames = Object.keys(config.services ?? {}).sort();

  assert(
    JSON.stringify(serviceNames) === JSON.stringify(['backend', 'mysql']),
    'Compose must define exactly backend and mysql services',
  );
  assert(
    config.services.backend.environment.DB_HOST === 'mysql',
    'Backend DB_HOST must use the mysql service name',
  );
  assert(
    /^mysql:8(?:\.|$)/u.test(config.services.mysql.image),
    'Compose must use a MySQL 8.x image',
  );
  assert(
    config.services.backend.depends_on.mysql.condition === 'service_healthy',
    'Backend must depend on MySQL health',
  );
  assert(
    config.services.mysql.healthcheck !== undefined,
    'MySQL must define a healthcheck',
  );
  assert(
    config.services.mysql.volumes.some(
      (volume) => volume.type === 'volume' && volume.target === '/var/lib/mysql',
    ),
    'MySQL data must use a named volume',
  );

  runDocker(['build', 'backend']);

  // Bypass depends_on deliberately: the HTTP listener must stay unavailable while
  // MySQL is withheld, then recover through the configured readiness retries.
  runDocker(['up', '-d', '--no-deps', 'backend']);
  await delay(2_000);
  assert(
    runDockerForStatus([
      'exec',
      '-T',
      'backend',
      'node',
      '-e',
      "const socket=require('node:net').connect(3000,'127.0.0.1');const fail=()=>process.exit(1);socket.setTimeout(1000,fail);socket.on('connect',()=>{socket.end();process.exit(0)});socket.on('error',fail)",
    ]) !== 0,
    'Backend opened its HTTP listener before MySQL was available',
  );

  runDocker(['up', '-d', 'mysql']);
  await waitForHealthy('mysql');
  await waitForHealthy('backend');

  runDocker(['exec', '-T', 'backend', 'npm', 'run', 'db:migrate']);
  runDocker(['exec', '-T', 'backend', 'npm', 'run', 'db:seed']);
  runDocker(['exec', '-T', 'backend', 'npm', 'run', 'db:seed']);
  assert(
    queryScalar('SELECT COUNT(*) FROM products;') === '5',
    'Container seed command did not preserve the exact five canonical products',
  );

  queryScalar(
    'INSERT INTO products (product_code,name,description,image,price) VALUES ("P997","T-009 persistence","Docker volume sentinel","/products/P997.jpg",1);',
  );
  runDocker(['up', '-d', '--force-recreate', '--no-deps', 'mysql']);
  await waitForHealthy('mysql');
  assert(
    queryScalar(
      'SELECT COUNT(*) FROM products WHERE product_code="P997" AND price=1;',
    ) === '1',
    'MySQL data did not survive container recreation with the named volume',
  );

  runDocker([
    'run',
    '--rm',
    '-e',
    'NODE_ENV=test',
    '-e',
    'DB_TEST_CONTEXT=disposable',
    'backend',
    'npm',
    'test',
  ]);

  process.stdout.write(
    'T-009 Docker environment verification passed: config, build, readiness recovery, health, service-name networking, container migration/seed/tests, and volume persistence.\n',
  );
} catch (error) {
  failure = error;
} finally {
  try {
    runDocker(['down', '--volumes', '--remove-orphans', '--rmi', 'local']);
  } catch (cleanupError) {
    if (failure === undefined) {
      failure = cleanupError;
    } else {
      process.stderr.write(`Cleanup also failed: ${String(cleanupError)}\n`);
    }
  }
}

if (failure !== undefined) {
  throw failure;
}
