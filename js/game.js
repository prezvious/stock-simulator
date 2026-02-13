// Main Game Loop and Initialization

const Game = {
    isRunning: false,
    updateInterval: 1000, // 1 second
    lastSaveTime: 0,
    saveInterval: 5000, // Save every 5 seconds

    async init() {
        console.log("Starting Stock Market Simulator...");

        // 1. Load Data
        await Market.init();

        // 2. Load Persistence
        const savedState = Persistence.loadState();

        // 3. Initialize Modules
        Portfolio.init(savedState);
        OrderEngine.init(savedState);
        Chart.init('market-chart');
        UI.init();

        // 4. Start Loop
        this.isRunning = true;
        this.loop();

        console.log("Game started.");
    },

    loop() {
        if (!this.isRunning) return;

        // Schedule next loop
        setTimeout(() => this.loop(), this.updateInterval);

        // Core Game Logic
        this.update();
    },

    update() {
        // 1. Update Market Prices
        Market.updatePrices();

        // 2. Check and Execute Orders
        OrderEngine.checkOrders();

        // 3. Update UI
        UI.update();

        // 4. Auto-Save
        const now = Date.now();
        if (now - this.lastSaveTime > this.saveInterval) {
            this.save();
            this.lastSaveTime = now;
        }
    },

    save() {
        const state = {
            portfolio: Portfolio.toJSON(),
            orders: OrderEngine.toJSON()
        };
        Persistence.saveState(state);
        console.log("Game state saved.");
    }
};

// Start the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
