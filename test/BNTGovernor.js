const { expect } = require('chai');

const { BN, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const BNTGovernor = artifacts.require('BNTGovernor');
const SmartToken = artifacts.require('SmartToken');

contract('BNTGovernor', async (accounts) => {
  const GOVERNOR_ROLE = web3.utils.keccak256('GOVERNOR_ROLE');
  const MINTER_ROLE = web3.utils.keccak256('MINTER_ROLE');

  let token;
  const governor = accounts[0];

  beforeEach(async () => {
    token = await SmartToken.new('BNT Token', 'BNT', { from: governor });
  });

  describe('construction', async () => {
    context('invalid', async () => {
      it('should revert when initialized with an empty token', async () => {
        await expectRevert(BNTGovernor.new(ZERO_ADDRESS), 'ERR_INVALID_ADDRESS');
      });
    });

    context('valid', async () => {
      let bntGovernor;

      beforeEach(async () => {
        bntGovernor = await BNTGovernor.new(token.address, { from: governor });
      });

      it('should initialize the token', async () => {
        expect(await bntGovernor.token.call()).to.eql(token.address);
      });

      it('should set the correct permissions', async () => {
        expect(await bntGovernor.getRoleMemberCount.call(GOVERNOR_ROLE)).to.be.bignumber.equal(new BN(1));
        expect(await bntGovernor.getRoleMemberCount.call(MINTER_ROLE)).to.be.bignumber.equal(new BN(0));

        expect(await bntGovernor.getRoleAdmin.call(GOVERNOR_ROLE)).to.eql(GOVERNOR_ROLE);
        expect(await bntGovernor.getRoleAdmin.call(MINTER_ROLE)).to.eql(GOVERNOR_ROLE);

        expect(await bntGovernor.hasRole.call(GOVERNOR_ROLE, governor)).to.be.true();
        expect(await bntGovernor.hasRole.call(MINTER_ROLE, governor)).to.be.false();
      });
    });
  });

  describe('roles and ownership', async () => {
    let bntGovernor;

    beforeEach(async () => {
      bntGovernor = await BNTGovernor.new(token.address, { from: governor });
    });

    context('non-governor', async () => {
      const nonGovernor = accounts[3];

      it('should revert when trying to accept the ownership over the token', async () => {
        await token.transferOwnership(bntGovernor.address, { from: governor });

        await expectRevert(bntGovernor.acceptTokenOwnership({ from: nonGovernor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when trying to control the GOVERNOR role', async () => {
        const newGovernor = accounts[2];

        await expectRevert(
          bntGovernor.grantRole(GOVERNOR_ROLE, newGovernor, { from: nonGovernor }),
          'AccessControl: sender must be an admin to grant'
        );
        await expectRevert(
          bntGovernor.revokeRole(GOVERNOR_ROLE, governor, { from: nonGovernor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });

      it('should revert when trying to control the MINTER role', async () => {
        const newMinter = accounts[2];

        await expectRevert(
          bntGovernor.grantRole(MINTER_ROLE, newMinter, { from: nonGovernor }),
          'AccessControl: sender must be an admin to grant'
        );

        await bntGovernor.grantRole(MINTER_ROLE, newMinter, { from: governor });

        await expectRevert(
          bntGovernor.revokeRole(MINTER_ROLE, newMinter, { from: nonGovernor }),
          'AccessControl: sender must be an admin to revoke'
        );
      });
    });

    context('governor', async () => {
      it('should be able to accept the ownership over the token', async () => {
        await token.transferOwnership(bntGovernor.address, { from: governor });

        await bntGovernor.acceptTokenOwnership({ from: governor });
        expect(await token.owner.call()).to.eql(bntGovernor.address);
      });

      it('should be able to control the GOVERNOR role', async () => {
        const newGovernor = accounts[2];

        await bntGovernor.grantRole(GOVERNOR_ROLE, newGovernor, { from: governor });
        expect(await bntGovernor.hasRole.call(GOVERNOR_ROLE, newGovernor)).to.be.true();

        await bntGovernor.revokeRole(GOVERNOR_ROLE, newGovernor, { from: governor });
        expect(await bntGovernor.hasRole.call(GOVERNOR_ROLE, newGovernor)).to.be.false();
      });

      it('should be able to control the MINTER role', async () => {
        const newMinter = accounts[2];

        await bntGovernor.grantRole(MINTER_ROLE, newMinter, { from: governor });
        expect(await bntGovernor.hasRole.call(MINTER_ROLE, newMinter)).to.be.true();

        await bntGovernor.revokeRole(MINTER_ROLE, newMinter, { from: governor });
        expect(await bntGovernor.hasRole.call(MINTER_ROLE, newMinter)).to.be.false();
      });
    });
  });

  describe('token management', async () => {
    let bntGovernor;
    const tokenOwner = accounts[1];
    const nonMinter = accounts[6];
    const minter = accounts[7];
    const minter2 = accounts[8];

    beforeEach(async () => {
      await token.issue(tokenOwner, new BN(1000000));

      bntGovernor = await BNTGovernor.new(token.address, { from: governor });

      await token.transferOwnership(bntGovernor.address, { from: governor });
      await bntGovernor.acceptTokenOwnership({ from: governor });

      await bntGovernor.grantRole(MINTER_ROLE, minter, { from: governor });
      await bntGovernor.grantRole(MINTER_ROLE, minter2, { from: governor });
    });

    describe('issuing', async () => {
      it('should revert when a GOVERNOR role tries to issue new tokens', async () => {
        await expectRevert(bntGovernor.issue(tokenOwner, new BN(1000), { from: governor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a non-minter role tries to issue new tokens', async () => {
        await expectRevert(bntGovernor.issue(tokenOwner, new BN(1000), { from: tokenOwner }), 'ERR_ACCESS_DENIED');
      });

      it('should allow minters to issue new tokens', async () => {
        const value = new BN(1000);
        let balance = await token.balanceOf.call(tokenOwner);
        await bntGovernor.issue(tokenOwner, value, { from: minter });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value));

        const value2 = new BN(555555);
        balance = await token.balanceOf.call(tokenOwner);
        await bntGovernor.issue(tokenOwner, value2, { from: minter2 });
        newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.add(value2));
      });
    });

    describe('destroying', async () => {
      it('should revert when a GOVERNOR role tries to destroy existing tokens', async () => {
        await expectRevert(bntGovernor.destroy(tokenOwner, new BN(1000), { from: governor }), 'ERR_ACCESS_DENIED');
      });

      it('should revert when a non-minter role tries to destroy existing tokens', async () => {
        await expectRevert(bntGovernor.destroy(tokenOwner, new BN(1000), { from: nonMinter }), 'ERR_ACCESS_DENIED');
      });

      it('should allow minters to destroy existing tokens', async () => {
        const value = new BN(1000);
        let balance = await token.balanceOf.call(tokenOwner);
        await bntGovernor.destroy(tokenOwner, value, { from: minter });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value));

        const value2 = new BN(1222);
        balance = await token.balanceOf.call(tokenOwner);
        await bntGovernor.destroy(tokenOwner, value2, { from: minter2 });
        newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value2));
      });

      it('should allow token holders to destroy their own tokens', async () => {
        const value = new BN(100);
        let balance = await token.balanceOf.call(tokenOwner);
        await bntGovernor.destroy(tokenOwner, value, { from: tokenOwner });
        let newBalance = await token.balanceOf.call(tokenOwner);
        expect(newBalance).to.be.bignumber.equal(balance.sub(value));
      });
    });
  });
});
