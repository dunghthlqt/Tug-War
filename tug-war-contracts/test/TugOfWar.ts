import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TugOfWar", function () {
  let tugOfWar: Contract;
  let monToken: Contract;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let roomId: string;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy MON token (mock)
    const MonToken = await ethers.getContractFactory("MockMON");
    monToken = await MonToken.deploy();

    // Deploy TugOfWar contract
    const TugOfWar = await ethers.getContractFactory("TugOfWar");
    tugOfWar = await TugOfWar.deploy(await monToken.getAddress());

    // Mint tokens for players
    const amount = ethers.parseEther("100");
    await monToken.mint(player1.address, amount);
    await monToken.mint(player2.address, amount);

    // Generate room ID
    roomId = ethers.keccak256(ethers.toUtf8Bytes("test-room"));
  });

  describe("Room Creation", function () {
    it("Should create a room with stake", async function () {
      const stakeAmount = ethers.parseEther("10");

      // Approve tokens
      await monToken.connect(player1).approve(await tugOfWar.getAddress(), stakeAmount);

      // Create room
      await expect(tugOfWar.connect(player1).createRoom(roomId, stakeAmount))
        .to.emit(tugOfWar, "RoomCreated")
        .withArgs(roomId, player1.address, stakeAmount);

      // Check room info
      const room = await tugOfWar.getRoomInfo(roomId);
      expect(room.player1).to.equal(player1.address);
      expect(room.stakeAmount).to.equal(stakeAmount);
      expect(room.isActive).to.be.true;
    });

    it("Should not create room with zero stake", async function () {
      await expect(
        tugOfWar.connect(player1).createRoom(roomId, 0)
      ).to.be.revertedWith("Stake amount must be greater than 0");
    });
  });

  describe("Room Joining", function () {
    const stakeAmount = ethers.parseEther("10");

    beforeEach(async function () {
      // Setup room
      await monToken.connect(player1).approve(await tugOfWar.getAddress(), stakeAmount);
      await tugOfWar.connect(player1).createRoom(roomId, stakeAmount);
    });

    it("Should allow player2 to join room", async function () {
      await monToken.connect(player2).approve(await tugOfWar.getAddress(), stakeAmount);

      await expect(tugOfWar.connect(player2).joinRoom(roomId))
        .to.emit(tugOfWar, "PlayerJoined")
        .withArgs(roomId, player2.address);

      const room = await tugOfWar.getRoomInfo(roomId);
      expect(room.player2).to.equal(player2.address);
    });

    it("Should not allow player1 to join their own room", async function () {
      await expect(
        tugOfWar.connect(player1).joinRoom(roomId)
      ).to.be.revertedWith("Cannot join your own room");
    });
  });

  describe("Game Finish", function () {
    const stakeAmount = ethers.parseEther("10");

    beforeEach(async function () {
      // Setup game
      await monToken.connect(player1).approve(await tugOfWar.getAddress(), stakeAmount);
      await tugOfWar.connect(player1).createRoom(roomId, stakeAmount);
      await monToken.connect(player2).approve(await tugOfWar.getAddress(), stakeAmount);
      await tugOfWar.connect(player2).joinRoom(roomId);
    });

    it("Should distribute prize to winner", async function () {
      const initialBalance = await monToken.balanceOf(player1.address);
      
      await expect(tugOfWar.connect(player1).finishGame(roomId, player1.address))
        .to.emit(tugOfWar, "GameFinished")
        .withArgs(roomId, player1.address, stakeAmount * BigInt(2));

      const finalBalance = await monToken.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(stakeAmount * BigInt(2));
    });

    it("Should not allow non-players to win", async function () {
      await expect(
        tugOfWar.connect(player1).finishGame(roomId, owner.address)
      ).to.be.revertedWith("Invalid winner");
    });
  });

  describe("Stake Retrieval", function () {
    const stakeAmount = ethers.parseEther("10");

    beforeEach(async function () {
      await monToken.connect(player1).approve(await tugOfWar.getAddress(), stakeAmount);
      await tugOfWar.connect(player1).createRoom(roomId, stakeAmount);
    });

    it("Should allow player1 to retrieve stake before player2 joins", async function () {
      const initialBalance = await monToken.balanceOf(player1.address);

      await expect(tugOfWar.connect(player1).retrieveStake(roomId))
        .to.emit(tugOfWar, "StakeReturned")
        .withArgs(roomId, player1.address, stakeAmount);

      const finalBalance = await monToken.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(stakeAmount);
    });

    it("Should not allow stake retrieval after game starts", async function () {
      await monToken.connect(player2).approve(await tugOfWar.getAddress(), stakeAmount);
      await tugOfWar.connect(player2).joinRoom(roomId);

      await expect(
        tugOfWar.connect(player1).retrieveStake(roomId)
      ).to.be.revertedWith("Game already started");
    });
  });
}); 