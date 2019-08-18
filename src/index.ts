// tslint:disable object-literal-sort-keys
import { readWantedLockfile } from '@pnpm/lockfile-file';
import { ResolvedDependencies } from '@pnpm/lockfile-types';
import readPackageJson from '@pnpm/read-package-json';
import { writeFile } from 'fs';
import { resolve } from 'path';
import { PackageLockRoot } from './packageLock';
import { parsePackageMap } from './parse';
import { flatten } from './flatten';

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
  const dependencyKeys = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
  for (const importer of Object.values(lock.importers)) {
    for (const key of dependencyKeys) {
      if (importer[key]) rootDependencyFlatMap = { ...rootDependencyFlatMap, ...importer[key] };
    }
  }

  try {
    const dependencies = parsePackageMap(rootDependencyFlatMap, lock.packages!, {});

    const pkgJson = await readPackageJson(resolve(path, 'package.json'));

    const packageLock: PackageLockRoot = {
      name: pkgJson.name,
      preserveSymlinks: false,
      version: pkgJson.version,
      lockfileVersion: 1,
      dependencies
    };

    await new Promise((res, rej) => {
      writeFile(resolve(path, 'package-lock.json'), JSON.stringify(packageLock), err => {
        if (err) rej(err);
        res();
      });
    });
  } catch (e) {
    throw e;
  }
};

export default main;
