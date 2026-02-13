// Custom Canvas Charting Module

const Chart = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    data: [], // [{ time, open, high, low, close }]
    padding: { top: 20, right: 50, bottom: 30, left: 10 },

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => {
            this.resize();
            this.draw();
        });
    },

    resize() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
    },

    setData(data) {
        this.data = data;
        this.draw();
    },

    draw() {
        if (!this.ctx || this.data.length === 0) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = "#000"; // Background
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Calculate visible range
        // For simplicity, show all data for now, or last N candles
        const numCandles = this.data.length;
        // Candle width
        const candleSpacing = (this.width - this.padding.left - this.padding.right) / numCandles;
        const candleWidth = Math.max(1, candleSpacing * 0.8);

        // Calculate Min/Max Price for Y-Axis
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        for (const d of this.data) {
            if (d.low < minPrice) minPrice = d.low;
            if (d.high > maxPrice) maxPrice = d.high;
        }

        // Add padding to price range
        const priceRange = maxPrice - minPrice;
        minPrice -= priceRange * 0.1;
        maxPrice += priceRange * 0.1;

        if (minPrice === maxPrice) {
            minPrice -= 1;
            maxPrice += 1;
        }

        // Helper to convert price to Y coord
        const getY = (price) => {
            return this.padding.top + (1 - (price - minPrice) / (maxPrice - minPrice)) * (this.height - this.padding.top - this.padding.bottom);
        };

        // Draw Grid
        this.ctx.strokeStyle = "#333";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        // Horizontal grid lines
        const numGridLines = 5;
        for (let i = 0; i <= numGridLines; i++) {
            const y = this.padding.top + (i / numGridLines) * (this.height - this.padding.top - this.padding.bottom);
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);

            // Draw Price Label
            const priceVal = maxPrice - (i / numGridLines) * (maxPrice - minPrice);
            this.ctx.fillStyle = "#888";
            this.ctx.font = "10px Arial";
            this.ctx.fillText(priceVal.toFixed(2), this.width - 45, y + 3);
        }
        this.ctx.stroke();

        // Draw Candles
        for (let i = 0; i < numCandles; i++) {
            const d = this.data[i];
            const x = this.padding.left + i * candleSpacing + candleSpacing / 2;

            const openY = getY(d.open);
            const closeY = getY(d.close);
            const highY = getY(d.high);
            const lowY = getY(d.low);

            const isUp = d.close >= d.open;
            this.ctx.fillStyle = isUp ? "#4caf50" : "#f44336";
            this.ctx.strokeStyle = isUp ? "#4caf50" : "#f44336";

            // Draw wick
            this.ctx.beginPath();
            this.ctx.moveTo(x, highY);
            this.ctx.lineTo(x, lowY);
            this.ctx.stroke();

            // Draw body
            const bodyHeight = Math.max(1, Math.abs(openY - closeY));
            const bodyTop = Math.min(openY, closeY);

            this.ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        }

        // Current Price Line
        if (numCandles > 0) {
            const lastCandle = this.data[numCandles - 1];
            const lastY = getY(lastCandle.close);

            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = "#fff";
            this.ctx.beginPath();
            this.ctx.moveTo(0, lastY);
            this.ctx.lineTo(this.width, lastY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Label
            this.ctx.fillStyle = "#fff";
            this.ctx.fillRect(this.width - 50, lastY - 10, 50, 20);
            this.ctx.fillStyle = "#000";
            this.ctx.fillText(lastCandle.close.toFixed(2), this.width - 45, lastY + 4);
        }
    }
};
