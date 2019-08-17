export interface PackageLockRoot {
  name: string;
  version: string;
  preserveSymlinks: false;
  lockfileVersion: number;
  dependencies: PackageLockDependencyMap;
}

export interface PackageLockDependencyMap {
  [packageName: string]: PackageLockDependency;
}

export interface PackageLockRequireMap {
  [packageName: string]: string;
}

export interface PackageLockDependency {
  version?: string;
  integrity?: string;
  resolved?: string;
  dev?: boolean;
  optional?: boolean;
  requires?: PackageLockRequireMap;
  dependencies?: PackageLockDependencyMap;
}
