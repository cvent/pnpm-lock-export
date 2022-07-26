import { writeFile } from 'fs/promises';

import { readProjectManifestOnly } from '@pnpm/read-project-manifest';
import type { PackageSnapshot, PackageSnapshots, TarballResolution } from '@pnpm/lockfile-types';
import { nameVerFromPkgSnapshot, pkgSnapshotToResolution } from '@pnpm/lockfile-utils';
import { parse as parseDepPath } from 'dependency-path';

import type { Dependencies, Dependency, PackageLock } from './types';
import { parseLockfile } from '../../pnpm';

export async function convert(lockfileDir: string): Promise<PackageLock> {
  const lock = await parseLockfile(lockfileDir);

  // Use some default dummy values if name/version are not available.
  // They should not be authoritive in the package-lock.json anyway.
  const { name, version } = await readProjectManifestOnly(lockfileDir).then(
    ({ name, version }) => {
      if (!name) console.warn("Package name not found in manifest, using placeholder value ('package').");
      if (!version) console.warn("Package version not found in manifest, using placeholder value ('0.0.0').");
      return { name: name ?? 'package', version: version ?? '0.0.0' };
    },
    (e) => {
      console.warn(`${e} Using placeholder values (name: 'package', version: '0.0.0').`);
      return { name: 'package', version: '0.0.0' };
    }
  );

  return {
    name,
    version,
    lockfileVersion: 1,
    requires: true,
    dependencies: dependenciesFromNamedDependencies(namedDependenciesFromSnapshots(lock.packages ?? {})),
  };
}

export function serialize(lock: PackageLock): string {
  return JSON.stringify(lock, undefined, 2);
}

export async function write(lockfileDir: string): Promise<void> {
  await convert(lockfileDir).then(serialize).then(lock => writeFile('package-lock.json', lock));
}

interface NamedDependency extends Dependency {
  // Package name
  name: string;
  // Map of dependency package names to a nested tree of snapshots
  dependencies: Record<string, NamedDependency>;
}

/**
 * pnpm dependencies in lock files are either:
 *   - a dep path (from npm:)
 *   - a dep path (from git:)
 *   - a version (from regular dependency)
 *
 * This function normalizes them all to dep paths
 */
function depPathFromDependency([name, version]: [string, string]): string {
  try {
    parseDepPath(version);
    return version;
  } catch {
    parseDepPath(`/${name}/${version}`);
    return `/${name}/${version}`;
  }
}

function namedDependenciesFromSnapshots(snapshots: PackageSnapshots): Record<string, NamedDependency> {
  const missingRootDepPaths = missingDepPaths(snapshots);

  function namedDependencyFromSnapshot([depPath, snapshot]: [string, PackageSnapshot]): [string, NamedDependency] {
    const { name, version } = nameVerFromPkgSnapshot(depPath, snapshot as PackageSnapshot);
    const resolution = pkgSnapshotToResolution(depPath, snapshot, { default: 'https://registry.npmjs.org/' });

    const dependencySnapshots = Object.entries(snapshot.dependencies ?? {})
      // convert the dependency to a depPath
      .map((dependency) => depPathFromDependency(dependency))
      // find the depPath in the packages map
      .map((depPath) => [depPath, snapshots[depPath]] as [string, PackageSnapshot]);

    const dependencyEntries = dependencySnapshots
      // only for depPaths that are missing...
      .filter(([depPath]) => missingRootDepPaths.includes(depPath))
      // recurse over the dependencies
      .map((entry) => namedDependencyFromSnapshot(entry));

    const requireEntries = dependencySnapshots
      .map(([depPath, snapshot]) => nameVerFromPkgSnapshot(depPath, snapshot))
      .map(({ name, version }) => [name, version])
      // Remove any dependencies that are also peerDependencies
      .filter(([key]) => key && !Object.keys(snapshot.peerDependencies ?? {}).includes(key));

    const namedDependency: NamedDependency = {
      ...snapshot,
      name,
      version,
      resolved: (resolution as TarballResolution).tarball,
      requires: Object.fromEntries(requireEntries),
      dependencies: Object.fromEntries(dependencyEntries),
    };

    const integrity = (resolution as TarballResolution).integrity;
    if (integrity) {
      namedDependency.integrity = integrity;
    }

    return [depPath, namedDependency];
  }

  return Object.fromEntries(
    Object.entries(snapshots).map((snapshotEntry) => namedDependencyFromSnapshot(snapshotEntry))
  );
}

function dependenciesFromNamedDependencies(namedDependencies: Record<string, NamedDependency>): Dependencies {
  return Object.fromEntries(
    Object
      .entries(namedDependencies)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([_, snapshot]) => {
        const dependency: Dependency = {
          version: snapshot.version,
          dependencies: dependenciesFromNamedDependencies(snapshot.dependencies ?? {}),
        };

        if (snapshot.integrity) dependency.integrity = snapshot.integrity;
        if (snapshot.resolved) dependency.resolved = snapshot.resolved;
        if (snapshot.dev) dependency.dev = true;
        if (snapshot.optional) dependency.optional = true;
        if (snapshot.requires) dependency.requires = snapshot.requires;

        return [snapshot.name, dependency];
      })
      .reverse()
  )
}

function missingDepPaths(snapshots: PackageSnapshots): string[] {
  const reducedDepPaths = Object.values(
    Object.fromEntries(
      Object.keys(snapshots)
        .reverse()
        .map((depPath) => [parseDepPath(depPath).name, depPath])
    )
  );

  return Object.keys(snapshots).filter((depPath) => !reducedDepPaths.includes(depPath));
}