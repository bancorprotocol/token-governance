import { HardhatUserConfig } from 'hardhat/config';

import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';

import 'hardhat-typechain';
import 'solidity-coverage';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    timeout: 600000,
    color: true,
    slow: 30000
  }
};

export default config;
