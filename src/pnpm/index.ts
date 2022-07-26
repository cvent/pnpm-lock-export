import { Lockfile, readWantedLockfile } from '@pnpm/lockfile-file';

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
