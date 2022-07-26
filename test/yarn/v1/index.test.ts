import path from 'path';
import fs from 'fs';

import { convert } from '../../../src/yarn/v1/index';

const mocks = fs.readdirSync(path.join('test', 'mock'));

test.each(mocks)('%s', async (mock) => {
  await expect(convert(path.join('test', 'mock', mock))).resolves.toMatchSnapshot();
});
