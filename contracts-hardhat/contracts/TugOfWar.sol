// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TugOfWar is ReentrancyGuard {
    uint256 public constant STAKE_AMOUNT = 0.01 ether;

    mapping(string => mapping(address => bool)) public hasStaked;
    mapping(string => mapping(address => uint256)) public stakes;
    mapping(string => uint256) public totalStakes;
    mapping(string => bool) public gameFinished;
    mapping(string => address) public winners;

    event Staked(string roomId, address player, uint256 amount);
    event GameWon(string roomId, address winner, uint256 prize);
    event RewardClaimed(string roomId, address winner, uint256 amount);

    function stake(string memory roomId) external payable nonReentrant {
        require(!hasStaked[roomId][msg.sender], "Already staked");
        require(!gameFinished[roomId], "Game already finished");
        require(msg.value == STAKE_AMOUNT, "Invalid stake amount");

        hasStaked[roomId][msg.sender] = true;
        stakes[roomId][msg.sender] = msg.value;
        totalStakes[roomId] += msg.value;

        emit Staked(roomId, msg.sender, msg.value);
    }

    function getReward(string memory roomId, address player) external view returns (uint256) {
        if (!gameFinished[roomId] || winners[roomId] != player) {
            return 0;
        }
        return totalStakes[roomId];
    }

    function claimReward(string memory roomId) external nonReentrant {
        require(gameFinished[roomId], "Game not finished");
        require(winners[roomId] == msg.sender, "Not the winner");
        require(totalStakes[roomId] > 0, "No rewards to claim");

        uint256 reward = totalStakes[roomId];
        totalStakes[roomId] = 0;
        
        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Failed to send reward");

        emit RewardClaimed(roomId, msg.sender, reward);
    }

    function finishGame(string memory roomId, address winner) external {
        require(!gameFinished[roomId], "Game already finished");
        require(hasStaked[roomId][winner], "Winner has not staked");

        gameFinished[roomId] = true;
        winners[roomId] = winner;

        emit GameWon(roomId, winner, totalStakes[roomId]);
    }

    // Allow contract to receive MON
    receive() external payable {}
} 