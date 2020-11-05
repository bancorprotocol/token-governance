const { expect } = require('chai');

const { BN, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const BNTGovernance = artifacts.require('BNTGovernance');
const SmartToken = artifacts.require('SmartToken');

contract('BNTGovernance', async (accounts) => {
  const SUPERVISOR_ROLE = web3.utils.keccak256('SUPERVISOR_ROLE');
  const GOVERNOR_ROLE = web3.utils.keccak256('GOVERNOR_ROLE');
  const MINTER_ROLE = web3.utils.keccak256('MINTER_ROLE');

  let token;
  const supervisor = accounts[0];

  beforeEach(async () => {
    token = await SmartToken.new('BNT Token', 'BNT', { from: supervisor });
  });

  describe('construction', async () => {
    context('invalid', async () => {
      it('should revert when initialized with an empty token', async () => {
        await expectRevert(BNTGovernance.new(ZERO_ADDRESS), 'ERR_INVALID_ADDRESS');
      });
    });

    context('valid', async () => {
      let bntGovernance;

      beforeEach(async () => {
        bntGovernance = await BNTGovernance.new(token.address, { from: supervisor });
      });

      it('should initialize the token', async () => {
        expect(await bntGovernance.token.call()).to.eql(token.address);
      });

      it('should set the correct permissions', async () => {
        expect(await bntGovernance.getRoleMemberCount.call(SUPERVISOR_ROLE)).to.be.bignumber.equal(new BN(1));
        expect(await bntGovernance.getRoleMemberCount.call(GOVERNOR_ROLE)).to.be.bignumber.equal(new BN(0));
        expect(await bntGovernance.getRoleMemberCount.call(MINTER_ROLE)).to.be.bignumber.equal(new BN(0));

        expect(await bntGovernance.getRoleAdmin.call(SUPERVISOR_ROLE)).to.eql(SUPERVISOR_ROLE);
        expect(await bntGovernance.getRoleAdmin.call(GOVERNOR_ROLE)).to.eql(SUPERVISOR_ROLE);
        expect(await bntGovernance.getRoleAdmin.call(MINTER_ROLE)).to.eql(GOVERNOR_ROLE);

        expect(await bntGovernance.hasRole.call(SUPERVISOR_ROLE, supervisor)).to.be.true();
        expect(await bntGovernance.hasRole.call(GOVERNOR_ROLE, supervisor)).to.be.false();
        expect(await bntGovernance.hasRole.call(MINTER_ROLE, supervisor)).to.be.false();
      });
    });
  });

  describe('roles and ownership', async () => {
    let bntGovernance;
    const governor = accounts[1];

    beforeEach(async () => {
      bntGovernance = await BNTGovernance.new(token.address, { from: supervisor });

      await bntGovernance.grantRole(GOVERNOR_ROLE, governor, { from: supervisor });
    });

    context('non-supervisor', async () => {
      const nonSupervisor = accounts[3];

      it('should revert when trying to accept the ownership over the token', async () => {
        await token.transferOwnership(bntGovernance.address, { from: supervisor });

        await expectRevert(bntGovernance.acceptTokenOwnership({ from: nonSupervisor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when trying to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(SUPERVISOR_ROLE, newSupervisor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          bntGovernance.revokeRole(SUPERVISOR_ROLE, governor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(GOVERNOR_ROLE, newGovernor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          bntGovernance.revokeRole(GOVERNOR_ROLE, governor, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Minter role', async () => {
        const newMinter = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(MINTER_ROLE, newMinter, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to grant'
        );

        await bntGovernance.grantRole(MINTER_ROLE, newMinter, { from: governor });

        await expectRevert(
          bntGovernance.revokeRole(MINTER_ROLE, newMinter, { from: nonSupervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('supervisor', async () => {
      it('should be able to accept the ownership over the token', async () => {
        await token.transferOwnership(bntGovernance.address, { from: supervisor });

        await bntGovernance.acceptTokenOwnership({ from: supervisor });
        expect(await token.owner.call()).to.eql(bntGovernance.address);
      });

      it('should be able to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await bntGovernance.grantRole(SUPERVISOR_ROLE, newSupervisor, { from: supervisor });
        expect(await bntGovernance.hasRole.call(SUPERVISOR_ROLE, newSupervisor)).to.be.true();

        await bntGovernance.revokeRole(SUPERVISOR_ROLE, newSupervisor, { from: supervisor });
        expect(await bntGovernance.hasRole.call(SUPERVISOR_ROLE, newSupervisor)).to.be.false();
      });

      it('should be able to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await bntGovernance.grantRole(GOVERNOR_ROLE, newGovernor, { from: supervisor });
        expect(await bntGovernance.hasRole.call(GOVERNOR_ROLE, newGovernor)).to.be.true();

        await bntGovernance.revokeRole(GOVERNOR_ROLE, newGovernor, { from: supervisor });
        expect(await bntGovernance.hasRole.call(GOVERNOR_ROLE, newGovernor)).to.be.false();
      });

      it('should revert when trying to control the Minter role', async () => {
        const newMinter = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(MINTER_ROLE, newMinter, { from: supervisor }),
          'AccessControl: sender must be an admin to grant'
        );

        await bntGovernance.grantRole(MINTER_ROLE, newMinter, { from: governor });

        await expectRevert(
          bntGovernance.revokeRole(MINTER_ROLE, newMinter, { from: supervisor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('governor', async () => {
      it('should revert when trying to control the Supervisor role', async () => {
        const newSupervisor = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(SUPERVISOR_ROLE, newSupervisor, { from: governor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          bntGovernance.revokeRole(SUPERVISOR_ROLE, governor, { from: governor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the Governor role', async () => {
        const newGovernor = accounts[2];

        await expectRevert(
          bntGovernance.grantRole(GOVERNOR_ROLE, newGovernor, { from: governor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          bntGovernance.revokeRole(GOVERNOR_ROLE, governor, { from: governor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should be able to control the Minter role', async () => {
        const newMinter = accounts[2];

        await bntGovernance.grantRole(MINTER_ROLE, newMinter, { from: governor });
        expect(await bntGovernance.hasRole.call(MINTER_ROLE, newMinter)).to.be.true();

        await bntGovernance.revokeRole(MINTER_ROLE, newMinter, { from: governor });
        expect(await bntGovernance.hasRole.call(MINTER_ROLE, newMinter)).to.be.false();
      });
    });
  });

  describe('token management', async () => {
    let bntGovernance;
    const governor = accounts[1];
    const tokenOwner = accounts[2];
    const nonMinter = accounts[6];
    const minter = accounts[7];
    const minter2 = accounts[8];

    beforeEach(async () => {
      await token.issue(tokenOwner, new BN(1000000));

      bntGovernance = await BNTGovernance.new(token.address, { from: supervisor });

      await token.transferOwnership(bntGovernance.address, { from: supervisor });
      await bntGovernance.acceptTokenOwnership({ from: supervisor });

      await bntGovernance.grantRole(GOVERNOR_ROLE, governor, { from: supervisor });

      await bntGovernance.grantRole(MINTER_ROLE, minter, { from: governor });
      await bntGovernance.grantRole(MINTER_ROLE, minter2, { from: governor });
    });

    describe('issuing', async () => {
      it('should revert when a Supervisor role tries to issue new tokens', async () => {
        await expectRevert(bntGovernance.mint(tokenOwner, new BN(1000), { from: supervisor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a Governor role tries to issue new tokens', async () => {
        await expectRevert(bntGovernance.mint(tokenOwner, new BN(1000), { from: governor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a non-minter role tries to issue new tokens', async () => {
        await expectRevert(bntGovernance.mint(tokenOwner, new BN(1000), { from: tokenOwner }), 'ERR_ACCESS_DENIED');
      });

      it('should allow minters to issue new tokens', async () => {
        const value = new BN(1000);
        let balance = await token.balanceOf.call(tokenOwner);
        await bntGovernance.mint(tokenOwner, value, { from: minter });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value));

        const value2 = new BN(555555);
        balance = await token.balanceOf.call(tokenOwner);
        await bntGovernance.mint(tokenOwner, value2, { from: minter2 });
        newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value2));
      });
    });

    describe('destroying', async () => {
      it('should revert when a Supervisor role tries to destroy existing tokens', async () => {
        await expectRevert(bntGovernance.burn(tokenOwner, new BN(1000), { from: supervisor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a Governor role tries to destroy existing tokens', async () => {
        await expectRevert(bntGovernance.burn(tokenOwner, new BN(1000), { from: governor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a non-minter role tries to destroy existing tokens', async () => {
        await expectRevert(bntGovernance.burn(tokenOwner, new BN(1000), { from: nonMinter }), 'ERR_ACCESS_DENIED');
      });

      it('should allow minters to destroy existing tokens', async () => {
        const value = new BN(1000);
        let balance = await token.balanceOf.call(tokenOwner);
        await bntGovernance.burn(tokenOwner, value, { from: minter });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value));

        const value2 = new BN(1222);
        balance = await token.balanceOf.call(tokenOwner);
        await bntGovernance.burn(tokenOwner, value2, { from: minter2 });
        newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value2));
      });

      it('should allow token holders to destroy their own tokens', async () => {
        const value = new BN(100);
        const balance = await token.balanceOf.call(tokenOwner);
        await bntGovernance.burn(tokenOwner, value, { from: tokenOwner });
        const newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value));
      });
    });
  });
});
