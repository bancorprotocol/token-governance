// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <=0.8.0;

/// @title Claimable contract interface
interface IClaimable {
    function owner() external view returns (address);

    function transferOwnership(address newOwner) external;

    function acceptOwnership() external;
}
