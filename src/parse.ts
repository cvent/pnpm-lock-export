// tslint:disable object-literal-sort-keys
import {
  LockfileResolution,
  PackageSnapshots,
  ResolvedDependencies,
  TarballResolution
} from '@pnpm/lockfile-types';
import {
  PackageLockDependency,
  PackageLockDependencyMap,
  PackageLockRequireMap
} from './packageLock';

const entryToSnapshotKey = (k: [string, string]) => `/${k[0]}/${k[1]}`;
const packageIdentifierToVersion = (i: string) => i.split('_')[0];

const resolvedDependenciesToRequiresMap = (
  d: ResolvedDependencies
): PackageLockRequireMap => {
  const requireMap: PackageLockRequireMap = {};
  Object.entries(d).forEach(([key, value]) => {
    requireMap[key] = packageIdentifierToVersion(value);
  });
  return requireMap;
};

const hasIntegrity = (
  resolution: LockfileResolution
): resolution is { integrity: string } => {
  // tslint:disable-next-line: no-any
  return (resolution as any).integrity !== undefined;
};

const hasTarball = (
  resolution: LockfileResolution
): resolution is TarballResolution => {
  // tslint:disable-next-line: no-any
  return (resolution as any).tarball !== undefined;
};

const parsePackage = (
  packageName: string,
  packageIdentifier: string,
  packages: PackageSnapshots,
  parentDependencies: ResolvedDependencies
): PackageLockDependencyMap => {
  // Fall back to just the package identifier if lookup fails, for the case of non-npm modules
  const snapshot =
    packages[entryToSnapshotKey([packageName, packageIdentifier])] ||
    packages[packageIdentifier];

  if (!snapshot)
    throw new Error(
      `Package not found in snapshots: name: "${packageName}", identifier: "${packageIdentifier}"`
    );

  const { dev, optional } = snapshot;
  const version = packageIdentifierToVersion(packageIdentifier);

  const packageLockNode: PackageLockDependency = {
    version,
    dev,
    optional
  };
  if (hasIntegrity(snapshot.resolution))
    packageLockNode.integrity = snapshot.resolution.integrity;

  if (hasTarball(snapshot.resolution))
    packageLockNode.resolved = snapshot.resolution.tarball;

  if (snapshot.dependencies)
    packageLockNode.requires = resolvedDependenciesToRequiresMap(
      snapshot.dependencies
    );

  if (snapshot.dependencies) {
    const dependencies = { ...snapshot.dependencies };
    for (const [depName, depIdentifier] of Object.entries(dependencies)) {
      if (
        // tslint:disable-next-line: strict-type-predicates
        parentDependencies[depName] !== undefined &&
        parentDependencies[depName] === depIdentifier
      ) {
        delete dependencies[depName];
      }
    }

    packageLockNode.dependencies = parsePackageMap(
      dependencies,
      packages,
      parentDependencies
    );
  }

  const name = snapshot.name || packageName;

  return { [name]: packageLockNode };
};

export const parsePackageMap = (
  dependencyMap: ResolvedDependencies,
  packages: PackageSnapshots,
  parentDependencies: ResolvedDependencies
): PackageLockDependencyMap => {
  const nextInTree = { ...dependencyMap, ...parentDependencies };
  const packageLockDependencies = Object.entries(dependencyMap)
    .map(item => parsePackage(item[0], item[1], packages, nextInTree))
    .reduce((acc, val) => ({ ...acc, ...val }), {});

  // TODO: Right here is the place to check if we can hoist any sub-dependencies up to this level.

  return packageLockDependencies;
};
