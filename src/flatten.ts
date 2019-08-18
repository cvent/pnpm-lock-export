// tslint:disable strict-type-predicates
import { ResolvedDependencies } from '@pnpm/lockfile-types';
import produce from 'immer';
import sortedObject = require('sorted-object');
import { PackageLockDependency, PackageLockDependencyMap } from './packageLock';

const canResolve = (pkg: PackageLockDependency, availablePackages: Record<string, string>) => {
  if (!pkg.requires) return true;
  for (const [name, version] of Object.entries(pkg.requires)) {
    const inParents = availablePackages[name] === version;
    const inChildren = !!pkg.dependencies && !!pkg.dependencies[name];
    if (!(inParents || inChildren)) return false;
  }
  return true;
};

export const flatten = (
  map: PackageLockDependencyMap,
  parentDependencies: Record<string, string>
): PackageLockDependencyMap => {
  const resolvableDependencies = { ...parentDependencies };
  for (const [name, pkg] of Object.entries(map)) {
    resolvableDependencies[name] = pkg.version;
  }
  const hoisted: Array<[string, string]> = [];
  const flattened = produce(map, draft => {
    for (const [name, pkg] of Object.entries(map)) {
      if (!pkg.dependencies) continue;
      for (const [subName, subPkg] of Object.entries(pkg.dependencies!)) {
        if (draft[subName] === undefined) {
          draft[subName] = subPkg;
          resolvableDependencies[subName] = subPkg.version;
          hoisted.push([subName, subPkg.version]);
        }
      }
    }

    for (const [name, pkg] of Object.entries(map)) {
      if (!pkg.dependencies) continue;
      for (const [subName, subPkg] of Object.entries(pkg.dependencies!)) {
        if (draft[subName] && draft[subName].version === subPkg.version) {
          delete draft[name].dependencies![subName];
        }
      }
      if (Object.keys(draft[name].dependencies!).length === 0) {
        delete draft[name].dependencies;
      }
    }
  });

  if (hoisted.length === 0) return flattened;
  else return flatten(flattened, resolvableDependencies);
};
