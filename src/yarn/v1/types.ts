export type Dependencies = Record<string, string>;
export type Packages = Record<string, Package>;

export type YarnLock = Record<string, Package>;

export interface Package {
  version: string;
  resolved: string;
  integrity?: string;
  dependencies?: Dependencies;
  uid?: string;
}
