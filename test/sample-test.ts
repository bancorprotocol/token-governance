import { ethers, Web3 } from 'hardhat';
import { BigNumber } from 'ethers';

import { expect } from 'chai';

import { TokenGovernance, TokenGovernance__factory } from '../typechain';
import { MintableToken, MintableToken__factory } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let supervisor: SignerWithAddress;
let governor: SignerWithAddress;
let minter: SignerWithAddress;
let nobody: SignerWithAddress[];

let TokenGovernanceContract: TokenGovernance__factory;
let tokenGovernance: TokenGovernance;

let MintableTokenContract: MintableToken__factory;
let mintableToken: MintableToken;

const ROLE_SUPERVISOR = Web3.utils.keccak256('ROLE_SUPERVISOR');
const ROLE_GOVERNOR = Web3.utils.keccak256('ROLE_GOVERNOR');
const ROLE_MINTER = Web3.utils.keccak256('ROLE_MINTER');

describe('TokenGovernance', () => {
  before(async () => {
    [supervisor, governor, minter, ...nobody] = await ethers.getSigners();

    TokenGovernanceContract = (await ethers.getContractFactory(
      'TokenGovernance',
      supervisor
    )) as TokenGovernance__factory;
    MintableTokenContract = (await ethers.getContractFactory('MintableToken', supervisor)) as MintableToken__factory;
  });

  beforeEach(async () => {
    mintableToken = await MintableTokenContract.deploy('Mintable Token', 'TKN');
    await mintableToken.deployed();
  });

  describe('construction', () => {
    context('invalid', () => {
      it('should revert when initialized with an empty token', async () => {
        await expect(TokenGovernanceContract.deploy(ZERO_ADDRESS)).to.be.revertedWith('ERR_INVALID_ADDRESS');
      });
    });

    context('valid', () => {
      beforeEach(async () => {
        tokenGovernance = await TokenGovernanceContract.deploy(mintableToken.address);
        await tokenGovernance.deployed();
      });

      it('should initialize the token', async () => {
        expect(await tokenGovernance.token()).to.eql(mintableToken.address);
      });

      it('should set the correct permissions', async () => {
        expect(await tokenGovernance.getRoleMemberCount(ROLE_SUPERVISOR)).to.be.equal(BigNumber.from(1));
        expect(await tokenGovernance.getRoleMemberCount(ROLE_GOVERNOR)).to.be.equal(BigNumber.from(0));
        expect(await tokenGovernance.getRoleMemberCount(ROLE_MINTER)).to.be.equal(BigNumber.from(0));

        expect(await tokenGovernance.getRoleAdmin(ROLE_SUPERVISOR)).to.eql(ROLE_SUPERVISOR);
        expect(await tokenGovernance.getRoleAdmin(ROLE_GOVERNOR)).to.eql(ROLE_SUPERVISOR);
        expect(await tokenGovernance.getRoleAdmin(ROLE_MINTER)).to.eql(ROLE_GOVERNOR);

        expect(await tokenGovernance.hasRole(ROLE_SUPERVISOR, supervisor.address)).to.be.true;
        expect(await tokenGovernance.hasRole(ROLE_GOVERNOR, supervisor.address)).to.be.false;
        expect(await tokenGovernance.hasRole(ROLE_MINTER, supervisor.address)).to.be.false;
      });
    });
  });

  describe('roles and ownership', () => {
    beforeEach(async () => {
      tokenGovernance = await TokenGovernanceContract.deploy(mintableToken.address);
      await tokenGovernance.deployed();

      tokenGovernance.connect(supervisor);
      await tokenGovernance.grantRole(ROLE_GOVERNOR, governor.address);
      console.log('2345');
    });

    context('non-supervisor', async () => {
      it('should revert when trying to accept the ownership over the token', async () => {
        tokenGovernance.connect(supervisor);
        await mintableToken.transferOwnership(tokenGovernance.address);

        tokenGovernance.connect(nobody[0]);
        await expect(await tokenGovernance.acceptTokenOwnership()).to.be.revertedWith('ERR_ACCESS_DENIED');
      });

      it('should revert when trying to control the Supervisor role', async () => {
        const newSupervisor = nobody[1];
        tokenGovernance.connect(nobody[0]);

        await expect(tokenGovernance.grantRole(ROLE_SUPERVISOR, newSupervisor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        await expect(tokenGovernance.revokeRole(ROLE_SUPERVISOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        const newGovernor = nobody[1];
        tokenGovernance.connect(nobody[0]);

        await expect(tokenGovernance.grantRole(ROLE_GOVERNOR, newGovernor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        await expect(tokenGovernance.revokeRole(ROLE_GOVERNOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Minter role', async () => {
        tokenGovernance.connect(nobody[0]);
        await expect(tokenGovernance.grantRole(ROLE_MINTER, minter.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );

        tokenGovernance.connect(governor);
        await tokenGovernance.grantRole(ROLE_MINTER, minter.address);

        tokenGovernance.connect(nobody[0]);
        await expect(tokenGovernance.revokeRole(ROLE_MINTER, minter.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });
  });
});
