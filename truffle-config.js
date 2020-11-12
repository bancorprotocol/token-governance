/* eslint-disable import/no-extraneous-dependencies */
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(require('bn.js')))
  .use(require('dirty-chai'))
  .expect();

const ganache = require('ganache-core');
/* eslint-enable import/no-extraneous-dependencies */

module.exports = {
  networks: {
    development: {
      network_id: '*',
      provider: ganache.provider()
    }
  },
  plugins: ['solidity-coverage'],
  compilers: {
    solc: {
      version: '0.6.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  mocha: {
    before_timeout: 600000,
    timeout: 600000,
    useColors: true,
    slow: 30000
  }
};
