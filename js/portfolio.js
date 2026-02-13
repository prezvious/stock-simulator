// Portfolio Management Module

const Portfolio = {
    cash: 100000,
    holdings: {}, // { 'AAPL': { quantity: 10, avgPrice: 150, type: 'stock' } }
    history: [], // Array of closed trades
    initialCapital: 100000,
    marginRatio: 2, // 2:1 Buying Power

    init(savedState) {
        if (savedState && savedState.portfolio) {
            console.log("Loading saved portfolio...");
            this.cash = savedState.portfolio.cash;
            this.holdings = savedState.portfolio.holdings || {};
            this.history = savedState.portfolio.history || [];
            this.initialCapital = savedState.portfolio.initialCapital || 100000;
        } else {
            console.log("Starting fresh portfolio...");
            this.cash = 100000;
            this.holdings = {};
            this.history = [];
            this.initialCapital = 100000;
        }
    },

    // Get current total equity (Cash + Market Value of Holdings)
    getEquity() {
        let holdingsValue = 0;
        for (const symbol in this.holdings) {
            const holding = this.holdings[symbol];
            const asset = Market.getAsset(symbol);
            if (asset) {
                holdingsValue += holding.quantity * asset.price;
            }
        }
        return this.cash + holdingsValue;
    },

    // Get Buying Power (Equity * Margin Ratio) - roughly
    // Or strictly Cash * Margin Ratio?
    // "Buying Power: Cash + 2:1 Margin (Max 00k purchasing power)"
    // Usually Buying Power = Cash * 2 for standard margin accounts (Reg T).
    // Or (Equity - Maintenance) * 4 for Pattern Day Traders.
    // The prompt says "Cash + 2:1 Margin (Max 00k purchasing power)".
    // So if Cash is 100k, Buying Power is 200k.
    // If I buy 100k worth of stock, Cash is 0. Buying Power is 0? No, that would be cash account.
    // In margin account: Buying Power = (Equity - Initial Margin Requirement) * Leverage?
    // Let's simplify: Buying Power = Current Cash * 2.
    // Wait, if I have 00k cash, I can buy 00k stock.
    // If I buy 00k stock, my cash becomes -00k (borrowed).
    // Then my Equity is 00k stock - 00k debt = 00k.
    // If stock drops 50%, Equity = 00k - 00k = 0.
    // So Buying Power should be based on Equity.
    // Buying Power = Equity * 2.
    // But we need to subtract current market value of positions?
    // Available Buying Power = (Equity * 2) - Market Value of Positions.
    // Let's verify:
    // Start: Equity 100k. BP = 200k. Pos = 0. Avail BP = 200k.
    // Buy 200k stock. Pos = 200k. Equity = 100k. Avail BP = 200 - 200 = 0. Correct.
    // Buy 100k stock. Pos = 100k. Equity = 100k. Avail BP = 200 - 100 = 100k. Correct.
    // So: Buying Power = Equity * Margin Ratio.
    // Available to Trade = (Equity * Margin Ratio) - Current Market Value of Holdings.
    getBuyingPower() {
        const equity = this.getEquity();
        let holdingsValue = 0;
        for (const symbol in this.holdings) {
            const holding = this.holdings[symbol];
            const asset = Market.getAsset(symbol);
            if (asset) {
                holdingsValue += holding.quantity * asset.price;
            }
        }
        // Max 00k purchasing power rule implies cap?
        // "Max 00k purchasing power" might just be an example for start.
        // I will use dynamic equity-based calculation.

        const totalBuyingPower = equity * this.marginRatio;
        const availableBuyingPower = totalBuyingPower - holdingsValue;
        return Math.max(0, availableBuyingPower);
    },

    // Execute Buy
    // Returns { success: boolean, message: string }
    buy(symbol, quantity, price) {
        const cost = quantity * price;
        const availableBP = this.getBuyingPower();

        if (cost > availableBP) {
            return { success: false, message: `Insufficient buying power. Cost: ${formatCurrency(cost)}, Available: ${formatCurrency(availableBP)}` };
        }

        // Deduct cash (allow negative cash for margin)
        this.cash -= cost;

        // Add to holdings
        if (this.holdings[symbol]) {
            // Update average price
            const currentQty = this.holdings[symbol].quantity;
            const currentAvg = this.holdings[symbol].avgPrice;
            const newAvg = ((currentQty * currentAvg) + cost) / (currentQty + quantity);

            this.holdings[symbol].quantity += quantity;
            this.holdings[symbol].avgPrice = newAvg;
        } else {
            const asset = Market.getAsset(symbol);
            this.holdings[symbol] = {
                quantity: quantity,
                avgPrice: price,
                type: asset ? asset.type : 'unknown',
                symbol: symbol
            };
        }

        this.recordTrade(symbol, 'BUY', quantity, price, 0);
        return { success: true, message: `Bought ${quantity} ${symbol} @ ${formatCurrency(price)}` };
    },

    // Execute Sell
    // Returns { success: boolean, message: string }
    sell(symbol, quantity, price) {
        if (!this.holdings[symbol] || this.holdings[symbol].quantity < quantity) {
            return { success: false, message: "Insufficient holdings to sell." };
        }

        const proceeds = quantity * price;
        this.cash += proceeds;

        // Calculate Realized P/L for this sale
        const avgPrice = this.holdings[symbol].avgPrice;
        const profit = (price - avgPrice) * quantity;

        // Update holdings
        this.holdings[symbol].quantity -= quantity;
        if (this.holdings[symbol].quantity <= 0.00000001) { // Handle float precision
            delete this.holdings[symbol];
        }

        this.recordTrade(symbol, 'SELL', quantity, price, profit);
        return { success: true, message: `Sold ${quantity} ${symbol} @ ${formatCurrency(price)}. P/L: ${formatCurrency(profit)}` };
    },

    // Record trade history
    recordTrade(symbol, type, qty, price, pl) {
        this.history.unshift({
            date: new Date().toISOString(),
            symbol: symbol,
            type: type,
            quantity: qty,
            price: price,
            pl: pl
        });
        // Limit history to last 50 trades for performance? Or keep all?
        // Let's keep all for now, as array push/unshift is fast enough for <1000 items.
    },

    // Get metrics
    getMetrics() {
        const equity = this.getEquity();
        const start = this.initialCapital;
        const totalPL = equity - start;
        const totalPLPercent = (totalPL / start) * 100;

        // Day P/L (Simulated: just same as total P/L for this session since we don't track daily snapshots yet)
        // Ideally we would snapshot equity at start of "day" (app load?).
        // For simplicity, Day P/L = Total P/L since session start.

        return {
            equity: equity,
            cash: this.cash,
            buyingPower: this.getBuyingPower(),
            totalPL: totalPL,
            totalPLPercent: totalPLPercent
        };
    },

    // Serialize for saving
    toJSON() {
        return {
            cash: this.cash,
            holdings: this.holdings,
            history: this.history,
            initialCapital: this.initialCapital
        };
    }
};
