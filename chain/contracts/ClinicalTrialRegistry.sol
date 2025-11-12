// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ClinicalTrialRegistry {
    enum Consent { None, Active, Revoked }

    address public hospital;
    mapping(address => Consent) public patientConsent;

    event ConsentGranted(address indexed patient, uint256 timestamp);
    event ConsentRevoked(address indexed patient, uint256 timestamp);
    event DataUploaded(address indexed patient, bytes32 dataHash, uint256 timestamp);
    event DataAccess(address indexed patient, address indexed accessor, string purpose, uint256 timestamp);

    modifier onlyHospital() {
        require(msg.sender == hospital, "not hospital");
        _;
    }

    constructor(address _hospital) {
        hospital = _hospital;
    }

    function grantConsent() external {
        patientConsent[msg.sender] = Consent.Active;
        emit ConsentGranted(msg.sender, block.timestamp);
    }

    function revokeConsent() external {
        require(patientConsent[msg.sender] == Consent.Active, "no active consent");
        patientConsent[msg.sender] = Consent.Revoked;
        emit ConsentRevoked(msg.sender, block.timestamp);
    }

    function uploadData(bytes32 dataHash) external {
        emit DataUploaded(msg.sender, dataHash, block.timestamp);
    }

    function viewData(address patient, string calldata purpose) external onlyHospital {
        require(patientConsent[patient] == Consent.Active, "consent not active");
        emit DataAccess(patient, msg.sender, purpose, block.timestamp);
    }
}
