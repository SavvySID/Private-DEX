// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Test ERC20 for the PrivateDEX vault/swap demo on Arbitrum Sepolia.
 *
 * - Configurable decimals (WETH = 18, USDC = 6).
 * - Public `mint` faucet so anyone can grab test tokens from the UI.
 */
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        address initialHolder
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        if (initialSupply > 0 && initialHolder != address(0)) {
            _mint(initialHolder, initialSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /** Open faucet — mint test tokens to any address. */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
