// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FileRegistry {
    struct FileMetadata {
        string cid;
        string fileHash;
        address owner;
        uint256 timestamp;
        uint8 threatScore;
        string signature;
        bool exists;
    }

    struct AccessPermission {
        bool isGranted;
        uint256 validUntil; // 0 for unlimited, timestamp for limited access
        uint256 maxDownloads; // 0 for unlimited, countdown for limited downloads
        uint256 downloadCount;
    }

    // Storage maps
    mapping(string => FileMetadata) private _files;
    mapping(string => mapping(address => AccessPermission)) private _permissions;
    mapping(address => string[]) private _userOwnedFiles;

    // Global Emergency Lock (Zero Trust override by owner or system admin)
    bool public systemEmergencyLock = false;
    address public contractOwner;

    // Audit logs stored on chain for forensic integrity
    event FileRegistered(string indexed fileId, string cid, string fileHash, address indexed owner, uint8 threatScore);
    event AccessGranted(string indexed fileId, address indexed accessor, uint256 validUntil, uint256 maxDownloads);
    event AccessRevoked(string indexed fileId, address indexed accessor);
    event OwnershipTransferred(string indexed fileId, address indexed previousOwner, address indexed newOwner);
    event AccessLogged(string indexed fileId, address indexed accessor, string action, uint256 timestamp, bool isSuccess);
    event EmergencyLockTriggered(address indexed triggeredBy, bool lockedState);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    modifier onlyFileOwner(string memory fileId) {
        require(_files[fileId].exists, "File does not exist");
        require(_files[fileId].owner == msg.sender, "Not the file owner");
        _;
    }

    modifier whenNotLocked() {
        require(!systemEmergencyLock, "System is under emergency lock");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    function registerFile(
        string memory fileId,
        string memory cid,
        string memory fileHash,
        uint8 threatScore,
        string memory signature
    ) public whenNotLocked {
        require(!_files[fileId].exists, "File already registered");
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(bytes(fileHash).length > 0, "Hash cannot be empty");

        _files[fileId] = FileMetadata({
            cid: cid,
            fileHash: fileHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            threatScore: threatScore,
            signature: signature,
            exists: true
        });

        _userOwnedFiles[msg.sender].push(fileId);

        emit FileRegistered(fileId, cid, fileHash, msg.sender, threatScore);
        emit AccessLogged(fileId, msg.sender, "REGISTER", block.timestamp, true);
    }

    function grantAccess(
        string memory fileId,
        address accessor,
        uint256 durationSeconds,
        uint256 maxDownloads
    ) public onlyFileOwner(fileId) whenNotLocked {
        uint256 validUntil = durationSeconds > 0 ? block.timestamp + durationSeconds : 0;
        
        _permissions[fileId][accessor] = AccessPermission({
            isGranted: true,
            validUntil: validUntil,
            maxDownloads: maxDownloads,
            downloadCount: 0
        });

        emit AccessGranted(fileId, accessor, validUntil, maxDownloads);
        emit AccessLogged(fileId, accessor, "GRANT_ACCESS", block.timestamp, true);
    }

    function revokeAccess(string memory fileId, address accessor) public onlyFileOwner(fileId) whenNotLocked {
        require(_permissions[fileId][accessor].isGranted, "Access was not granted");
        
        _permissions[fileId][accessor].isGranted = false;

        emit AccessRevoked(fileId, accessor);
        emit AccessLogged(fileId, accessor, "REVOKE_ACCESS", block.timestamp, true);
    }

    function transferOwnership(string memory fileId, address newOwner) public onlyFileOwner(fileId) whenNotLocked {
        require(newOwner != address(0), "Invalid new owner address");
        address prevOwner = msg.sender;
        
        _files[fileId].owner = newOwner;
        _userOwnedFiles[newOwner].push(fileId);

        emit OwnershipTransferred(fileId, prevOwner, newOwner);
        emit AccessLogged(fileId, prevOwner, "TRANSFER_OWNERSHIP", block.timestamp, true);
    }

    function verifyAccess(string memory fileId, address accessor) public returns (bool) {
        if (systemEmergencyLock) {
            emit AccessLogged(fileId, accessor, "VERIFY_FAILED_LOCK", block.timestamp, false);
            return false;
        }

        FileMetadata memory file = _files[fileId];
        if (!file.exists) {
            emit AccessLogged(fileId, accessor, "VERIFY_FAILED_EXISTS", block.timestamp, false);
            return false;
        }

        // Owner always has access
        if (file.owner == accessor) {
            emit AccessLogged(fileId, accessor, "VERIFY_SUCCESS_OWNER", block.timestamp, true);
            return true;
        }

        AccessPermission storage perm = _permissions[fileId][accessor];
        if (!perm.isGranted) {
            emit AccessLogged(fileId, accessor, "VERIFY_FAILED_NOT_GRANTED", block.timestamp, false);
            return false;
        }

        // Time checks
        if (perm.validUntil > 0 && block.timestamp > perm.validUntil) {
            perm.isGranted = false; // Auto-revoke on expired check
            emit AccessLogged(fileId, accessor, "VERIFY_FAILED_EXPIRED", block.timestamp, false);
            return false;
        }

        // Download limit checks
        if (perm.maxDownloads > 0 && perm.downloadCount >= perm.maxDownloads) {
            perm.isGranted = false; // Auto-revoke
            emit AccessLogged(fileId, accessor, "VERIFY_FAILED_DOWNLOAD_LIMIT", block.timestamp, false);
            return false;
        }

        // Track verified download increment
        perm.downloadCount += 1;
        emit AccessLogged(fileId, accessor, "VERIFY_SUCCESS_SHARED", block.timestamp, true);
        return true;
    }

    function getFile(string memory fileId) public view returns (
        string memory cid,
        string memory fileHash,
        address owner,
        uint256 timestamp,
        uint8 threatScore,
        string memory signature
    ) {
        require(_files[fileId].exists, "File does not exist");
        FileMetadata memory file = _files[fileId];
        return (
            file.cid,
            file.fileHash,
            file.owner,
            file.timestamp,
            file.threatScore,
            file.signature
        );
    }

    function setEmergencyLock(bool state) public onlyContractOwner {
        systemEmergencyLock = state;
        emit EmergencyLockTriggered(msg.sender, state);
    }

    function getUserOwnedFiles(address user) public view returns (string[] memory) {
        return _userOwnedFiles[user];
    }
}
