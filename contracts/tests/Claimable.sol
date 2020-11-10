// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../IClaimable.sol";

/// @title Provides support and utilities for contract ownership.
contract Claimable is IClaimable {
    address public override owner;
    address public newOwner;

    /// @dev Triggered when the owner is updated.
    ///
    /// @param prevOwner previous owner.
    /// @param newOwner  new owner.
    event OwnerUpdate(address indexed prevOwner, address indexed newOwner);

    /// @dev Initializes a new Owned instance.
    constructor() public {
        owner = msg.sender;
    }

    modifier ownerOnly {
        require(msg.sender == owner, "ERR_ACCESS_DENIED");

        _;
    }

    /// @dev Allows transferring the contract ownership.
    ///
    /// @param newOwnerCandidate New contract owner candidate.
    function transferOwnership(address newOwnerCandidate) public override ownerOnly {
        require(newOwnerCandidate != owner, "ERR_SAME_OWNER");

        newOwner = newOwnerCandidate;
    }

    /// @dev Used by a new owner to accept an ownership transfer.
    function acceptOwnership() public override {
        require(msg.sender == newOwner, "ERR_ACCESS_DENIED");

        emit OwnerUpdate(owner, newOwner);

        owner = newOwner;
        newOwner = address(0);
    }
}
