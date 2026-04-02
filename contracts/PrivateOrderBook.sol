// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, InEuint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract PrivateOrderBook {
    struct Order {
        address trader;
        address tokenIn;
        address tokenOut;
        euint64 amountIn;
        euint64 minAmountOut;
        uint256 expiry;
        bool filled;
        bool cancelled;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    event OrderSubmitted(
        uint256 indexed orderId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 expiry
    );
    event OrderCancelled(uint256 indexed orderId);
    event OrderFilled(uint256 indexed orderId);

    function submitOrder(
        address tokenIn,
        address tokenOut,
        InEuint64 memory encAmountIn,
        InEuint64 memory encMinOut,
        uint256 expiry
    ) external {
        require(expiry > block.timestamp, "Invalid expiry");
        euint64 amountIn = FHE.asEuint64(encAmountIn);
        euint64 minAmountOut = FHE.asEuint64(encMinOut);
        FHE.allowThis(amountIn);
        FHE.allowThis(minAmountOut);
        FHE.allowSender(amountIn);
        FHE.allowSender(minAmountOut);

        uint256 id = orderCount++;
        orders[id] = Order({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            expiry: expiry,
            filled: false,
            cancelled: false
        });

        emit OrderSubmitted(id, msg.sender, tokenIn, tokenOut, expiry);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.trader == msg.sender, "Not trader");
        require(!o.filled && !o.cancelled, "Bad state");
        o.cancelled = true;
        emit OrderCancelled(orderId);
    }

    function markFilled(uint256 orderId) external {
        Order storage o = orders[orderId];
        o.filled = true;
        emit OrderFilled(orderId);
    }

    function getOrder(uint256 orderId)
        external
        view
        returns (
            address trader,
            address tokenIn,
            address tokenOut,
            uint256 expiry,
            bool filled,
            bool cancelled
        )
    {
        Order storage o = orders[orderId];
        return (o.trader, o.tokenIn, o.tokenOut, o.expiry, o.filled, o.cancelled);
    }
}
