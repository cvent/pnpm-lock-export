import { withDir } from 'tmp-promise';

import { parseLockfile } from '../../src/pnpm';

test('no lockfile', async () => {
  await withDir(async (o) => {
    await expect(parseLockfile(o.path)).rejects.toThrow('pnpm lockfile not found');
  });
});
