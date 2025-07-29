// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TugOfWarAutoReward
 * @dev A smart contract for managing tug-of-war games with automatic reward distribution
 * Uses native MON token (not ERC20) for staking and rewards
 */
contract TugOfWarAutoReward is ReentrancyGuard, Ownable {
    uint256 public constant STAKE_AMOUNT = 0.01 ether; // 0.01 MON

    // Game room structure
    struct Room {
        address player1;
        address player2;
        uint256 totalStake;
        bool isActive;
        bool gameFinished;
        address winner;
    }

    // Mapping from room ID to Room
    mapping(string => Room) public rooms;

    // Events
    event PlayerStaked(string indexed roomId, address indexed player, uint256 stakeAmount);
    event GameFinished(string indexed roomId, address indexed winner, uint256 prize);
    event StakeReturned(string indexed roomId, address indexed player, uint256 amount);

    /**
     * @dev Allows a player to stake in a room to confirm readiness
     * @param roomId Unique identifier for the room
     */
    function stake(string memory roomId) external payable nonReentrant {
        require(msg.value == STAKE_AMOUNT, "Invalid stake amount");
        
        Room storage room = rooms[roomId];
        
        // Check if player already staked
        require(msg.sender != room.player1 && msg.sender != room.player2, "Already staked in this room");
        
        // Add player to room
        if (room.player1 == address(0)) {
            room.player1 = msg.sender;
        } else if (room.player2 == address(0)) {
            room.player2 = msg.sender;
        } else {
            revert("Room is full");
        }
        
        // Update total stake
        room.totalStake += msg.value;
        room.isActive = true;
        
        emit PlayerStaked(roomId, msg.sender, msg.value);
    }

    /**
     * @dev Finishes a game and automatically distributes the prize to the winner
     * @param roomId ID of the room
     * @param winner Address of the winning player
     */
    function finishGame(string memory roomId, address winner) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room is not active");
        require(!room.gameFinished, "Game already finished");
        require(room.player2 != address(0), "Game not started");
        require(winner == room.player1 || winner == room.player2, "Invalid winner");

        // Calculate prize (total stakes)
        uint256 prize = room.totalStake;

        // Update room state
        room.gameFinished = true;
        room.winner = winner;
        room.isActive = false;
        room.totalStake = 0; // Clear stakes

        // 🎉 AUTOMATICALLY TRANSFER PRIZE TO WINNER!
        (bool sent, ) = payable(winner).call{value: prize}("");
        require(sent, "Failed to send prize to winner");

        emit GameFinished(roomId, winner, prize);
    }

    /**
     * @dev Allows players to retrieve their stake if the game didn't start
     * @param roomId ID of the room
     */
    function retrieveStake(string memory roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room is not active");
        require(!room.gameFinished, "Game already finished");
        require(msg.sender == room.player1 || msg.sender == room.player2, "Not a player");

        uint256 stakeToReturn = STAKE_AMOUNT;

        if (msg.sender == room.player1) {
            require(room.player2 == address(0), "Game already started");
            room.player1 = address(0);
            room.isActive = false;
            room.totalStake = 0;
        } else {
            room.player2 = address(0);
            room.totalStake = STAKE_AMOUNT; // Keep player1's stake
        }

        // Return stake
        (bool sent, ) = payable(msg.sender).call{value: stakeToReturn}("");
        require(sent, "Failed to return stake");

        emit StakeReturned(roomId, msg.sender, stakeToReturn);
    }

    /**
     * @dev Returns room information
     * @param roomId ID of the room
     */
    function getRoomInfo(string memory roomId) external view returns (
        address player1,
        address player2,
        uint256 totalStake,
        bool isActive,
        bool gameFinished,
        address winner
    ) {
        Room memory room = rooms[roomId];
        return (
            room.player1,
            room.player2,
            room.totalStake,
            room.isActive,
            room.gameFinished,
            room.winner
        );
    }

    /**
     * @dev Check if a player has staked in a room
     * @param roomId ID of the room
     * @param player Address of the player
     */
    function hasStaked(string memory roomId, address player) external view returns (bool) {
        Room memory room = rooms[roomId];
        return room.player1 == player || room.player2 == player;
    }

    /**
     * @dev Emergency function to withdraw stuck funds (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Failed to withdraw");
    }

    /**
     * @dev Allow contract to receive MON
     */
    receive() external payable {}
} 