// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TugOfWar
 * @dev A smart contract for managing a tug-of-war game with token staking
 */
contract TugOfWar is ReentrancyGuard, Ownable {
    // MON token interface
    IERC20 public monToken;

    // Game room structure
    struct Room {
        address player1;
        address player2;
        uint256 stakeAmount;
        bool isActive;
        bool gameFinished;
        address winner;
    }

    // Mapping from room ID to Room
    mapping(bytes32 => Room) public rooms;

    // Events
    event RoomCreated(bytes32 indexed roomId, address indexed player1, uint256 stakeAmount);
    event PlayerJoined(bytes32 indexed roomId, address indexed player2);
    event GameFinished(bytes32 indexed roomId, address indexed winner, uint256 prize);
    event StakeReturned(bytes32 indexed roomId, address indexed player, uint256 amount);

    /**
     * @dev Constructor sets the MON token address
     * @param _monToken Address of the MON token contract
     */
    constructor(address _monToken) {
        require(_monToken != address(0), "Invalid token address");
        monToken = IERC20(_monToken);
    }

    /**
     * @dev Creates a new game room
     * @param roomId Unique identifier for the room
     * @param stakeAmount Amount of MON tokens to stake
     */
    function createRoom(bytes32 roomId, uint256 stakeAmount) external nonReentrant {
        require(stakeAmount > 0, "Stake amount must be greater than 0");
        require(rooms[roomId].player1 == address(0), "Room already exists");
        require(monToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient MON balance");
        require(monToken.allowance(msg.sender, address(this)) >= stakeAmount, "Insufficient allowance");

        // Transfer stake from player 1
        require(monToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");

        // Create new room
        rooms[roomId] = Room({
            player1: msg.sender,
            player2: address(0),
            stakeAmount: stakeAmount,
            isActive: true,
            gameFinished: false,
            winner: address(0)
        });

        emit RoomCreated(roomId, msg.sender, stakeAmount);
    }

    /**
     * @dev Allows a player to join an existing room
     * @param roomId ID of the room to join
     */
    function joinRoom(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.player1 != address(0), "Room does not exist");
        require(room.player2 == address(0), "Room is full");
        require(room.isActive, "Room is not active");
        require(msg.sender != room.player1, "Cannot join your own room");
        require(monToken.balanceOf(msg.sender) >= room.stakeAmount, "Insufficient MON balance");
        require(monToken.allowance(msg.sender, address(this)) >= room.stakeAmount, "Insufficient allowance");

        // Transfer stake from player 2
        require(monToken.transferFrom(msg.sender, address(this), room.stakeAmount), "Stake transfer failed");

        // Set player 2
        room.player2 = msg.sender;

        emit PlayerJoined(roomId, msg.sender);
    }

    /**
     * @dev Finishes a game and distributes the prize
     * @param roomId ID of the room
     * @param winner Address of the winning player
     */
    function finishGame(bytes32 roomId, address winner) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room is not active");
        require(!room.gameFinished, "Game already finished");
        require(room.player2 != address(0), "Game not started");
        require(winner == room.player1 || winner == room.player2, "Invalid winner");

        // Calculate prize (total stakes)
        uint256 prize = room.stakeAmount * 2;

        // Update room state
        room.gameFinished = true;
        room.winner = winner;
        room.isActive = false;

        // Transfer prize to winner
        require(monToken.transfer(winner, prize), "Prize transfer failed");

        emit GameFinished(roomId, winner, prize);
    }

    /**
     * @dev Allows players to retrieve their stake if the game didn't start
     * @param roomId ID of the room
     */
    function retrieveStake(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.isActive, "Room is not active");
        require(!room.gameFinished, "Game already finished");
        require(msg.sender == room.player1 || msg.sender == room.player2, "Not a player");

        uint256 stakeToReturn = room.stakeAmount;

        if (msg.sender == room.player1) {
            require(room.player2 == address(0), "Game already started");
            room.player1 = address(0);
            room.isActive = false;
        } else {
            room.player2 = address(0);
        }

        // Return stake
        require(monToken.transfer(msg.sender, stakeToReturn), "Stake return failed");

        emit StakeReturned(roomId, msg.sender, stakeToReturn);
    }

    /**
     * @dev Returns room information
     * @param roomId ID of the room
     */
    function getRoomInfo(bytes32 roomId) external view returns (
        address player1,
        address player2,
        uint256 stakeAmount,
        bool isActive,
        bool gameFinished,
        address winner
    ) {
        Room memory room = rooms[roomId];
        return (
            room.player1,
            room.player2,
            room.stakeAmount,
            room.isActive,
            room.gameFinished,
            room.winner
        );
    }
} 