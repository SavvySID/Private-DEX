// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PrivateVault {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => euint64)) private balances;

    event Deposited(address indexed user, address indexed token, uint256 plainAmount);
    event Withdrawn(address indexed user, address indexed token, uint256 plainAmount);

    function deposit(address token, InEuint64 memory encAmount, uint256 plainAmount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), plainAmount);
        euint64 addAmt = FHE.asEuint64(encAmount);
        euint64 cur = balances[msg.sender][token];
        euint64 newBal = FHE.add(cur, addAmt);
        balances[msg.sender][token] = newBal;
        FHE.allowThis(newBal);
        FHE.allowSender(newBal);
        emit Deposited(msg.sender, token, plainAmount);
    }

    function withdraw(address token, InEuint64 memory encAmount, uint256 plainAmount) external {
        euint64 subAmt = FHE.asEuint64(encAmount);
        euint64 cur = balances[msg.sender][token];
        euint64 newBal = FHE.sub(cur, subAmt);
        balances[msg.sender][token] = newBal;
        FHE.allowThis(newBal);
        FHE.allowSender(newBal);
        IERC20(token).safeTransfer(msg.sender, plainAmount);
        emit Withdrawn(msg.sender, token, plainAmount);
    }

    function getBalance(address token) external view returns (euint64) {
        return balances[msg.sender][token];
    }
}
