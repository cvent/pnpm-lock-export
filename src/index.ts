import { readCurrentLockfile } from '@pnpm/lockfile-file';
import {
  PackageSnapshot,
  PackageSnapshots,
  ResolvedDependencies
} from '@pnpm/lockfile-types';
import { PackageLockDependency, PackageLockDependencyMap } from './packageLock';

const entryToSnapshotKey = (k: [string, string]) => `/${k[0]}/${k[1]}`;

const main = async (...args: string[]) => {
  const lock = await readCurrentLockfile(process.cwd(), {
    ignoreIncompatible: false
  });
  if (!lock) {
    throw new Error('pnpm lockfile not found');
  }

  const parseMap = parsePackageMap(lock.packages!);

  const dependencies = parseMap(lock.importers['.'].dependencies!);

  return dependencies;
};

const parsePackage = (packages: PackageSnapshots) => (
  packageName: string,
  packageVersion: string
): PackageLockDependencyMap => {
  const parseMap = parsePackageMap(packages);
  const snapshot = packages[entryToSnapshotKey([packageName, packageVersion])];
  const packageLockNode: PackageLockDependency = {
    dependencies: snapshot.dependencies && parseMap(snapshot.dependencies),
    dev: snapshot.dev,
    requires: {},
    version: snapshot.version
  };

  return { [packageName]: packageLockNode };
};

const parsePackageMap = (packages: PackageSnapshots) => (
  dependencyMap: ResolvedDependencies
): PackageLockDependencyMap => {
  const parseItem = parsePackage(packages);
  const snapshots = Object.entries(dependencyMap)
    .map(item => parseItem(item[0], item[1]))
    .reduce((acc, val) => ({ ...acc, ...val }), {});

  return snapshots;
};

export default main;
