// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RiskGuardOracle is Ownable {

    enum Verdict {CLEAR, CAUTION, HALT}

    struct GuardState {
        Verdict verdict;
        uint8 cautionFlags;
        uint32 drawdownBps;
        uint32 atrMultipleBps;
        uint8 rsi;
        uint32 spreadBps;
        uint64 timestamp;
        uint64 blockNumber;
        string reason;
    }

    struct AssetStats {
        uint64 haltCount;
        uint64 cautionCount;
        uint64 clearCount;
        uint64 totalRecords;
    }

    address public guardian;

    mapping(address => GuardState) private _current;
    mapping(address => GuardState[]) private _history;
    mapping(address => AssetStats) public assetStats;
    mapping(address => bool) public isMonitored;

    address[] public monitoredAssets;

    uint256 public constant MAX_HISTORY = 50;

    event VerdictRecorded(
        address indexed asset,
        Verdict verdict,
        uint8 cautionFlag,
        uint32 drawdownBps,
        uint8 rsi,
        string reason,
        uint64 timestamp
    );

    event HaltTriggered(
        address indexed asset,
        string reason,
        uint64 timestamp
    );

    event AssetRegistered(address indexed asset);
    event GuardianUpdated(address indexed prev, address indexed next);

    modifier onlyGuardian() {
        require(msg.sender == guardian, "RiskGuardOracle: not guardian");
        _;
    }

    constructor(address _guardian) Ownable(msg.sender) {
        require(_guardian != address(0), "RiskGuardOracle: zero address");
        guardian = _guardian;
        emit GuardianUpdated(address(0), _guardian);
    }

    function recordVerdict(
        address asset,
        Verdict verdict,
        uint8 cautionFlags,
        uint32 drawdownBps,
        uint32 atrMultipleBps,
        uint8 rsi,
        uint32 spreadBps,
        string calldata reason
    ) external onlyGuardian {
        require(asset != address(0), "RiskGuardOracle: zero asset");

        if (!isMonitored[asset]) {
            isMonitored[asset] = true;
            monitoredAssets.push(asset);
            emit AssetRegistered(asset);
        }

        GuardState memory state = GuardState({
            verdict: verdict,
            cautionFlags: cautionFlags,
            drawdownBps: drawdownBps,
            atrMultipleBps: atrMultipleBps,
            rsi: rsi,
            spreadBps: spreadBps,
            timestamp: uint64(block.timestamp),
            blockNumber: uint64(block.number),
            reason: reason
        });

        _current[asset] = state;

        GuardState[] storage hist = _history[asset];
        if (hist.length < MAX_HISTORY) {
            hist.push(state);
        } else {
            for (uint256 i = 0; i < hist.length - 1; i++) {
                hist[i] = hist[i + 1];
            }
            hist[hist.length - 1] = state;
        }

        AssetStats storage stats = assetStats[asset];
        stats.totalRecords++;
        if (verdict == Verdict.HALT) stats.haltCount++;
        else if (verdict == Verdict.CAUTION) stats.cautionCount++;
        else stats.clearCount++;

        emit VerdictRecorded(
            asset, verdict, cautionFlags, drawdownBps, rsi, reason, uint64(block.timestamp)
        );

        if (verdict == Verdict.HALT) {
            emit HaltTriggered(asset, reason, uint64(block.timestamp));
        }
    }

    function getCurrentState(address asset) external view returns (GuardState memory) {
        return _current[asset];
    }

    function getCurrentVerdict(address asset) external view returns (Verdict) {
        return _current[asset].verdict;
    }

    function isHalted(address asset) external view returns (bool) {
        return _current[asset].verdict == Verdict.HALT;
    }

    function isClear(address asset) external view returns (bool) {
        return _current[asset].verdict == Verdict.CLEAR;
    }

    function getHistory(address asset) external view returns (GuardState[] memory) {
        return _history[asset];
    }

    function getAllMonitoredAssets() external view returns (address[] memory) {
        return monitoredAssets;
    }

    function monitoredAssetsCount() external view returns (uint256) {
        return monitoredAssets.length;
    }

    function setGuardian(address _guardian) external onlyOwner {
        require(_guardian != address(0), "RiskGuardOracle: zero address");
        emit GuardianUpdated(guardian, _guardian);
        guardian = _guardian;
    }
}