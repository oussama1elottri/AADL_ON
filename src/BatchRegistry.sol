// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BatchRegistry is AccessControl, ReentrancyGuard {
    // STATE VARIABLES
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 private _batchCounter;

    mapping(uint256 => bytes32) public merkleRoots;

    // EVENTS
    event BatchCommitted(
        uint256 indexed batchId,
        bytes32 indexed merkleRoot,
        address indexed operator,
        uint16 wilaya,
        uint256 batchSize,
        bytes metadata
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function commitBatch(bytes32 _merkleRoot, uint16 _wilaya, uint256 _batchSize, bytes calldata _metadata)
        public
        virtual
        nonReentrant
        onlyRole(OPERATOR_ROLE)
        returns (uint256)
    {
        // Basic validation
        require(_merkleRoot != bytes32(0), "BatchRegistry: invalid merkle root");
        require(_batchSize > 0, "BatchRegistry: batch size must be > 0");

        _batchCounter++;
        merkleRoots[_batchCounter] = _merkleRoot;

        emit BatchCommitted(_batchCounter, _merkleRoot, msg.sender, _wilaya, _batchSize, _metadata);

        return _batchCounter;
    }
    function getCurrentBatchId() public view returns (uint256) {
        return _batchCounter;
        }

}

