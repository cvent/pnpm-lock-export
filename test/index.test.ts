import path from 'path';
import fs from 'fs';
import { withDir } from 'tmp-promise';

import parseLock from '../src/index';

const mocks = fs.readdirSync(path.join('test', 'mock'));

test.each(mocks)('%s', async (mock) => {
  await expect(parseLock(path.join('test', 'mock', mock))).resolves.toMatchSnapshot();
});

test('no lockfile', async () => {
  await withDir(async (o) => {
    await expect(parseLock(o.path)).rejects.toThrow('pnpm lockfile not found');
  });
});
