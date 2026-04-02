// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PrivateOrderBook} from "./PrivateOrderBook.sol";

contract PrivateAMM {
    PrivateOrderBook public orderBook;
    uint256 public totalMatchedOrders;
    uint256 public estimatedMevSaved;

    event OrdersMatched(uint256 indexed buyId, uint256 indexed sellId);

    constructor(address _orderBook) {
        orderBook = PrivateOrderBook(_orderBook);
    }

    function matchOrders(uint256 buyId, uint256 sellId) external {
        (
            address buyTrader,
            address buyTokenIn,
            address buyTokenOut,
            uint256 buyExpiry,
            bool buyFilled,
            bool buyCancelled
        ) = orderBook.getOrder(buyId);

        (
            address sellTrader,
            address sellTokenIn,
            address sellTokenOut,
            uint256 sellExpiry,
            bool sellFilled,
            bool sellCancelled
        ) = orderBook.getOrder(sellId);

        (, , , , , , bool buyFilledRaw, bool buyCancelledRaw) = orderBook.orders(buyId);
        (, , , , , , bool sellFilledRaw, bool sellCancelledRaw) = orderBook.orders(sellId);
        (,, , , euint64 buyMinAmountOut, , , ) = orderBook.orders(buyId);
        (,, , euint64 sellAmountIn, , , , ) = orderBook.orders(sellId);

        require(!buyFilled && !buyCancelled && !buyFilledRaw && !buyCancelledRaw, "Buy invalid");
        require(!sellFilled && !sellCancelled && !sellFilledRaw && !sellCancelledRaw, "Sell invalid");
        require(buyExpiry > block.timestamp && sellExpiry > block.timestamp, "Order expired");
        require(buyTokenIn == sellTokenOut && buyTokenOut == sellTokenIn, "Pair mismatch");

        ebool canFill = FHE.gte(sellAmountIn, buyMinAmountOut);
        euint64 fillAmount = FHE.select(canFill, buyMinAmountOut, FHE.asEuint64(0));
        FHE.allow(fillAmount, buyTrader);
        FHE.allow(fillAmount, sellTrader);
        FHE.allowThis(fillAmount);

        orderBook.markFilled(buyId);
        orderBook.markFilled(sellId);

        totalMatchedOrders += 2;
        estimatedMevSaved += 15;

        emit OrdersMatched(buyId, sellId);
    }
}
