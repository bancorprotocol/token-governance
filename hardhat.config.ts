import { HardhatUserConfig } from 'hardhat/config';

import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';

import '@typechain/hardhat';
import 'solidity-coverage';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.4.11',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  mocha: {
    timeout: 600000,
    color: true,
    slow: 30000
  }
};

export default config;
