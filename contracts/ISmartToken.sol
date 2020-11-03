// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IOwned.sol";

/// @title Smart Token interface
interface ISmartToken is IERC20, IOwned {
    function issue(address to, uint256 amount) external;

    function destroy(address from, uint256 amount) external;
}
