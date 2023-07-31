import { getLockfileImporterId, Lockfile, ProjectSnapshot, readWantedLockfile } from '@pnpm/lockfile-file';
import { parse as parseDepPath } from 'dependency-path';
import { DEPENDENCIES_FIELDS } from '@pnpm/types';
import { pruneSharedLockfile } from '@pnpm/prune-lockfile';
import { getPackages } from '@manypkg/get-packages';

const LATEST_SUPPORTED_PNPM_LOCK_VERSION = 6.0;

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
  const pathVersion: string = version.replace(/\(.*/, '');
  try {
    return parseDepPath(version);
  } catch {
    return parseDepPath(`/${name}/${pathVersion}`);
  }
}

export async function workspaceProjectPaths(lockfileDir: string): Promise<Set<string>> {
  return new Set<string>(
    await getPackages(lockfileDir).then(({ root, packages }) => {
      return packages.map(({ dir }) => dir).filter((pkg) => pkg !== root.dir);
    })
  );
}

// From https://github.com/pnpm/pnpm/blob/main/packages/make-dedicated-lockfile/src/index.ts
export async function dedicatedLockfile(lockfileDir: string, projectDir: string): Promise<Lockfile> {
  const lockfile = await parseLockfile(lockfileDir);

  const allImporters = lockfile.importers;
  lockfile.importers = {};
  const baseImporterId = getLockfileImporterId(lockfileDir, projectDir);
  for (const [importerId, importer] of Object.entries(allImporters)) {
    if (importerId.startsWith(`${baseImporterId}/`)) {
      const newImporterId = importerId.slice(baseImporterId.length + 1);
      lockfile.importers[newImporterId] = projectSnapshotWithoutLinkedDeps(importer);
      continue;
    }
    if (importerId === baseImporterId) {
      lockfile.importers['.'] = projectSnapshotWithoutLinkedDeps(importer);
    }
  }

  return pruneSharedLockfile(lockfile);
}

// From https://github.com/pnpm/pnpm/blob/main/packages/make-dedicated-lockfile/src/index.ts
function projectSnapshotWithoutLinkedDeps(projectSnapshot: ProjectSnapshot) {
  const newProjectSnapshot: ProjectSnapshot = {
    specifiers: projectSnapshot.specifiers,
  };
  for (const depField of DEPENDENCIES_FIELDS) {
    if (projectSnapshot[depField] == null) continue;
    newProjectSnapshot[depField] = Object.fromEntries(
      Object.entries(projectSnapshot[depField] ?? {}).filter((entry) => !entry[1].startsWith('link:'))
    );
  }
  return newProjectSnapshot;
}
