// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./IMintable.sol";
import "./ISmartToken.sol";

/// @title The Token Governance contract is used to govern the a mintable ERC20 token by restricting its launch-time initial
/// administrative privileges.
contract TokenGovernance is IMintable, AccessControl {
    // The supervisor role is used to globally govern the contract and its governing roles.
    bytes32 public constant SUPERVISOR_ROLE = keccak256("SUPERVISOR_ROLE");

    // The governor role is used to govern the the minter role.
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    // The minter role is used to control who can request the mintable ERC20 token to mint additional tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // The address of the mintable ERC20 token.
    ISmartToken public token;

    /// @dev Initializes the contract.
    ///
    /// @param mintableToken The address of the mintable ERC20 token.
    constructor(ISmartToken mintableToken) public {
        require(address(mintableToken) != address(0), "ERR_INVALID_ADDRESS");

        token = mintableToken;

        // Set up administrative roles.
        _setRoleAdmin(SUPERVISOR_ROLE, SUPERVISOR_ROLE);
        _setRoleAdmin(GOVERNOR_ROLE, SUPERVISOR_ROLE);
        _setRoleAdmin(MINTER_ROLE, GOVERNOR_ROLE);

        // Allow the deployer to initially govern the contract.
        _setupRole(SUPERVISOR_ROLE, _msgSender());
    }

    /// @dev Accepts the ownership of the token. Only allowed by the GOVERNOR role.
    function acceptTokenOwnership() external {
        require(hasRole(SUPERVISOR_ROLE, _msgSender()), "ERR_ACCESS_DENIED");

        token.acceptOwnership();
    }

    /// @dev Mints new tokens. Only allowed by the MINTER role.
    ///
    /// @param to Account to receive the new amount.
    /// @param amount Amount to increase the supply by.
    ///
    function mint(address to, uint256 amount) external override {
        require(hasRole(MINTER_ROLE, _msgSender()), "ERR_ACCESS_DENIED");

        token.issue(to, amount);
    }

    /// @dev Burns existing tokens. Only allowed by the MINTER role or the owners themselves.
    ///
    /// @param from Account to remove the amount from.
    /// @param amount Amount to decrease the supply by.
    ///
    function burn(address from, uint256 amount) external override {
        address msgSender = _msgSender();
        require(hasRole(MINTER_ROLE, msgSender) || from == msgSender, "ERR_ACCESS_DENIED");

        token.destroy(from, amount);
    }
}
