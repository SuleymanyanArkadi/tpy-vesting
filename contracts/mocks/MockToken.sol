// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MT") {
        _mint(msg.sender, 1e8 * 1e18);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
