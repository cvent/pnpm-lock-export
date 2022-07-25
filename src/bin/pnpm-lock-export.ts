import { writeFile } from 'fs/promises';
import parseLock from '..';
import { ArgumentParser } from 'argparse';
import { version, description } from '../../package.json';

(async () => {
  const parser = new ArgumentParser({ description, add_help: true, exit_on_error: true });
  parser.add_argument('-v', '--version', { action: 'version', version });
  parser.parse_args();

  const lockfile = await parseLock(process.cwd());
  await writeFile('package-lock.json', JSON.stringify(lockfile, undefined, 2));
})().catch(e => {
  console.error(e);
  process.exit(1)
});
