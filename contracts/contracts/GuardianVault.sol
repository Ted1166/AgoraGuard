// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiskGuardOracle.sol";

contract GuardianVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant USDC = 0x3600000000000000000000000000000000000000;

    uint256 public constant PROTECTION_COOLDOWN = 5 minutes;
    uint256 public constant MAX_BATCH_SIZE = 20;

    struct ProtectionConfig {
        bool enabled;
        uint256 enabledAt;
        uint256 totalProtections;
    }

    address public guardian;
    RiskGuardOracle public oracle;

    mapping(address => ProtectionConfig) public protectionConfig;
    mapping (address => mapping(address => uint256)) public vaultBalances;
    mapping(address => uint256) public lastProtectionAt;

    event ProtectionEnabled(address indexed user, uint256 timestamp);
    event ProtectionDisabled(address indexed user, uint256 timestamp);
    event TokensProtected(
        address indexed user,
        address indexed token,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event TokensWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    event GuardianUpdated(address indexed prev, address indexed next);
    event OracleUpdated(address indexed prev, address indexed next);

    modifier onlyGuardian() {
        require(msg.sender == guardian, "GuardianVault: not guardian");
        _;
    }

    modifier whenProtected(address user) {
        require(protectionConfig[user].enabled, "GuardianVault: user not protected");
        _;
    }

    modifier cooldownPassed(address user) {
        require(
            block.timestamp >= lastProtectionAt[user] + PROTECTION_COOLDOWN, 
            "GuardianVault: cooldown active"
        );
        _;
    }

    constructor(address _guardian, address _oracle) Ownable(msg.sender) {
        require(_guardian != address(0), "GuardianVault: Zero guardian");
        guardian = _guardian;
        if (_oracle != address(0)) {
            oracle = RiskGuardOracle(_oracle);
        }
        emit GuardianUpdated(address(0), _guardian);
    }

    function enableProtection() external {
        ProtectionConfig storage cfg = protectionConfig[msg.sender];
        cfg.enabled = true;
        cfg.enabledAt = block.timestamp;
        emit ProtectionEnabled(msg.sender, block.timestamp);
    }

    function disableProtection() external {
        protectionConfig[msg.sender].enabled = false;
        emit ProtectionDisabled(msg.sender, block.timestamp);
    }

    function withdraw(address token) external nonReentrant {
        uint256 amount = vaultBalances[msg.sender][token];
        require(amount > 0, "GuardianVault: nothing to withdraw");

        vaultBalances[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokensWithdrawn(msg.sender, token, amount, block.timestamp);
    }

    function withdrawBatch(address[] calldata tokens) external nonReentrant {
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 amount = vaultBalances[msg.sender][tokens[i]];
            if (amount > 0) {
                vaultBalances[msg.sender][tokens[i]] = 0;
                IERC20(tokens[i]).safeTransfer(msg.sender, amount);
                emit TokensWithdrawn(msg.sender, tokens[i], amount, block.timestamp);
            }
        }
    }

    function protectTokens(
        address user,
        address token,
        uint256 amount,
        string calldata reason
    ) 
    external
    onlyGuardian
    whenProtected(user)
    cooldownPassed(user)
    nonReentrant {
        require(amount > 0, "GuardianVault: Zero amount");

        if (address(oracle) != address(0)) {
            require(
                oracle.isHalted(token), "GuardianVault: oracle not in HALT for this asset"
            );
        }

        IERC20(token).safeTransferFrom(user, address(this), amount);
        vaultBalances[user][token] += amount;
        lastProtectionAt[user] = block.timestamp;
        protectionConfig[user].totalProtections++;

        emit TokensProtected(user, token, amount, reason, block.timestamp);
    }

    function batchProtectedTokens(
        address user,
        address[] calldata tokens,
        uint256[] calldata amounts,
        string calldata reason
    ) 
    external
    onlyGuardian
    whenProtected(user)
    cooldownPassed(user)
    nonReentrant {
        require(tokens.length == amounts.length, "GuardianVault: length mismatch");
        require(tokens.length <= MAX_BATCH_SIZE, "GuardianVault: batch too large");
        require(tokens.length > 0, "GuardianVault: empty batch");

        lastProtectionAt[user] = block.timestamp;
        protectionConfig[user].totalProtections++;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] == 0) continue;

            IERC20(tokens[i]).safeTransferFrom(user, address(this), amounts[i]);
            vaultBalances[user][tokens[i]] += amounts[i];

            emit TokensProtected(user, tokens[i], amounts[i], reason, block.timestamp);
        }
    }

    function getVaultBalance(address user, address token) external view returns (uint256) {
        return vaultBalances[user][token];
    }

    function isProtected(address user) external view returns (bool) {
        return protectionConfig[user].enabled;
    }

    function isCooldownActive(address user) external view returns (bool) {
        return block.timestamp < lastProtectionAt[user] + PROTECTION_COOLDOWN;
    }

    function cooldownRemaining(address user) external view returns (uint256) {
        uint256 end = lastProtectionAt[user] + PROTECTION_COOLDOWN;
        return block.timestamp >= end ? 0 : end - block.timestamp;
    }

    function setGuardian(address _guardian) external onlyOwner {
        require(_guardian != address(0), "GuardianVault: zero address");
        emit GuardianUpdated(guardian, _guardian);
        guardian = _guardian;
    }

    function setOracle(address _oracle) external onlyOwner {
        emit OracleUpdated(address(oracle), _oracle);
        oracle = RiskGuardOracle(_oracle);
    }
}