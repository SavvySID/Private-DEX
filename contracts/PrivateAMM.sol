// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {PrivateOrderBook} from "./PrivateOrderBook.sol";

contract PrivateAMM {
    PrivateOrderBook public immutable orderBook;
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
            euint64 buyAmountInUnused,
            euint64 buyMinOut,
            uint256 buyExpiry,
            bool buyFilled,
            bool buyCancelled
        ) = orderBook.orders(buyId);

        (
            address sellTrader,
            address sellTokenIn,
            address sellTokenOut,
            euint64 sellAmt,
            euint64 sellMinOutUnused,
            uint256 sellExpiry,
            bool sellFilled,
            bool sellCancelled
        ) = orderBook.orders(sellId);

        require(!buyFilled && !buyCancelled && block.timestamp <= buyExpiry, "Buy invalid");
        require(!sellFilled && !sellCancelled && block.timestamp <= sellExpiry, "Sell invalid");
        require(buyTokenIn == sellTokenOut && buyTokenOut == sellTokenIn, "Pair mismatch");

        ebool canFill = FHE.gte(sellAmt, buyMinOut);
        euint64 fillAmount = FHE.select(canFill, buyMinOut, FHE.asEuint64(0));
        FHE.allowThis(fillAmount);
        FHE.allow(fillAmount, buyTrader);
        FHE.allow(fillAmount, sellTrader);

        orderBook.markFilled(buyId);
        orderBook.markFilled(sellId);

        totalMatchedOrders += 2;
        estimatedMevSaved += 15;

        emit OrdersMatched(buyId, sellId);
    }
}
