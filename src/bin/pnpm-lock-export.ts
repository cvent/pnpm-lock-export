let argv = process.argv.slice(2);

const dashDashIndex = argv.indexOf('--');
const nonEscapedArgv =
  dashDashIndex === -1 ? argv : argv.slice(0, dashDashIndex);

if (
  nonEscapedArgv.includes('--help') ||
  nonEscapedArgv.includes('-h') ||
  nonEscapedArgv.includes('--h')
) {
  argv = ['help'].concat(argv);
}

(async () => {
  // tslint:disable-line:no-floating-promises
  switch (argv[0]) {
    case '-v':
    case '--version':
      const pkg = require('../../package.json');
      console.log(pkg.version);
      break;
    case 'help':
      console.log('do something helpful');
      break;
    default:
      await run();
      break;
  }
})();

async function run() {
  const main = (await import('../index')).default;
  await main(...argv);
}
