// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockMON is ERC20 {
    constructor() ERC20("Mock MON", "MON") {
        _mint(msg.sender, 1000000 ether); // Mint 1M tokens
    }

    // Function to get test tokens
    function mint() external {
        require(balanceOf(msg.sender) == 0, "Already have tokens");
        _mint(msg.sender, 100 ether); // Mint 100 tokens for testing
    }
} 