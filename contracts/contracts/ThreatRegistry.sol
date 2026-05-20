// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ThreatRegistry is Ownable {

    uint8 public constant VERIFY_THRESHOLD = 75;
    uint256 public constant MAX_REPORTS = 100;
    uint256 public constant DECAY_PERIOD = 30;

    enum ThreatType {
        unknown,
        MaliciousContract,
        HoneypotToken,
        RugPull,
        ExcessiveApproval,
        MarketManipulation,
        FlashLoanAttack,
        Other
    }

    struct ThreatReport {
        address reporter;
        uint8 score;
        ThreatType threatType;
        string reason;
        uint256 timestamp;
        uint256 upvotes;
        bool verified;
    }

    struct AssetThreat {
        uint8 aggregateScore;
        uint256 reportCount;
        bool isVerified;
        uint256 lastUpdated;
        uint256 firstReported;
    }

    mapping(address => AssetThreat) public assetThreats;
    mapping(address => ThreatReport[]) private _reports;
    mapping(address => mapping(address => mapping(uint256 => bool))) private _hasUpvoted;
    mapping(address => mapping(address => uint256)) private _lastReportTime;

    uint256 public constant REPORT_COOLDOWN = 1 hours;

    address public guardian;

    event ThreatReported(
        address indexed asset,
        address indexed reporter,
        uint8 score,
        ThreatType threatType,
        string reason,
        uint256 timestamp
    );

    event ThreatVerified(
        address indexed asset,
        uint8 aggregateScore,
        uint256 reportCount,
        uint256 timestamp
    );

    event ThreatCleared(address indexed asset, uint256 timestamp);

    event ReportUpvoted(
        address indexed asset,
        uint256 reportIndex,
        address indexed voter,
        uint256 newUpvoteCount
    );

    event ReportVerified(address indexed asset, uint256 reportIndex);

    modifier onlyGuardian() {
        require(msg.sender == guardian, "ThreatRegistry: not guardian");
        _;
    }

    constructor(address _guardian) Ownable(msg.sender) {
        guardian = _guardian;
    }

    function reportThreat(
        address asset,
        uint8 score,
        ThreatType threatType,
        string calldata reason
    ) external {
        require(asset != address(0), "ThreatRegistry: zero address");
        require(score <= 100, "ThreatRegistry: score out of range");
        require(bytes(reason).length > 0, "ThreatRegistry: empty reason");

        require(
            block.timestamp >= _lastReportTime[msg.sender][asset] + REPORT_COOLDOWN, 
            "ThreatRegistry: report cooldown active"
        );

        ThreatReport[] storage reports = _reports[asset];
        require(reports.length < MAX_REPORTS, "ThreatRegistry: reprt cap reached");

        reports.push(ThreatReport({
            reporter: msg.sender,
            score: score,
            threatType: threatType,
            reason: reason,
            timestamp: block.timestamp,
            upvotes: 0,
            verified: false
        }));

        _lastReportTime[msg.sender][asset] = block.timestamp;
        _recalculate(asset);

        emit ThreatReported(asset, msg.sender, score, threatType, reason, block.timestamp);

        if (!assetThreats[asset].isVerified &&
            assetThreats[asset].aggregateScore >= VERIFY_THRESHOLD)
        {
            assetThreats[asset].isVerified = true;
            emit ThreatVerified(
                asset,
                assetThreats[asset].aggregateScore,
                assetThreats[asset].reportCount,
                block.timestamp
            );
        }
    }

    function upvoteReport(address asset, uint256 reportIndex) external {
        require(reportIndex < _reports[asset].length, "ThreatRegistry: invalid index");
        require(!_hasUpvoted[msg.sender][asset][reportIndex], "ThreatRegistry: already upvoted");

        _hasUpvoted[msg.sender][asset][reportIndex] = true;
        uint256 newCount = ++_reports[asset][reportIndex].upvotes;

        emit ReportUpvoted(asset, reportIndex, msg.sender, newCount);
    }

    function verifyReport(address asset, uint256 reportIndex) external onlyGuardian {
        require(reportIndex < _reports[asset].length, "ThreatRegistry: invalid index");
        _reports[asset][reportIndex].verified = true;

        _recalculate(asset);

        if (!assetThreats[asset].isVerified && assetThreats[asset].aggregateScore >= VERIFY_THRESHOLD) {
            assetThreats[asset].isVerified = true;
            emit ThreatVerified(
                asset, 
                assetThreats[asset].aggregateScore, 
                assetThreats[asset].reportCount, 
                block.timestamp
            );
        }
        
        emit ReportVerified(asset, reportIndex);
    }

    function clearThreat(address asset) external onlyGuardian {
        assetThreats[asset].isVerified = false;
        assetThreats[asset].aggregateScore = 0;
        assetThreats[asset].lastUpdated = block.timestamp;
        emit ThreatCleared(asset, block.timestamp);
    }

    function _recalculate(address asset) internal {
        ThreatReport[] storage reports = _reports[asset];
        if (reports.length == 0) return;

        uint256 weightedSum = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < reports.length; i++) {
            ThreatReport storage r = reports[i];

            uint256 weight = 100 + (r.upvotes > 50 ? 50 : r.upvotes);

            if (block.timestamp > r.timestamp + DECAY_PERIOD) {
                weight = weight / 2;
            }

            uint256 score = r.score;
            if (r.verified && score < 100) {
                score = score + score / 4;
                if (score > 100) score = 100;
            }

            weightedSum += score * weight;
            totalWeight += weight;
        }

        uint8 aggregate = totalWeight > 0
            ? uint8(weightedSum / totalWeight)
            : 0;

        AssetThreat storage at = assetThreats[asset];
        if (at.firstReported == 0) at.firstReported = block.timestamp;
        at.aggregateScore = aggregate;
        at.reportCount    = reports.length;
        at.lastUpdated    = block.timestamp;
    }

    function getAggregateThreatScore(address asset) external view returns (uint8) {
        return assetThreats[asset].aggregateScore;
    }

    function isVerifiedThreat(address asset) external view returns (bool) {
        return assetThreats[asset].isVerified;
    }

    function getReportCount(address asset) external view returns (uint256) {
        return _reports[asset].length;
    }

    function getReport(address asset, uint256 index) external view returns (ThreatReport memory) {
        require(index < _reports[asset].length, "ThreatRegistry: invalid index");
        return _reports[asset][index];
    }

    function getAllReports(address asset) external view returns (ThreatReport[] memory) {
        return _reports[asset];
    }

    function hasUpvoted(address voter, address asset, uint256 reportIndex) external view returns (bool) {
        return _hasUpvoted[voter][asset][reportIndex];
    }

    function setGuardian(address _guardian) external onlyOwner {
        guardian = _guardian;
    }
}