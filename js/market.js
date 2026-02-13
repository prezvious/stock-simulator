// Market Data Management

const Market = {
    assets: [],
    onPriceUpdate: null, // Callback for price updates

    async init() {
        console.log("Initializing Market...");
        this.assets = await API.fetchAssets();
        console.log(`Loaded ${this.assets.length} assets.`);
    },

    getAsset(symbol) {
        return this.assets.find(a => a.symbol === symbol);
    },

    getAllAssets() {
        return this.assets;
    },

    // Simulate price updates
    updatePrices() {
        this.assets.forEach(asset => {
            const volatility = asset.volatility || 0.01;
            const changePercent = (Math.random() - 0.5) * 2 * volatility; // -volatility to +volatility

            // Add some "trend" bias occasionally? For now, random walk.
            // Maybe add sector correlation later.

            const changeAmount = asset.price * changePercent;
            asset.price += changeAmount;

            // Ensure price doesn't go below minimum tick size
            if (asset.type === 'stock' && asset.price < 0.01) asset.price = 0.01;
            if (asset.type === 'crypto' && asset.price < 0.00000001) asset.price = 0.00000001;

            asset.change = changePercent * 100; // Store 24h change (simulated for now as just last tick)

            // In a real app, "change" is 24h change. Here we might accumulate it or just show tick change.
            // Let's accumulate it slightly to look realistic or reset it daily.
            // For this simulator, let's treat 'change' as a running session change.
            if (!asset.initialSessionPrice) asset.initialSessionPrice = asset.price;
            asset.change24h = ((asset.price - asset.initialSessionPrice) / asset.initialSessionPrice) * 100;
        });

        if (this.onPriceUpdate) {
            this.onPriceUpdate(this.assets);
        }
    }
};
