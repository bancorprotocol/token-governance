// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../ISmartToken.sol";
import "./Owned.sol";

/// @title Smart Token
contract SmartToken is ISmartToken, ERC20, Owned {
    bool public transfersEnabled = true;

    /// @dev initializes a new SmartToken instance.
    ///
    /// @param name token name.
    /// @param symbol token short symbol.
    ///
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {}

    modifier transfersAllowed {
        require(transfersEnabled, "ERR_TRANSFERS_DISABLED");

        _;
    }

    /// @dev Increases the token supply and sends the new tokens to the given account.
    ///
    /// @param to Account to receive the new amount.
    /// @param amount Amount to increase the supply by.
    ///
    function issue(address to, uint256 amount) public override ownerOnly {
        _mint(to, amount);
    }

    /// @dev Removes tokens from the given account and decreases the token supply.
    ///
    /// @param from Account to remove the amount from.
    /// @param amount Amount to decrease the supply by.
    ///
    function destroy(address from, uint256 amount) public override ownerOnly {
        _burn(from, amount);
    }

    /// @dev Transfers tokens.
    /// @param to Target address.
    /// @param value Amount to transfer.
    ///
    /// @return true if the transfer was successful, false if it wasn't
    ///
    function transfer(address to, uint256 value) public override(IERC20, ERC20) transfersAllowed returns (bool) {
        return super.transfer(to, value);
    }

    /// @dev Transfers tokens from another account.

    /// @param from Source address.
    /// @param to Target address.
    /// @param value Transfer amount.
    ///
    /// @return true if the transfer was successful, false if it wasn't
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override(IERC20, ERC20) transfersAllowed returns (bool) {
        return super.transferFrom(from, to, value);
    }
}
