// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract aadl_on {
// --------------------------------------------------------------
    // Events

    event ApplicantRegistered(bytes32 indexed nationalIdHash, bytes32 fileHash, uint16 indexed wilayaCode);
    event ApplicantDequeued(bytes32 indexed nationalIdHash, uint16 indexed wilayaCode);
    event SelectionStarted(uint256 indexed jobId, uint16 indexed wilayaCode, uint256 count);
    event SelectionExecuted(uint256 indexed jobId, uint256 batchSize, bytes32[] selectedApplicants);
// --------------------------------------------------------------   
    // Structs
    struct Applicant {
        bytes32 nationalIdHash;
        bytes32 fileHash;
        uint16 wilayaCode;
    }
}