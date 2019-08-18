import { ResolvedDependencies } from '@pnpm/lockfile-types';
import produce from 'immer';
import { uniqBy } from 'lodash';
import { PackageLockDependency, PackageLockDependencyMap } from './packageLock';
import { packageIdentifierToVersion } from './utils';

/**
 * Given an npm-style dependency node and a map of parents in the tree, determine whether the package could resolve its
 * dependencies if hoisted.
 * @param pkg The npm-style dependency node.
 * @param parents A map where the key is the package name, and the value is the package version.
 */
const canResolve = (pkg: PackageLockDependency, parents: Record<string, string>): boolean => {
  if (!pkg.requires) return true;
  for (const [name, version] of Object.entries(pkg.requires)) {
    // tslint:disable-next-line: strict-type-predicates
    if (parents[name] === undefined || parents[name] !== version) return false;
  }
  return true;
};

/**
 * Given an npm-style dependency map, look for dependencies that can be hoisted. Only looks at dependencies one level
 * deep (i.e. the direct dependencies of the map's dependencies).
 * @param packageLockMap The npm-style map to search.
 * @returns A copy of the package lock map, with flattened dependencies.
 */
export const flattenPackageLockMap = (
  packageLockMap: PackageLockDependencyMap,
  parentDependencies: ResolvedDependencies
): PackageLockDependencyMap => {
  return produce(packageLockMap, draft => {
    // A map of every package that a sub-dependency of packageLockMap could require and resolve
    const availableParents: Record<string, string> = Object.entries(parentDependencies)
      .map(([key, value]) => [key, packageIdentifierToVersion(value)])
      .concat(Object.entries(packageLockMap).map(([key, value]) => [key, value.version]))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // A map where the key is a package  and the value is an array nodes.
    const dependencyIndex: Record<string, PackageLockDependency[]> = {};

    // First, build an index of all dependencies of packageLockMap one level deep.
    for (const [key, dependency] of Object.entries(packageLockMap)) {
      if (!dependency.dependencies) continue;
      for (const [subKey, subDependency] of Object.entries(dependency.dependencies)) {
        if (!dependencyIndex[subKey]) dependencyIndex[subKey] = [];
        dependencyIndex[subKey].push(subDependency);
      }
    }

    // Next, flatten that to an index of dependencies with no direct conflicts (i.e. non-matching versions).
    // Pre-sort them based on which packages require others in the list.
    const hoistableDependencies = Object.entries(dependencyIndex)
      .map(([key, list]) => [key, uniqBy(list, i => i.version)] as const)
      .filter(([key, list]) => list.length === 1)
      .map(([key, list]) => [key, list[0]] as const)
      .sort((a, b) => {
        if (a[1].requires === undefined) return -1;
        if (b[1].requires === undefined) return 1;
        if (!Object.keys(a[1].requires).some(k => k === b[0])) return -1;
        if (!Object.keys(b[1].requires).some(k => k === a[0])) return 1;
        return 0;
      });

    // Iterate over the list of possibly hoistable dependencies.
    // Check if they could still be resolved correctly if they were placed higher in the tree.
    // TODO: This does not fully flatten the tree. We still need to handle the case where a package and what it
    // requires are all in hoistable dependencies.
    for (const [name, pkg] of hoistableDependencies) {
      if (canResolve(pkg, availableParents)) {
        // tslint:disable-next-line: strict-type-predicates
        if (draft[name] === undefined) {
          draft[name] = pkg;
          availableParents[name] = pkg.version;
        }
        for (const subDependency of Object.values(draft)) {
          if (subDependency.dependencies) {
            delete subDependency.dependencies[name];
            if (Object.keys(subDependency.dependencies).length === 0) delete subDependency.dependencies;
          }
        }
      }
    }
  });
};
