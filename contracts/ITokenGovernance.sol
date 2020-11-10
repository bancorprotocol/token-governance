// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./ISmartToken.sol";

/// @title The interface for mintable/burnable token governance.
interface ITokenGovernance {
    // The address of the mintable ERC20 token.
    function token() external view returns (ISmartToken);

    /// @dev Mints new tokens.
    ///
    /// @param to Account to receive the new amount.
    /// @param amount Amount to increase the supply by.
    ///
    function mint(address to, uint256 amount) external;

    /// @dev Burns existing tokens.
    ///
    /// @param from Account to remove the amount from.
    /// @param amount Amount to decrease the supply by.
    ///
    function burn(address from, uint256 amount) external;
}
