module.exports = {
  testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle run coverage',
  compileCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle compile',
  copyPackages: ['@openzeppelin/contracts'],
  norpc: true,
  skipFiles: ['tests']
};
