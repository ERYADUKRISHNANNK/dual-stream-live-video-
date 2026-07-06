// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DecentralizedID {
    struct Identity {
        string didUri;
        string publicKey;
        string credentialsHash;
        uint256 createdAt;
        bool active;
    }

    mapping(address => Identity) private _identities;
    mapping(string => address) private _didToAddress;

    event DIDRegistered(address indexed owner, string didUri, string publicKey);
    event DIDDeactivated(address indexed owner, string didUri);
    event CredentialsUpdated(address indexed owner, string credentialsHash);

    function registerDID(string memory didUri, string memory publicKey) public {
        require(bytes(didUri).length > 0, "DID URI cannot be empty");
        require(bytes(_identities[msg.sender].didUri).length == 0, "DID already registered for this address");
        require(_didToAddress[didUri] == address(0), "DID URI already in use");

        _identities[msg.sender] = Identity({
            didUri: didUri,
            publicKey: publicKey,
            credentialsHash: "",
            createdAt: block.timestamp,
            active: true
        });

        _didToAddress[didUri] = msg.sender;

        emit DIDRegistered(msg.sender, didUri, publicKey);
    }

    function getDID(address owner) public view returns (
        string memory didUri,
        string memory publicKey,
        string memory credentialsHash,
        uint256 createdAt,
        bool active
    ) {
        Identity memory identity = _identities[owner];
        require(bytes(identity.didUri).length > 0, "DID not found");
        return (
            identity.didUri,
            identity.publicKey,
            identity.credentialsHash,
            identity.createdAt,
            identity.active
        );
    }

    function updateCredentials(string memory credentialsHash) public {
        Identity storage identity = _identities[msg.sender];
        require(bytes(identity.didUri).length > 0, "DID not registered");
        require(identity.active, "DID is inactive");

        identity.credentialsHash = credentialsHash;
        emit CredentialsUpdated(msg.sender, credentialsHash);
    }

    function deactivateDID() public {
        Identity storage identity = _identities[msg.sender];
        require(bytes(identity.didUri).length > 0, "DID not registered");
        require(identity.active, "DID already deactivated");

        identity.active = false;
        emit DIDDeactivated(msg.sender, identity.didUri);
    }

    function resolveDID(string memory didUri) public view returns (address) {
        address owner = _didToAddress[didUri];
        require(owner != address(0), "DID URI could not be resolved");
        return owner;
    }
}
