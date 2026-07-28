// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Verifier, Pairing} from "./Verifier.sol";

contract BatchRegistry is AccessControl {
    // STATE VARIABLES
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 private _batchCounter;

    mapping(uint256 => bytes32) public merkleRoots;
    Verifier public verifier;

    // CUSTOM ERRORS
    error InvalidMerkleRoot();
    error InvalidBatchSize();
    error VerifierNotSet();
    error ZeroAddress();

    // EVENTS
    event BatchCommitted(
        uint256 indexed batchId,
        bytes32 indexed merkleRoot,
        address indexed operator,
        uint16 wilaya,
        uint256 batchSize,
        bytes metadata
    );

    event VerifierUpdated(address indexed newVerifier);

    constructor(address _verifierAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        if (_verifierAddress != address(0)) {
            verifier = Verifier(_verifierAddress);
            emit VerifierUpdated(_verifierAddress);
        }
    }

    function setVerifier(address _verifierAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_verifierAddress == address(0)) revert ZeroAddress();
        verifier = Verifier(_verifierAddress);
        emit VerifierUpdated(_verifierAddress);
    }

    function commitBatch(bytes32 _merkleRoot, uint16 _wilaya, uint256 _batchSize, bytes calldata _metadata)
        public
        virtual
        onlyRole(OPERATOR_ROLE)
        returns (uint256)
    {
        if (_merkleRoot == bytes32(0)) revert InvalidMerkleRoot();
        if (_batchSize == 0) revert InvalidBatchSize();

        _batchCounter++;
        merkleRoots[_batchCounter] = _merkleRoot;

        emit BatchCommitted(_batchCounter, _merkleRoot, msg.sender, _wilaya, _batchSize, _metadata);

        return _batchCounter;
    }

    function verifyZkProof(
        Verifier.Proof memory _proof,
        uint256[1] memory _publicInputs
    ) public view returns (bool) {
        if (address(verifier) == address(0)) revert VerifierNotSet();
        return verifier.verifyTx(_proof, _publicInputs);
    }

    function getCurrentBatchId() public view returns (uint256) {
        return _batchCounter;
    }
}


