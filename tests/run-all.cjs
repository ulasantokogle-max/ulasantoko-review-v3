const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const tests = fs.readdirSync(__dirname).filter(name => name.endsWith('.cjs') && name !== 'run-all.cjs').sort();
for (const file of tests) {
  const result = spawnSync(process.execPath, [require('node:path').join(__dirname, file)], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('FAIL', file, result.error || result.status);
    process.exit(1);
  }
}
console.log(`PASS all ${tests.length} V3 test suites`);
