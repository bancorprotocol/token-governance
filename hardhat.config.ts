import { HardhatUserConfig, task } from 'hardhat/config';

import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';

import 'hardhat-typechain';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};

export default config;
