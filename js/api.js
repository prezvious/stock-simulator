// API and Data Handling Module

const API = {
    // Simulate fetching data
    async fetchAssets() {
        console.log("Fetching assets...");
        try {
            const [stocksResponse, coinsResponse] = await Promise.all([
                fetch('stocks_database.csv'),
                fetch('coins_database.csv')
            ]);

            if (!stocksResponse.ok || !coinsResponse.ok) {
                throw new Error("Failed to fetch CSV files");
            }

            const stocksText = await stocksResponse.text();
            const coinsText = await coinsResponse.text();

            const stocks = this.parseCSV(stocksText, 'stock');
            const coins = this.parseCSV(coinsText, 'crypto');

            return [...stocks, ...coins];
        } catch (error) {
            console.error("Error loading data:", error);
            // Return fallback data if fetch fails
            return this.getFallbackData();
        }
    },

    // Parse CSV helper
    parseCSV(csvText, type) {
        // Handle potential carriage returns for Windows line endings
        const lines = csvText.trim().split(/\r?\n/);
        const assets = [];

        for (let i = 1; i < lines.length; i++) {
            // Split by comma, but be careful if fields contain commas (though likely not in this dataset)
            const row = lines[i].split(',');
            if (row.length < 2) continue; // Skip empty lines

            let asset = {};

            if (type === 'stock') {
                // No,Company Name,Ticker,Sector,Initial Price ($)
                const sector = row[3] ? row[3].trim() : '';
                asset = {
                    id: `stock_${row[0]}`,
                    name: row[1],
                    symbol: row[2],
                    sector: sector,
                    price: parseFloat(row[4]),
                    type: 'stock',
                    // "Materials" and "Tech" sectors should be more volatile than "Utilities"
                    volatility: (sector === 'Materials' || sector === 'Technology') ? 0.015 : (sector === 'Utilities' ? 0.005 : 0.01)
                };
            } else {
                // No,Coin Name,Symbol,Initial Price ($),Total Supply,Supply Category
                const category = row[5] ? row[5].trim() : '';
                asset = {
                    id: `coin_${row[0]}`,
                    name: row[1],
                    symbol: row[2],
                    price: parseFloat(row[3]),
                    supply: parseFloat(row[4]),
                    category: category,
                    type: 'crypto',
                    // "Meme" coins must have higher volatility
                    volatility: (category === 'meme' || category === 'ultra_scarce') ? 0.04 : 0.02
                };
            }
            assets.push(asset);
        }
        return assets;
    },

    // Fallback data if CSV loading fails
    getFallbackData() {
        return [
            { id: 'stock_1', name: 'Alpha Electric', symbol: 'ALEL', sector: 'Technology', price: 207.05, type: 'stock', volatility: 0.015 },
            { id: 'stock_2', name: 'Eagle Systems', symbol: 'EASY', sector: 'Technology', price: 270.82, type: 'stock', volatility: 0.015 },
            { id: 'stock_5', name: 'Spark Capital', symbol: 'SPCA', sector: 'Healthcare', price: 196.14, type: 'stock', volatility: 0.01 },
            { id: 'stock_16', name: 'Star Foods', symbol: 'STFO', sector: 'Materials', price: 328.51, type: 'stock', volatility: 0.015 },
            { id: 'stock_4', name: 'Global Tech', symbol: 'GLTE', sector: 'Communications', price: 303.16, type: 'stock', volatility: 0.01 },
            { id: 'coin_12', name: 'SilverChain', symbol: 'SIL', price: 0.9623, category: 'ultra_scarce', type: 'crypto', volatility: 0.04 },
            { id: 'coin_13', name: 'Red Sphere', symbol: 'RSP', price: 113.37, category: 'ultra_scarce', type: 'crypto', volatility: 0.04 },
            { id: 'coin_33', name: 'DogeProtocol', symbol: 'DOG', price: 0.000143, category: 'meme', type: 'crypto', volatility: 0.08 },
            { id: 'coin_3', name: 'Spark Protocol', symbol: 'SPR', price: 0.059, category: 'scarce', type: 'crypto', volatility: 0.02 },
            { id: 'coin_34', name: 'Lite Coin', symbol: 'LCO', price: 0.0005291, category: 'moderate', type: 'crypto', volatility: 0.02 }
        ];
    }
};
