pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
// import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract BatchRegistryTest is Test {
    BatchRegistry public batchRegistry;
    address public deployer;
    address public attacker;

    function setUp() public {
        deployer = msg.sender;
        batchRegistry = new BatchRegistry();
        attacker = address(0xBEEF);
    }

    function testcommitBatch() public {
        // Arrange
        bytes32 sampleMerkleRoot = keccak256(abi.encodePacked("sample_root"));
        uint16 sampleWilaya = 17;
        uint256 sampleBatchSize = 1000;
        bytes memory sampleMetadata = abi.encodePacked("Q1_2025");

        batchRegistry.grantRole(batchRegistry.OPERATOR_ROLE(), deployer);

        // Act & Assert
        vm.expectEmit(true, true, true, false);
        emit BatchRegistry.BatchCommitted(
            1,
            sampleMerkleRoot,
            deployer,
            sampleWilaya,
            sampleBatchSize,
            sampleMetadata
        );

        vm.prank(deployer);
        uint256 batchId = batchRegistry.commitBatch(
            sampleMerkleRoot,
            sampleWilaya,
            sampleBatchSize,
            sampleMetadata
        );

        assertEq(batchId, 1, "The returned batch ID should be 1.");

        bytes32 storedRoot = batchRegistry.merkleRoots(1);
        assertEq(
            storedRoot,
            sampleMerkleRoot,
            "The stored Merkle root does not match the input."
        );
    }

    function test_Revert_When_NotOperator() public {
        // Arrange
        bytes32 sampleMerkleRoot = keccak256(abi.encodePacked("sample_root"));
        uint16 sampleWilaya = 17;
        uint256 sampleBatchSize = 1000;
        bytes memory sampleMetadata = abi.encodePacked("Q1_2025");
        // Act & Assert
        bytes4 selector = bytes4(
            keccak256("AccessControlUnauthorizedAccount(address,bytes32)")
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                selector,
                attacker,
                batchRegistry.OPERATOR_ROLE()
            )
        );
        vm.prank(attacker);
        batchRegistry.commitBatch(
            sampleMerkleRoot,
            sampleWilaya,
            sampleBatchSize,
            sampleMetadata
        );
    }
}
