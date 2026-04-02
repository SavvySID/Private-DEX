// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PrivateVault {
    mapping(address => mapping(address => euint64)) private balances;

    event Deposited(address indexed user, address indexed token);
    event Withdrawn(address indexed user, address indexed token);

    function deposit(address token, InEuint64 calldata encAmount, uint256 plainAmount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), plainAmount), "TRANSFER_FROM_FAILED");
        euint64 addAmt = FHE.asEuint64(encAmount);
        euint64 cur = balances[msg.sender][token];
        euint64 newBal = FHE.add(cur, addAmt);
        balances[msg.sender][token] = newBal;
        FHE.allowThis(newBal);
        FHE.allowSender(newBal);
        emit Deposited(msg.sender, token);
    }

    function withdraw(address token, InEuint64 calldata encAmount, uint256 plainAmount) external {
        euint64 subAmt = FHE.asEuint64(encAmount);
        euint64 cur = balances[msg.sender][token];
        euint64 newBal = FHE.sub(cur, subAmt);
        balances[msg.sender][token] = newBal;
        FHE.allowThis(newBal);
        FHE.allowSender(newBal);
        require(IERC20(token).transfer(msg.sender, plainAmount), "TRANSFER_FAILED");
        emit Withdrawn(msg.sender, token);
    }

    function getBalance(address token) external view returns (euint64) {
        return balances[msg.sender][token];
    }
}
