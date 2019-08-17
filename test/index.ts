/// <reference path="../typings/index.d.ts" />

import { unlink } from 'fs';
import { resolve } from 'path';
import tape = require('tape');
import promisifyTape from 'tape-promise';
import main from '../src';

const test = promisifyTape(tape);

test('it does the thing', async t => {
  const testPath = './test/mock/2';
  await new Promise((res, rej) => {
    unlink(resolve(process.cwd(), testPath, 'package-lock.json'), () => {
      res();
    });
  });
  await main({ path: testPath });
  t.ok(true);
});
