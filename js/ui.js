// UI Management Module

const UI = {
    selectedSymbol: null,

    init() {
        console.log("Initializing UI...");
        this.cacheDOM();
        this.bindEvents();
        this.renderPortfolio();
        this.updateTheme();
    },

    cacheDOM() {
        this.dom = {
            assetTable: document.getElementById('asset-list-body'),
            tickerContent: document.getElementById('ticker-content'),
            searchInput: document.getElementById('search-input'),

            // Portfolio
            totalEquity: document.getElementById('total-equity'),
            buyingPower: document.getElementById('buying-power'),
            dayPL: document.getElementById('day-pl'),

            // Order Form
            orderForm: document.getElementById('order-form'),
            tradeSymbol: document.getElementById('trade-symbol'),
            orderType: document.getElementById('order-type'),
            orderPrice: document.getElementById('order-price'),
            orderQuantity: document.getElementById('order-quantity'),
            orderCost: document.getElementById('order-cost'),
            buyBtn: document.getElementById('buy-btn'),
            sellBtn: document.getElementById('sell-btn'),
            priceInputGroup: document.getElementById('price-input-group'),
            trailingInputGroup: document.getElementById('trailing-input-group'), trailingPercent: document.getElementById('trailing-percent'),

            // Tabs
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            positionsBody: document.getElementById('positions-body'),
            ordersBody: document.getElementById('orders-body'),
            historyBody: document.getElementById('history-body'),

            // Theme
            themeBtn: document.getElementById('theme-btn')
        };
    },

    bindEvents() {
        // Asset Selection
        this.dom.assetTable.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                const symbol = row.dataset.symbol;
                this.selectAsset(symbol);
            }
        });

        // Search
        this.dom.searchInput.addEventListener('input', (e) => {
            this.renderAssetList(e.target.value);
        });

        // Order Type Change
        this.dom.orderType.addEventListener('change', (e) => {
            this.updateOrderFormInputs(e.target.value);
        });

        // Order Form Calculations
        this.dom.orderQuantity.addEventListener('input', () => this.updateOrderPreview());
        this.dom.orderPrice.addEventListener('input', () => this.updateOrderPreview());

        // Place Order
        this.dom.buyBtn.addEventListener('click', () => this.handleOrder('BUY'));
        this.dom.sellBtn.addEventListener('click', () => this.handleOrder('SELL'));

        // Tabs
        this.dom.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.tabBtns.forEach(b => b.classList.remove('active'));
                this.dom.tabContents.forEach(c => c.style.display = 'none');

                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).style.display = 'block';
            });
        });

        // Theme
        this.dom.themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const icon = this.dom.themeBtn.querySelector('i');
            if (document.body.classList.contains('light-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    },

    selectAsset(symbol) {
        this.selectedSymbol = symbol;
        this.dom.tradeSymbol.textContent = symbol;
        this.updateOrderPreview();

        // Generate dummy historical data for chart for now
        // In real app, we'd fetch history
        this.generateChartData(symbol);
    },

    generateChartData(symbol) {
        const asset = Market.getAsset(symbol);
        if (!asset) return;

        // Generate 50 candles ending at current price
        const data = [];
        let price = asset.price;
        const volatility = asset.volatility || 0.01;

        for (let i = 0; i < 50; i++) {
            const time = i; // Dummy time
            const change = (Math.random() - 0.5) * 2 * volatility * price;
            const close = price;
            const open = price - change;
            const high = Math.max(open, close) + Math.random() * volatility * price;
            const low = Math.min(open, close) - Math.random() * volatility * price;

            data.unshift({ time, open, high, low, close });
            price = open; // Work backwards
        }

        Chart.setData(data);
        document.getElementById('chart-title').textContent = `${asset.name} (${asset.symbol})`;
    },

    updateOrderFormInputs(type) {
        this.dom.priceInputGroup.style.display = 'none';
        this.dom.trailingInputGroup.style.display = 'none';

        if (type === 'LIMIT' || type === 'STOP_LOSS' || type === 'TAKE_PROFIT') {
            this.dom.priceInputGroup.style.display = 'block';
        } else if (type === 'TRAILING_STOP') {
            this.dom.trailingInputGroup.style.display = 'block';
        }
    },

    updateOrderPreview() {
        if (!this.selectedSymbol) return;
        const asset = Market.getAsset(this.selectedSymbol);
        if (!asset) return;

        const qty = parseFloat(this.dom.orderQuantity.value) || 0;
        const type = this.dom.orderType.value;
        let price = asset.price;

        if (type === 'LIMIT' || type === 'STOP_LOSS' || type === 'TAKE_PROFIT') {
            price = parseFloat(this.dom.orderPrice.value) || 0;
        }

        const cost = qty * price;
        this.dom.orderCost.textContent = formatCurrency(cost);
    },

    handleOrder(action) {
        if (!this.selectedSymbol) {
            alert("Please select an asset first.");
            return;
        }

        const type = this.dom.orderType.value;
        const quantity = parseFloat(this.dom.orderQuantity.value);
        const priceInput = parseFloat(this.dom.orderPrice.value);
        const trailPercent = parseFloat(this.dom.trailingPercent.value);

        if (!quantity || quantity <= 0) {
            alert("Invalid quantity.");
            return;
        }

        const orderRequest = {
            symbol: this.selectedSymbol,
            type: type,
            action: action,
            quantity: quantity,
            price: priceInput, // Limit price
            triggerPrice: priceInput, // Stop/TP price
            trailPercent: trailPercent
        };

        const result = OrderEngine.placeOrder(orderRequest);
        if (result.success) {
            // alert(result.message);
            this.renderOrders(); // Refresh orders table
            this.renderPortfolio(); // Refresh portfolio (cash deduction if Market Buy)
        } else {
            alert(result.message);
        }
    },

    renderAssetList(filter = "") {
        const assets = Market.getAllAssets();
        let html = "";

        assets.forEach(asset => {
            if (filter && !asset.symbol.toLowerCase().includes(filter.toLowerCase()) && !asset.name.toLowerCase().includes(filter.toLowerCase())) {
                return;
            }

            const changeClass = getChangeClass(asset.change24h || 0);
            html += `
                <tr data-symbol="${asset.symbol}">
                    <td>
                        <div style="font-weight:bold">${asset.symbol}</div>
                        <div style="font-size:0.8em;color:#888">${asset.name}</div>
                    </td>
                    <td>${formatPrice(asset.price)}</td>
                    <td class="${changeClass}">${formatPercentage(asset.change24h || 0)}</td>
                </tr>
            `;
        });

        this.dom.assetTable.innerHTML = html;
        this.updateTicker(assets);
    },

    updateTicker(assets) {
        // Just show top 10 movers for now
        let html = "";
        assets.slice(0, 10).forEach(asset => {
             const changeClass = getChangeClass(asset.change24h || 0);
             html += `<span class="ticker-item">${asset.symbol} ${formatPrice(asset.price)} <span class="${changeClass}">(${formatPercentage(asset.change24h || 0)})</span></span>`;
        });
        this.dom.tickerContent.innerHTML = html;
    },

    renderPortfolio() {
        const metrics = Portfolio.getMetrics();
        this.dom.totalEquity.textContent = formatCurrency(metrics.equity);
        this.dom.buyingPower.textContent = formatCurrency(metrics.buyingPower);

        const plClass = getChangeClass(metrics.totalPL);
        this.dom.dayPL.innerHTML = `<span class="${plClass}">${formatCurrency(metrics.totalPL)} (${metrics.totalPLPercent.toFixed(2)}%)</span>`;

        // Render Positions
        let posHtml = "";
        for (const symbol in Portfolio.holdings) {
            const holding = Portfolio.holdings[symbol];
            const asset = Market.getAsset(symbol);
            if (!asset) continue;

            const marketValue = holding.quantity * asset.price;
            const costBasis = holding.quantity * holding.avgPrice;
            const pl = marketValue - costBasis;
            const plPercent = (pl / costBasis) * 100;
            const plClass = getChangeClass(pl);

            posHtml += `
                <tr>
                    <td>${symbol}</td>
                    <td>${holding.quantity.toFixed(4)}</td>
                    <td>${formatPrice(holding.avgPrice)}</td>
                    <td>${formatPrice(asset.price)}</td>
                    <td class="${plClass}">${formatCurrency(pl)}</td>
                    <td class="${plClass}">${plPercent.toFixed(2)}%</td>
                    <td><button onclick="UI.selectAsset('${symbol}')" style="background:#333;color:#fff;border:none;padding:2px 5px;cursor:pointer">Trade</button></td>
                </tr>
            `;
        }
        this.dom.positionsBody.innerHTML = posHtml;
    },

    renderOrders() {
        const orders = OrderEngine.getOrders();
        let html = "";
        orders.forEach(order => {
            html += `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.type}</td>
                    <td>${order.symbol}</td>
                    <td>${order.quantity}</td>
                    <td>${order.type === 'MARKET' ? 'Market' : formatPrice(order.triggerPrice || order.price)}</td>
                    <td>${order.status}</td>
                    <td><button onclick="OrderEngine.cancelOrder(${order.id}); UI.renderOrders();" style="color:red;background:none;border:none;cursor:pointer">X</button></td>
                </tr>
            `;
        });
        this.dom.ordersBody.innerHTML = html;

        // Also render history
        let histHtml = "";
        Portfolio.history.forEach(trade => {
             histHtml += `
                <tr>
                    <td>${new Date(trade.date).toLocaleTimeString()}</td>
                    <td>${trade.symbol}</td>
                    <td>${trade.type}</td>
                    <td>${trade.quantity}</td>
                    <td>${formatPrice(trade.price)}</td>
                    <td class="${getChangeClass(trade.pl)}">${formatCurrency(trade.pl)}</td>
                </tr>
            `;
        });
        this.dom.historyBody.innerHTML = histHtml;
    },

    // Called by Game Loop
    update() {
        // Optimize: don't re-render entire asset list every tick if list is long
        // Just update visible prices?
        // For simplicity, re-render top visible or just selected?
        // Let's re-render asset list for now, it's fast enough for 140 items.
        this.renderAssetList(this.dom.searchInput.value);
        this.renderPortfolio();
        this.renderOrders();

        // Update Chart with live candle updates
        if (this.selectedSymbol) {
            const asset = Market.getAsset(this.selectedSymbol);
            // In a real chart, we'd update the last candle.
            // For this simple demo, we regenerate random history ending at current price
            // to show "movement" without storing full history in memory yet.
            // Ideally Chart module would accept a "tick" and update the last candle.
            // Let's just update the title price for now.
            document.getElementById('chart-title').textContent = `${asset.name} (${asset.symbol}) - ${formatPrice(asset.price)}`;
        }
    }
};
