// Order Execution Engine

const OrderEngine = {
    orders: [], // Array of active orders { id, symbol, type, quantity, price, triggerPrice, trailPercent, status, date }
    orderIdCounter: 1,

    init(savedState) {
        if (savedState && savedState.orders) {
            console.log("Loading active orders...");
            this.orders = savedState.orders;
            this.orderIdCounter = savedState.orderIdCounter || 1;
        } else {
            this.orders = [];
            this.orderIdCounter = 1;
        }
    },

    // Place a new order
    placeOrder(orderRequest) {
        const { symbol, type, quantity, price, triggerPrice, trailPercent } = orderRequest;

        // Basic validation
        if (quantity <= 0) return { success: false, message: "Invalid quantity." };

        // For Market Orders, execute immediately
        if (type === 'MARKET') {
            const asset = Market.getAsset(symbol);
            if (!asset) return { success: false, message: "Asset not found." };

            // Execute Buy/Sell immediately at current price
            // Assume Market Buy for now. Short selling not explicitly requested in detail but implied by "Shorts" in "Mindset"?
            // Prompt says: "Buying Power... (Max 00k purchasing power)".
            // Also: "Shorts" mentioned in "MINDSET".
            // Let's support Long only for Phase 1 simplicty unless specifically asked.
            // Wait, "Buy if Price <= Limit; Sell if Price >= Limit." implies both directions.
            // "Stop-Loss: Trigger Market Sell..."
            // "Take-Profit: Trigger Market Sell..."
            // So it seems we are mainly Long.
            // But "Shorts" are mentioned.
            // I will implement "Buy" and "Sell" actions.
            // "Sell" usually means closing a position. "Short Sell" means opening a short.
            // Let's stick to Long positions (Buy to Open, Sell to Close) for simplicity given the constraints, unless user specified Shorting mechanics.
            // Re-reading: "You are capable of building complex financial logic (margin, shorts...)"
            // Okay, I should support Shorts if possible.
            // But for now, let's assume standard Long flow: Buy -> Sell.
            // If user sells more than they own -> Short?
            // "Portfolio.sell" currently checks holdings. If insufficient, it fails. So Shorting is not supported in Portfolio.js yet.
            // I will stick to Long-only for the MVP unless I modify Portfolio.js.
            // Given the time/complexity, Long-only with Margin is safer for "bug-free".

            // Market Buy
            if (orderRequest.action === 'BUY') {
                 return Portfolio.buy(symbol, quantity, asset.price);
            } else {
                 return Portfolio.sell(symbol, quantity, asset.price);
            }
        }

        // For Pending Orders (Limit, Stop, Trailing)
        const order = {
            id: this.orderIdCounter++,
            symbol: symbol,
            type: type,
            action: orderRequest.action || 'BUY', // BUY or SELL
            quantity: quantity,
            price: price, // Limit Price
            triggerPrice: triggerPrice, // Stop Price or Activation Price
            trailPercent: trailPercent, // For Trailing Stop
            highWaterMark: null, // Track highest price for Trailing Stop
            status: 'PENDING',
            date: new Date().toISOString()
        };

        // Initialize highWaterMark for Trailing Stop
        if (type === 'TRAILING_STOP') {
            const asset = Market.getAsset(symbol);
            if (asset) {
                order.highWaterMark = asset.price;
                order.triggerPrice = asset.price * (1 - (trailPercent / 100)); // Set initial stop
            }
        }

        this.orders.push(order);
        return { success: true, message: `Order #${order.id} placed: ${type} ${symbol}` };
    },

    // Cancel an order
    cancelOrder(orderId) {
        const index = this.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            this.orders.splice(index, 1);
            return { success: true, message: `Order #${orderId} cancelled.` };
        }
        return { success: false, message: "Order not found." };
    },

    // Check and execute pending orders based on current market prices
    checkOrders() {
        const executedOrders = [];

        // Iterate backwards to safely remove triggered orders
        for (let i = this.orders.length - 1; i >= 0; i--) {
            const order = this.orders[i];
            const asset = Market.getAsset(order.symbol);

            if (!asset) continue;

            let triggered = false;
            let executionPrice = asset.price;

            if (order.type === 'LIMIT') {
                if (order.action === 'BUY' && asset.price <= order.price) {
                    triggered = true;
                } else if (order.action === 'SELL' && asset.price >= order.price) {
                    triggered = true;
                }
            } else if (order.type === 'STOP_LOSS') {
                // Usually Sell Stop: Trigger if price <= triggerPrice
                if (order.action === 'SELL' && asset.price <= order.triggerPrice) {
                    triggered = true;
                }
            } else if (order.type === 'TAKE_PROFIT') {
                // Usually Sell Limit-ish but triggers Market Sell
                if (order.action === 'SELL' && asset.price >= order.triggerPrice) {
                    triggered = true;
                }
            } else if (order.type === 'TRAILING_STOP') {
                // Only active for SELL (Protect Long) usually.
                if (order.action === 'SELL') {
                    // Update High Water Mark
                    if (asset.price > order.highWaterMark) {
                        order.highWaterMark = asset.price;
                        // Move Stop Up
                        order.triggerPrice = order.highWaterMark * (1 - (order.trailPercent / 100));
                    }

                    // Check Trigger
                    if (asset.price <= order.triggerPrice) {
                        triggered = true;
                    }
                }
            }

            if (triggered) {
                console.log(`Order ${order.id} triggered!`);
                let result;
                if (order.action === 'BUY') {
                    result = Portfolio.buy(order.symbol, order.quantity, executionPrice);
                } else {
                    result = Portfolio.sell(order.symbol, order.quantity, executionPrice);
                }

                if (result.success) {
                    executedOrders.push(order);
                    this.orders.splice(i, 1); // Remove from active orders
                    // Notify UI? Handled by game loop updates
                } else {
                    // Order failed (e.g. insufficient funds/holdings)
                    // Leave it pending? Or cancel it?
                    // Usually cancel if funds insufficient.
                    console.warn(`Order ${order.id} execution failed: ${result.message}`);
                    // For now, let's keep it pending or maybe mark as 'FAILED'?
                    // Let's cancel it to prevent infinite failure loops.
                    this.orders.splice(i, 1);
                }
            }
        }
        return executedOrders;
    },

    // Getters
    getOrders() {
        return this.orders;
    },

    // Serialize
    toJSON() {
        return {
            orders: this.orders,
            orderIdCounter: this.orderIdCounter
        };
    }
};
