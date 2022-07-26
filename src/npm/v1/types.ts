export type Dependencies = Record<string, Dependency>;
export type DependencyEntry = [string, Dependency];

export type Requires = Record<string, string>;

export interface PackageLock {
  name: string;
  version: string;
  lockfileVersion: 1;
  packageIntegrity?: string;
  requires: boolean;
  dependencies?: Dependencies;
}

export interface Dependency {
  version: string;
  integrity?: string;
  resolved?: string;
  bundled?: boolean;
  dev?: boolean;
  optional?: boolean;
  requires?: Requires;
  dependencies?: Dependencies;
}