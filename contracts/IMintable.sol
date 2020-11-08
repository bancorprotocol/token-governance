// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/// @title The interface for mintable/burnable tokens.
interface IMintable {
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
