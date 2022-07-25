# with-registry mock

This has a package dependency, which has a transitive dependency on a git repo.
It also has tarballs in the lockfile.

## Lockfile regeneration

To regenerate pnpm-lock.yaml, run `pnpm install` while also running `pnpm registry-mock`.
Forcing the lockfile to contain tarballs results in a minimum pnpm version of 7.6.0 when generating the lockfile.
