// tslint:disable object-literal-sort-keys
import { LockfileResolution, PackageSnapshots, ResolvedDependencies, TarballResolution } from '@pnpm/lockfile-types';
import { flattenPackageLockMap } from './flatten';
import { PackageLockDependency, PackageLockDependencyMap, PackageLockRequireMap } from './packageLock';
import { packageIdentifierToVersion } from './utils';

const entryToSnapshotKey = (k: [string, string]) => `/${k[0]}/${k[1]}`;

const resolvedDependenciesToRequiresMap = (d: ResolvedDependencies): PackageLockRequireMap => {
  const requireMap: PackageLockRequireMap = {};
  Object.entries(d).forEach(([key, value]) => {
    requireMap[key] = packageIdentifierToVersion(value);
  });
  return requireMap;
};

const hasIntegrity = (resolution: LockfileResolution): resolution is { integrity: string } => {
  // tslint:disable-next-line: no-any
  return (resolution as any).integrity !== undefined;
};

const hasTarball = (resolution: LockfileResolution): resolution is TarballResolution => {
  // tslint:disable-next-line: no-any
  return (resolution as any).tarball !== undefined;
};

/**
 * Given some metadata about a package, look it up in pnpm's snapshots map and build an npm-style dependency from it.
 * @param packageName The package's name.
 * @param packageIdentifier The package's pnpm-style identifier.
 * @param snapshots The flat pnpm snapshot map.
 * @param parentDependencies An npm-style dependency map of depedencies that have already been included higher in this
 * dependency's tree.
 * @returns An npm-style dependency map containing a single node.
 */
const parsePackage = (
  packageName: string,
  packageIdentifier: string,
  snapshots: PackageSnapshots,
  parentDependencies: ResolvedDependencies
): PackageLockDependencyMap => {
  // Fall back to just the package identifier if lookup fails, for the case of non-npm modules
  const snapshot = snapshots[entryToSnapshotKey([packageName, packageIdentifier])] || snapshots[packageIdentifier];

  if (!snapshot)
    throw new Error(`Package not found in snapshots: name: "${packageName}", identifier: "${packageIdentifier}"`);

  const { dev, optional } = snapshot;
  const version = packageIdentifierToVersion(packageIdentifier);

  const packageLockNode: PackageLockDependency = {
    version,
    dev,
    optional
  };
  if (hasIntegrity(snapshot.resolution)) packageLockNode.integrity = snapshot.resolution.integrity;

  if (hasTarball(snapshot.resolution)) packageLockNode.resolved = snapshot.resolution.tarball;

  if (snapshot.dependencies) {
    packageLockNode.requires = resolvedDependenciesToRequiresMap(snapshot.dependencies);

    const dependencies = { ...snapshot.dependencies };
    // If a matching dependency already exists in the tree, don't include it
    // in this package's dependencies.
    for (const [depName, depIdentifier] of Object.entries(dependencies)) {
      if (
        // tslint:disable-next-line: strict-type-predicates
        parentDependencies[depName] !== undefined &&
        parentDependencies[depName] === depIdentifier
      ) {
        delete dependencies[depName];
      }
    }

    packageLockNode.dependencies = parsePackageMap(dependencies, snapshots, parentDependencies);
  }

  const name = snapshot.name || packageName;

  return { [name]: packageLockNode };
};

/**
 * Given a pnpm-style dependency map, returns an npm-style dependency map.
 * @param dependencyMap A pnpm-style dependency map.
 * @param snapshots The flat pnpm snapshot map.
 * @param parentDependencies An npm-style dependency map of depedencies that have already been included higher in this
 * dependency's tree.
 * @returns An npm-style dependency map.
 */
export const parsePackageMap = (
  dependencyMap: ResolvedDependencies,
  snapshots: PackageSnapshots,
  parentDependencies: ResolvedDependencies
): PackageLockDependencyMap => {
  const availableParents = { ...parentDependencies, ...dependencyMap };
  const packageLockDependencies = Object.entries(dependencyMap)
    .map(item => parsePackage(item[0], item[1], snapshots, availableParents))
    .reduce((acc, val) => ({ ...acc, ...val }), {});

  // TODO: Right here is the place to check if we can hoist any sub-dependencies up to this level.
  const flattenedPackageLockDependencies = flattenPackageLockMap(packageLockDependencies, parentDependencies);

  return flattenedPackageLockDependencies;
};
