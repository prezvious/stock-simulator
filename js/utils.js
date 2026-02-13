// Utility Functions

// Format currency
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return "-bash.00";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format number with commas
function formatNumber(num) {
    if (num === undefined || num === null) return "0";
    return new Intl.NumberFormat('en-US').format(num);
}

// Format small crypto prices
function formatPrice(price) {
    if (price < 0.01) {
        return '$' + price.toFixed(8);
    } else if (price < 1) {
        return '$' + price.toFixed(4);
    } else {
        return formatCurrency(price);
    }
}

// Generate random number between min and max
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Calculate percentage change
function calculateChange(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

// Format percentage
function formatPercentage(percent) {
    return (percent > 0 ? "+" : "") + percent.toFixed(2) + "%";
}

// Get CSS class for change
function getChangeClass(change) {
    return change >= 0 ? 'positive' : 'negative';
}
