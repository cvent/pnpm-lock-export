import { ArgumentParser } from 'argparse';
import { writePackageLockV1, writeYarnLockV1 } from '..';
import { version, description } from '../../package.json';

(async () => {
  const parser = new ArgumentParser({ description });
  parser.add_argument('-v', '--version', { action: 'version', version });
  parser.add_argument('--schema', {
    choices: ['package-lock.json@v1', 'yarn.lock@v1'],
    default: 'package-lock.json@v1'
  });
  const args = parser.parse_args();

  switch(args['schema']) {
    case 'package-lock.json@v1': {
      await writePackageLockV1(process.cwd());
      break;
    }
    case 'yarn.lock@v1': {
      await writeYarnLockV1(process.cwd());
      break;
    }
    default: {
      throw new Error(`Invalid schema: ${args['schema']}`);
    }
  }
})().catch(e => {
  console.error(e);
  process.exit(1)
});
