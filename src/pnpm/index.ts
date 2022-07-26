import { Lockfile, readWantedLockfile } from '@pnpm/lockfile-file';
import { parse as parseDepPath } from 'dependency-path';

const LATEST_SUPPORTED_PNPM_LOCK_VERSION = 5.4;

export async function parseLockfile(pkgPath: string): Promise<Lockfile> {
  const lock = await readWantedLockfile(pkgPath, { ignoreIncompatible: true });
  if (lock == null) throw new Error('pnpm lockfile not found');

  if (lock.lockfileVersion > LATEST_SUPPORTED_PNPM_LOCK_VERSION)
    console.warn(
      `Your lockfile version (${lock.lockfileVersion}) is higher than the supported version of pnpm-lock-export (${LATEST_SUPPORTED_PNPM_LOCK_VERSION}).`
    );

  return lock;
}

/**
 * pnpm dependencies in lock files are either:
 *   - a dep path (from npm:)
 *   - a dep path (from git:)
 *   - a version (from regular dependency)
 *
 * This function normalizes them all to dep paths
 */
export function depPathFromDependency([name, version]: [string, string]): ReturnType<typeof parseDepPath> {
  try {
    return parseDepPath(version);
  } catch {
    return parseDepPath(`/${name}/${version}`);
  }
}
