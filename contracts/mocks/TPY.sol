// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TPY is ERC20 {
    constructor() ERC20("TPY Token", "TPY") {
        _mint(msg.sender, 1e9 * 1e18);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
