const { expect } = require('chai');

const { BN, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const TokenGovernance = artifacts.require('TokenGovernance');
const MintableToken = artifacts.require('MintableToken');

contract('TokenGovernance', async (accounts) => {
  const ROLE_SUPERVISOR = web3.utils.keccak256('ROLE_SUPERVISOR');
  const ROLE_GOVERNOR = web3.utils.keccak256('ROLE_GOVERNOR');
  const ROLE_MINTER = web3.utils.keccak256('ROLE_MINTER');

  let token;
  const supervisor = accounts[0];

  beforeEach(async () => {
    token = await MintableToken.new('Mintable Token', 'TKN', { from: supervisor });
  });

  describe('construction', async () => {
    context('invalid', async () => {
      it('should revert when initialized with an empty token', async () => {
        await expectRevert(TokenGovernance.new(ZERO_ADDRESS), 'ERR_INVALID_ADDRESS');
      });
    });

    context('valid', async () => {
      let tokenGovernance;

      beforeEach(async () => {
        tokenGovernance = await TokenGovernance.new(token.address, { from: supervisor });
      });

      it('should initialize the token', async () => {
        expect(await tokenGovernance.token.call()).to.eql(token.address);
      });

      it('should set the correct permissions', async () => {
        expect(await tokenGovernance.getRoleMemberCount.call(ROLE_SUPERVISOR)).to.be.bignumber.equal(new BN(1));
        expect(await tokenGovernance.getRoleMemberCount.call(ROLE_GOVERNOR)).to.be.bignumber.equal(new BN(0));
        expect(await tokenGovernance.getRoleMemberCount.call(ROLE_MINTER)).to.be.bignumber.equal(new BN(0));

        expect(await tokenGovernance.getRoleAdmin.call(ROLE_SUPERVISOR)).to.eql(ROLE_SUPERVISOR);
        expect(await tokenGovernance.getRoleAdmin.call(ROLE_GOVERNOR)).to.eql(ROLE_SUPERVISOR);
        expect(await tokenGovernance.getRoleAdmin.call(ROLE_MINTER)).to.eql(ROLE_GOVERNOR);

        expect(await tokenGovernance.hasRole.call(ROLE_SUPERVISOR, supervisor)).to.be.true();
        expect(await tokenGovernance.hasRole.call(ROLE_GOVERNOR, supervisor)).to.be.false();
        expect(await tokenGovernance.hasRole.call(ROLE_MINTER, supervisor)).to.be.false();
      });
    });
  });

  describe('roles and ownership', async () => {
    let tokenGovernance;
    const governor = accounts[1];

    beforeEach(async () => {
      tokenGovernance = await TokenGovernance.new(token.address, { from: supervisor });

      await tokenGovernance.grantRole(ROLE_GOVERNOR, governor, { from: supervisor });
    });

    context('non-supervisor', async () => {
      const nonSupervisor = accounts[3];

      it('should revert when trying to accept the ownership over the token', async () => {
        await token.transferOwnership(tokenGovernance.address, { from: supervisor });

        await expectRevert(tokenGovernance.acceptTokenOwnership({ from: nonSupervisor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when trying to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_SUPERVISOR, newSupervisor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          tokenGovernance.revokeRole(ROLE_SUPERVISOR, governor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_GOVERNOR, newGovernor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          tokenGovernance.revokeRole(ROLE_GOVERNOR, governor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Minter role', async () => {
        const newMinter = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_MINTER, newMinter, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );

        await tokenGovernance.grantRole(ROLE_MINTER, newMinter, { from: governor });

        await expectRevert(
          tokenGovernance.revokeRole(ROLE_MINTER, newMinter, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('supervisor', async () => {
      it('should be able to accept the ownership over the token', async () => {
        await token.transferOwnership(tokenGovernance.address, { from: supervisor });

        await tokenGovernance.acceptTokenOwnership({ from: supervisor });
        expect(await token.owner.call()).to.eql(tokenGovernance.address);
      });

      it('should be able to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await tokenGovernance.grantRole(ROLE_SUPERVISOR, newSupervisor, { from: supervisor });
        expect(await tokenGovernance.hasRole.call(ROLE_SUPERVISOR, newSupervisor)).to.be.true();

        await tokenGovernance.revokeRole(ROLE_SUPERVISOR, newSupervisor, { from: supervisor });
        expect(await tokenGovernance.hasRole.call(ROLE_SUPERVISOR, newSupervisor)).to.be.false();
      });

      it('should be able to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await tokenGovernance.grantRole(ROLE_GOVERNOR, newGovernor, { from: supervisor });
        expect(await tokenGovernance.hasRole.call(ROLE_GOVERNOR, newGovernor)).to.be.true();

        await tokenGovernance.revokeRole(ROLE_GOVERNOR, newGovernor, { from: supervisor });
        expect(await tokenGovernance.hasRole.call(ROLE_GOVERNOR, newGovernor)).to.be.false();
      });

      it('should revert when trying to control the Minter role', async () => {
        const newMinter = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_MINTER, newMinter, { from: supervisor }),
          'AccessControl: sender must be an admin to grant'
        );

        await tokenGovernance.grantRole(ROLE_MINTER, newMinter, { from: governor });

        await expectRevert(
          tokenGovernance.revokeRole(ROLE_MINTER, newMinter, { from: supervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('governor', async () => {
      it('should revert when trying to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_SUPERVISOR, newSupervisor, { from: governor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          tokenGovernance.revokeRole(ROLE_SUPERVISOR, governor, { from: governor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await expectRevert(
          tokenGovernance.grantRole(ROLE_GOVERNOR, newGovernor, { from: governor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          tokenGovernance.revokeRole(ROLE_GOVERNOR, governor, { from: governor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should be able to control the Minter role', async () => {
        const newMinter = accounts[2];

        await tokenGovernance.grantRole(ROLE_MINTER, newMinter, { from: governor });
        expect(await tokenGovernance.hasRole.call(ROLE_MINTER, newMinter)).to.be.true();

        await tokenGovernance.revokeRole(ROLE_MINTER, newMinter, { from: governor });
        expect(await tokenGovernance.hasRole.call(ROLE_MINTER, newMinter)).to.be.false();
      });
    });
  });

  describe('token management', async () => {
    let tokenGovernance;
    const governor = accounts[1];
    const tokenOwner = accounts[2];
    const minter = accounts[7];
    const minter2 = accounts[8];

    beforeEach(async () => {
      await token.issue(tokenOwner, new BN(1000000));

      tokenGovernance = await TokenGovernance.new(token.address, { from: supervisor });

      await token.transferOwnership(tokenGovernance.address, { from: supervisor });
      await tokenGovernance.acceptTokenOwnership({ from: supervisor });

      await tokenGovernance.grantRole(ROLE_GOVERNOR, governor, { from: supervisor });

      await tokenGovernance.grantRole(ROLE_MINTER, minter, { from: governor });
      await tokenGovernance.grantRole(ROLE_MINTER, minter2, { from: governor });
    });

    describe('issuing', async () => {
      it('should revert when a Supervisor role tries to issue new tokens', async () => {
        await expectRevert(tokenGovernance.mint(tokenOwner, new BN(1000), { from: supervisor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a Governor role tries to issue new tokens', async () => {
        await expectRevert(tokenGovernance.mint(tokenOwner, new BN(1000), { from: governor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a non-minter role tries to issue new tokens', async () => {
        await expectRevert(tokenGovernance.mint(tokenOwner, new BN(1000), { from: tokenOwner }), 'ERR_ACCESS_DENIED');
      });

      it('should allow minters to issue new tokens', async () => {
        const value = new BN(1000);
        let balance = await token.balanceOf.call(tokenOwner);
        await tokenGovernance.mint(tokenOwner, value, { from: minter });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value));

        const value2 = new BN(555555);
        balance = await token.balanceOf.call(tokenOwner);
        await tokenGovernance.mint(tokenOwner, value2, { from: minter2 });
        newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value2));
      });
    });

    describe('destroying', async () => {
      it('should allow token holders to destroy their own tokens', async () => {
        const value = new BN(100);
        const balance = await token.balanceOf.call(tokenOwner);
        await tokenGovernance.burn(value, { from: tokenOwner });
        const newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value));
      });
    });
  });
});
