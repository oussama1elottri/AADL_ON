// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {Verifier} from "../src/Verifier.sol";

contract DeployBatchRegistry is Script {
    function setUp() public {}

    function run() public returns (BatchRegistry, Verifier) {
        vm.startBroadcast();

        BatchRegistry batchRegistry = new BatchRegistry();
        Verifier verifier = new Verifier();

        vm.stopBroadcast();
        return (batchRegistry, verifier);
    }
}

