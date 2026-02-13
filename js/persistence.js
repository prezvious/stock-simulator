// Persistence Module

const Persistence = {
    saveKey: 'stockMarketSimulator_v1',

    // Load entire state
    loadState() {
        const saved = localStorage.getItem(this.saveKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse save data", e);
                return null;
            }
        }
        return null;
    },

    // Save entire state
    saveState(state) {
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save state", e);
        }
    },

    // Clear state (reset)
    clearState() {
        localStorage.removeItem(this.saveKey);
        location.reload();
    }
};
