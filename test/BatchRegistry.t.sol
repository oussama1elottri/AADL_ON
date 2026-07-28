// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {Verifier, Pairing} from "../src/Verifier.sol";

contract BatchRegistryTest is Test {
    BatchRegistry public batchRegistry;
    Verifier public verifier;
    address public deployer;
    address public attacker;

    function setUp() public {
        deployer = address(this);
        attacker = address(0xBEEF);
        verifier = new Verifier();
        batchRegistry = new BatchRegistry(address(verifier));
    }

    function test_InitialState() public view {
        assertEq(address(batchRegistry.verifier()), address(verifier));
        assertEq(batchRegistry.getCurrentBatchId(), 0);
        assertTrue(batchRegistry.hasRole(batchRegistry.DEFAULT_ADMIN_ROLE(), deployer));
        assertTrue(batchRegistry.hasRole(batchRegistry.OPERATOR_ROLE(), deployer));
    }

    function test_CommitBatch_Success() public {
        bytes32 sampleMerkleRoot = keccak256(abi.encodePacked("sample_root"));
        uint16 sampleWilaya = 17;
        uint256 sampleBatchSize = 1000;
        bytes memory sampleMetadata = abi.encodePacked("Q1_2026");

        vm.expectEmit(true, true, true, true);
        emit BatchRegistry.BatchCommitted(
            1,
            sampleMerkleRoot,
            deployer,
            sampleWilaya,
            sampleBatchSize,
            sampleMetadata
        );

        uint256 batchId = batchRegistry.commitBatch(
            sampleMerkleRoot,
            sampleWilaya,
            sampleBatchSize,
            sampleMetadata
        );

        assertEq(batchId, 1);
        assertEq(batchRegistry.merkleRoots(1), sampleMerkleRoot);
        assertEq(batchRegistry.getCurrentBatchId(), 1);
    }

    function test_Revert_When_NotOperator() public {
        bytes32 sampleMerkleRoot = keccak256(abi.encodePacked("sample_root"));
        bytes4 selector = bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)"));

        vm.expectRevert(abi.encodeWithSelector(selector, attacker, batchRegistry.OPERATOR_ROLE()));
        vm.prank(attacker);
        batchRegistry.commitBatch(sampleMerkleRoot, 17, 100, "meta");
    }

    function test_Revert_InvalidMerkleRoot() public {
        vm.expectRevert(BatchRegistry.InvalidMerkleRoot.selector);
        batchRegistry.commitBatch(bytes32(0), 17, 100, "meta");
    }

    function test_Revert_InvalidBatchSize() public {
        bytes32 sampleMerkleRoot = keccak256(abi.encodePacked("sample_root"));
        vm.expectRevert(BatchRegistry.InvalidBatchSize.selector);
        batchRegistry.commitBatch(sampleMerkleRoot, 17, 0, "meta");
    }

    function test_SetVerifier_Success() public {
        Verifier newVerifier = new Verifier();
        
        vm.expectEmit(true, false, false, false);
        emit BatchRegistry.VerifierUpdated(address(newVerifier));

        batchRegistry.setVerifier(address(newVerifier));
        assertEq(address(batchRegistry.verifier()), address(newVerifier));
    }

    function test_SetVerifier_Revert_ZeroAddress() public {
        vm.expectRevert(BatchRegistry.ZeroAddress.selector);
        batchRegistry.setVerifier(address(0));
    }

    function test_SetVerifier_Revert_NotAdmin() public {
        bytes4 selector = bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)"));
        vm.expectRevert(abi.encodeWithSelector(selector, attacker, batchRegistry.DEFAULT_ADMIN_ROLE()));
        vm.prank(attacker);
        batchRegistry.setVerifier(address(verifier));
    }

    function test_VerifyZkProof_Revert_VerifierNotSet() public {
        BatchRegistry unlinkedRegistry = new BatchRegistry(address(0));
        Verifier.Proof memory proof;
        uint256[1] memory inputs;

        vm.expectRevert(BatchRegistry.VerifierNotSet.selector);
        unlinkedRegistry.verifyZkProof(proof, inputs);
    }
}
