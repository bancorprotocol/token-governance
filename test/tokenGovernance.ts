import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { expect } from 'chai';

import { TokenGovernance, TokenGovernance__factory } from '../typechain';
import { MintableToken, MintableToken__factory } from '../typechain';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

let supervisor: SignerWithAddress;
let accounts: SignerWithAddress[];

let TokenGovernanceContract: TokenGovernance__factory;
let tokenGovernance: TokenGovernance;

let MintableTokenContract: MintableToken__factory;
let mintableToken: MintableToken;

const ROLE_SUPERVISOR = ethers.utils.id('ROLE_SUPERVISOR');
const ROLE_GOVERNOR = ethers.utils.id('ROLE_GOVERNOR');
const ROLE_MINTER = ethers.utils.id('ROLE_MINTER');

describe('TokenGovernance', () => {
  before(async () => {
    [supervisor, ...accounts] = await ethers.getSigners();

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
        await expect(TokenGovernanceContract.deploy(ethers.constants.AddressZero)).to.be.revertedWith(
          'ERR_INVALID_ADDRESS'
        );
      });
    });

    context('valid', () => {
      beforeEach(async () => {
        tokenGovernance = await TokenGovernanceContract.deploy(mintableToken.address);
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
    let governor: SignerWithAddress;
    let nonSupervisor: SignerWithAddress;
    let newX: SignerWithAddress;

    before(async () => {
      governor = accounts[0];
      newX = accounts[1];
      nonSupervisor = accounts[2];
    });

    beforeEach(async () => {
      tokenGovernance = await TokenGovernanceContract.deploy(mintableToken.address);
      await tokenGovernance.connect(supervisor).grantRole(ROLE_GOVERNOR, governor.address);
    });

    context('non-supervisor', () => {
      it('should revert when trying to accept the ownership over the token', async () => {
        await mintableToken.transferOwnership(tokenGovernance.address);

        expect(tokenGovernance.connect(nonSupervisor).acceptTokenOwnership()).to.be.revertedWith('ERR_ACCESS_DENIED');
      });

      it('should revert when trying to control the Supervisor role', async () => {
        expect(tokenGovernance.connect(nonSupervisor).grantRole(ROLE_SUPERVISOR, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        expect(tokenGovernance.connect(nonSupervisor).revokeRole(ROLE_SUPERVISOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        expect(tokenGovernance.connect(nonSupervisor).grantRole(ROLE_GOVERNOR, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        expect(tokenGovernance.connect(nonSupervisor).revokeRole(ROLE_GOVERNOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Minter role', async () => {
        expect(tokenGovernance.connect(nonSupervisor).grantRole(ROLE_MINTER, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );

        await tokenGovernance.connect(governor).grantRole(ROLE_MINTER, newX.address);

        expect(tokenGovernance.connect(nonSupervisor).revokeRole(ROLE_MINTER, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('supervisor', async () => {
      it('should be able to accept the ownership over the token', async () => {
        await mintableToken.transferOwnership(tokenGovernance.address);
        await tokenGovernance.acceptTokenOwnership();

        expect(await mintableToken.owner()).to.eql(tokenGovernance.address);
      });

      it('should be able to control the Supervisor role', async () => {
        await tokenGovernance.grantRole(ROLE_SUPERVISOR, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_SUPERVISOR, newX.address)).to.be.true;

        await tokenGovernance.revokeRole(ROLE_SUPERVISOR, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_SUPERVISOR, newX.address)).to.be.false;
      });

      it('should be able to control the Governor role', async () => {
        await tokenGovernance.grantRole(ROLE_GOVERNOR, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_GOVERNOR, newX.address)).to.be.true;

        await tokenGovernance.revokeRole(ROLE_GOVERNOR, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_GOVERNOR, newX.address)).to.be.false;
      });

      it('should revert when trying to control the Minter role', async () => {
        expect(tokenGovernance.grantRole(ROLE_MINTER, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );

        await tokenGovernance.connect(governor).grantRole(ROLE_MINTER, newX.address);

        expect(tokenGovernance.revokeRole(ROLE_MINTER, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('governor', async () => {
      it('should revert when trying to control the Supervisor role', async () => {
        expect(tokenGovernance.connect(governor).grantRole(ROLE_SUPERVISOR, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        expect(tokenGovernance.connect(governor).revokeRole(ROLE_SUPERVISOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        expect(tokenGovernance.connect(governor).grantRole(ROLE_GOVERNOR, newX.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to grant'
        );
        expect(tokenGovernance.connect(governor).revokeRole(ROLE_GOVERNOR, governor.address)).to.be.revertedWith(
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should be able to control the Minter role', async () => {
        await tokenGovernance.connect(governor).grantRole(ROLE_MINTER, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_MINTER, newX.address)).to.be.true;

        await tokenGovernance.connect(governor).revokeRole(ROLE_MINTER, newX.address);
        expect(await tokenGovernance.hasRole(ROLE_MINTER, newX.address)).to.be.false;
      });
    });
  });

  describe('token management', () => {
    let governor: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let minter: SignerWithAddress;
    let minter2: SignerWithAddress;

    before(async () => {
      governor = accounts[0];
      tokenOwner = accounts[1];
      minter = accounts[6];
      minter2 = accounts[7];
    });

    beforeEach(async () => {
      await mintableToken.issue(tokenOwner.address, BigNumber.from(1000000));

      tokenGovernance = await TokenGovernanceContract.deploy(mintableToken.address);

      await mintableToken.transferOwnership(tokenGovernance.address);
      await tokenGovernance.acceptTokenOwnership();

      await tokenGovernance.grantRole(ROLE_GOVERNOR, governor.address);

      await tokenGovernance.connect(governor).grantRole(ROLE_MINTER, minter.address);
      await tokenGovernance.connect(governor).grantRole(ROLE_MINTER, minter2.address);
    });

    context('issuing', () => {
      it('should revert when a Supervisor role tries to issue new tokens', async () => {
        expect(tokenGovernance.mint(tokenOwner.address, BigNumber.from(1000))).to.be.revertedWith('ERR_ACCESS_DENIED');
      });

      it('should revert when a Governor role tries to issue new tokens', async () => {
        expect(tokenGovernance.connect(governor).mint(tokenOwner.address, BigNumber.from(1000))).to.be.revertedWith(
          'ERR_ACCESS_DENIED'
        );
      });

      it('should revert when a non-minter role tries to issue new tokens', async () => {
        expect(tokenGovernance.connect(tokenOwner).mint(tokenOwner.address, BigNumber.from(1000))).to.be.revertedWith(
          'ERR_ACCESS_DENIED'
        );
      });

      it('should allow minters to issue new tokens', async () => {
        const value = BigNumber.from(1000);
        let balance = await mintableToken.balanceOf(tokenOwner.address);
        await tokenGovernance.connect(minter).mint(tokenOwner.address, value);
        let newBalance = await mintableToken.balanceOf(tokenOwner.address);
        expect(newBalance).to.be.equal(balance.add(value));

        const value2 = BigNumber.from(555555);
        balance = await mintableToken.balanceOf(tokenOwner.address);
        await tokenGovernance.connect(minter2).mint(tokenOwner.address, value2);
        newBalance = await mintableToken.balanceOf(tokenOwner.address);
        expect(newBalance).to.be.equal(balance.add(value2));
      });
    });

    context('destroying', () => {
      it('should allow token holders to destroy their own tokens', async () => {
        const value = BigNumber.from(100);
        const balance = await mintableToken.balanceOf(tokenOwner.address);
        await tokenGovernance.connect(tokenOwner).burn(value);
        const newBalance = await mintableToken.balanceOf(tokenOwner.address);
        expect(newBalance).to.be.equal(balance.sub(value));
      });
    });
  });
});
