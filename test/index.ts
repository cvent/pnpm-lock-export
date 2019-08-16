/// <reference path="../typings/index.d.ts" />

import pnpmRegistryMock from '@pnpm/registry-mock';
import tape = require('tape');
import promisifyTape from 'tape-promise';
import main from '../src';

const test = promisifyTape(tape);

test('it does the thing', async t => {
  await main();
  t.ok(true);
});
