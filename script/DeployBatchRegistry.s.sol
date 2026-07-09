// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";

contract DeployBatchRegistry is Script {
    function setUp() public {}

    function run() public returns (BatchRegistry) {
        vm.startBroadcast();

        BatchRegistry batchRegistry = new BatchRegistry();

        vm.stopBroadcast();
        return batchRegistry;
    }
}
