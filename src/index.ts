// tslint:disable object-literal-sort-keys
import { readWantedLockfile } from '@pnpm/lockfile-file';
import { ResolvedDependencies } from '@pnpm/lockfile-types';
import { writeFile } from 'fs';
import { resolve } from 'path';
import { PackageLockRoot } from './packageLock';
import { parsePackageMap } from './parse';

const main = async (opts: { path?: string } = {}) => {
  const path = opts.path ? resolve(process.cwd(), opts.path) : process.cwd();

  const lock = await readWantedLockfile(path, {
    ignoreIncompatible: true
  });

  if (!lock) {
    throw new Error('pnpm lockfile not found');
  }
  // TODO: Warn if lockfile version greater than latest tested

  let rootDependencyFlatMap: ResolvedDependencies = {};
  for (const importer of Object.values(lock.importers)) {
    rootDependencyFlatMap = {
      ...rootDependencyFlatMap,
      ...(importer.dependencies || {})
    };
    rootDependencyFlatMap = {
      ...rootDependencyFlatMap,
      ...(importer.devDependencies || {})
    };
    rootDependencyFlatMap = {
      ...rootDependencyFlatMap,
      ...(importer.optionalDependencies || {})
    };
  }

  try {
    const dependencies = parsePackageMap(
      rootDependencyFlatMap,
      lock.packages!,
      {}
    );

    const packageLock: PackageLockRoot = {
      name: 'testing uuu',
      preserveSymlinks: false,
      version: '0.0.1',
      lockfileVersion: 1,
      dependencies
    };

    await new Promise((res, rej) => {
      writeFile(
        resolve(path, 'package-lock.json'),
        JSON.stringify(packageLock),
        err => {
          if (err) rej(err);
          res();
        }
      );
    });
  } catch (e) {
    process.exit(1);
  }
};

export default main;
