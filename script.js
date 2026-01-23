// Game State
let gameState = {
    balance: 0.000000001,      // Start with minimal amount
    totalMined: 0.000000001,
    miningSpeed: 9,            // 9 seconds per cycle
    miningAmount: 0.000000001, // Amount per cycle
    upgrades: {
        speedLevel: 0,         // Each level reduces time by 3s
        efficiencyLevel: 0,    // Each level doubles amount
        maxSpeedLevel: 10,     // Maximum upgrade levels
        maxEfficiencyLevel: 5
    },
    isMining: false,
    miningInterval: null,
    progress: 0
};

// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Load saved game state
function loadGameState() {
    const saved = localStorage.getItem('btcMinerGame');
    if (saved) {
        gameState = {...gameState, ...JSON.parse(saved)};
    }
    updateUI();
}

// Save game state
function saveGameState() {
    localStorage.setItem('btcMinerGame', JSON.stringify(gameState));
}

// Update UI
function updateUI() {
    // Update balance
    document.getElementById('balance').textContent = gameState.balance.toFixed(9);
    document.getElementById('available-balance').textContent = gameState.balance.toFixed(9);
    document.getElementById('total-mined').textContent = gameState.totalMined.toFixed(9);
    
    // Update mining speed display
    const speed = gameState.miningSpeed - (gameState.upgrades.speedLevel * 3);
    document.getElementById('mining-speed').textContent = 
        `${Math.max(3, speed)}s`; // Minimum 3 seconds
    
    // Update upgrade costs
    updateUpgradeCosts();
    
    // Update button text
    document.getElementById('mine-btn').textContent = 
        gameState.isMining ? '⛏️ Mining...' : 'Start Mining';
}

// Start mining
function startMining() {
    if (gameState.isMining) return;
    
    gameState.isMining = true;
    updateUI();
    
    // Calculate actual mining speed with upgrades
    const baseSpeed = 9;
    const speedReduction = gameState.upgrades.speedLevel * 3;
    const actualSpeed = Math.max(3, baseSpeed - speedReduction); // Minimum 3s
    
    // Calculate mining amount with upgrades
    const baseAmount = 0.000000001;
    const efficiencyMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const actualAmount = baseAmount * efficiencyMultiplier;
    
    // Start progress bar animation
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 100 / (actualSpeed * 10); // Update 10 times per second
        document.getElementById('progress').style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            completeMiningCycle(actualAmount);
        }
    }, 100);
    
    // Store interval reference
    gameState.miningInterval = progressInterval;
}

// Complete one mining cycle
function completeMiningCycle(amount) {
    gameState.balance += amount;
    gameState.totalMined += amount;
    gameState.isMining = false;
    gameState.progress = 0;
    
    // Reset progress bar
    document.getElementById('progress').style.width = '0%';
    
    // Add mining animation
    const miner = document.getElementById('miner');
    miner.style.transform = 'scale(1.2)';
    setTimeout(() => {
        miner.style.transform = 'scale(1)';
    }, 300);
    
    // Play mining sound (optional)
    playMiningSound();
    
    updateUI();
    saveGameState();
}

// Upgrade functions
function buyUpgrade(type) {
    let cost = 0;
    
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            showMessage('Maximum speed level reached!');
            return;
        }
        cost = 0.00001 * Math.pow(2, gameState.upgrades.speedLevel);
        
        if (gameState.balance >= cost) {
            gameState.balance -= cost;
            gameState.upgrades.speedLevel++;
            showMessage(`⚡ Speed upgraded! Mining now takes ${Math.max(3, 9 - (gameState.upgrades.speedLevel * 3))} seconds`);
        } else {
            showMessage('Insufficient balance!');
            return;
        }
    }
    
    else if (type === 'efficiency') {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            showMessage('Maximum efficiency level reached!');
            return;
        }
        cost = 0.0001 * Math.pow(2, gameState.upgrades.efficiencyLevel);
        
        if (gameState.balance >= cost) {
            gameState.balance -= cost;
            gameState.upgrades.efficiencyLevel++;
            showMessage(`💎 Efficiency upgraded! Now mining ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x more BTC`);
        } else {
            showMessage('Insufficient balance!');
            return;
        }
    }
    
    updateUI();
    saveGameState();
}

// Update upgrade costs display
function updateUpgradeCosts() {
    const speedCost = 0.00001 * Math.pow(2, gameState.upgrades.speedLevel);
    const efficiencyCost = 0.0001 * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    document.querySelectorAll('.cost')[0].textContent = `${speedCost.toFixed(8)} BTC`;
    document.querySelectorAll('.cost')[1].textContent = `${efficiencyCost.toFixed(8)} BTC`;
    
    // Update upgrade buttons
    const speedBtn = document.querySelectorAll('.btn-upgrade')[0];
    const efficiencyBtn = document.querySelectorAll('.btn-upgrade')[1];
    
    speedBtn.textContent = gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel 
        ? 'MAX LEVEL' 
        : 'Buy Upgrade';
    
    efficiencyBtn.textContent = gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel
        ? 'MAX LEVEL'
        : 'Buy Upgrade';
    
    speedBtn.disabled = gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel;
    efficiencyBtn.disabled = gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel;
}

// Withdraw function
function withdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const wallet = document.getElementById('wallet-address').value.trim();
    
    if (!amount || amount <= 0) {
        showMessage('Please enter a valid amount');
        return;
    }
    
    if (amount > gameState.balance) {
        showMessage('Insufficient balance!');
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        showMessage('Please enter a valid BTC wallet address');
        return;
    }
    
    // In real app, this would call your backend API
    // For demo, we'll just simulate
    tg.showConfirm(`Withdraw ${amount.toFixed(8)} BTC to ${wallet}?`, (confirmed) => {
        if (confirmed) {
            gameState.balance -= amount;
            
            // Add to history
            addToHistory(amount, wallet);
            
            showMessage(`Withdrawal request sent for ${amount.toFixed(8)} BTC`);
            updateUI();
            saveGameState();
            
            // Clear form
            document.getElementById('withdraw-amount').value = '';
            document.getElementById('wallet-address').value = '';
        }
    });
}

// Add to withdrawal history
function addToHistory(amount, wallet) {
    const historyList = document.getElementById('history-list');
    const date = new Date().toLocaleDateString();
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <p>${date}: ${amount.toFixed(8)} BTC to ${wallet.substring(0, 10)}...</p>
        <span class="status pending">⏳ Pending</span>
    `;
    historyList.prepend(item);
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Utility functions
function showMessage(text) {
    tg.showAlert(text);
}

function playMiningSound() {
    // Optional: Add mining sound
    // const audio = new Audio('mining-sound.mp3');
    // audio.play().catch(e => console.log('Audio play failed:', e));
}

// Auto-save every minute
setInterval(saveGameState, 60000);

// Initialize game
loadGameState();

// Show welcome message
setTimeout(() => {
    if (!localStorage.getItem('btcMinerWelcome')) {
        showMessage('Welcome to BTC DK Mining! Start with 0.000000001 BTC and upgrade your miner to earn more!');
        localStorage.setItem('btcMinerWelcome', 'true');
    }
}, 1000);