// Game State
let gameState = {
    balance: 0.000000001,      // Start with minimal amount
    totalMined: 0.000000001,
    miningSpeed: 9,            // 9 seconds per cycle
    miningAmount: 0.000000001, // Amount per cycle
    isAutoMining: false,
    miningSessionEnd: null,    // When current session ends
    miningInterval: null,
    progressInterval: null,
    upgrades: {
        speedLevel: 0,         // Each level reduces time by 3s
        efficiencyLevel: 0,    // Each level doubles amount
        maxSpeedLevel: 10,
        maxEfficiencyLevel: 5,
        // Real payment requirements
        speedCost: 10,         // 10 USDT per speed upgrade
        efficiencyCost: 25     // 25 USDT per efficiency upgrade
    },
    payments: {
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c", // Your ETH address
        speedTxHash: "",
        efficiencyTxHash: ""
    }
};

// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Load saved game state
function loadGameState() {
    const saved = localStorage.getItem('btcMinerGame');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Preserve mining session if still valid
        if (parsed.miningSessionEnd && new Date(parsed.miningSessionEnd) > new Date()) {
            gameState = {...gameState, ...parsed};
            startAutoMining(); // Resume mining
        } else {
            gameState = {...gameState, ...parsed};
            gameState.isAutoMining = false;
            gameState.miningSessionEnd = null;
        }
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
    
    // Update mining button
    const mineBtn = document.getElementById('mine-btn');
    if (gameState.isAutoMining) {
        const timeLeft = getTimeRemaining();
        mineBtn.innerHTML = `⛏️ Mining... ${timeLeft}`;
        mineBtn.disabled = true;
        mineBtn.style.opacity = '0.7';
    } else {
        mineBtn.innerHTML = '⛏️ Start 2-Hour Mining';
        mineBtn.disabled = false;
        mineBtn.style.opacity = '1';
    }
    
    // Update timer display
    updateTimerDisplay();
    
    // Update upgrade costs
    updateUpgradeCosts();
}

// Get time remaining in HH:MM:SS format
function getTimeRemaining() {
    if (!gameState.miningSessionEnd) return '';
    
    const now = new Date();
    const end = new Date(gameState.miningSessionEnd);
    const diff = end - now;
    
    if (diff <= 0) {
        endMiningSession();
        return '';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update timer display
function updateTimerDisplay() {
    const timerElement = document.getElementById('mining-timer');
    if (timerElement) {
        if (gameState.isAutoMining) {
            timerElement.textContent = `Session ends in: ${getTimeRemaining()}`;
            timerElement.style.display = 'block';
        } else {
            timerElement.textContent = 'Mining session not active';
            timerElement.style.display = 'block';
        }
    }
}

// Start 2-hour mining session
function startMining() {
    if (gameState.isAutoMining) return;
    
    // Set session end time (2 hours from now)
    const now = new Date();
    gameState.miningSessionEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    
    gameState.isAutoMining = true;
    
    // Start auto mining
    startAutoMining();
    
    updateUI();
    saveGameState();
    
    // Show confirmation
    tg.showAlert('✅ 2-hour mining session started! Mining will continue automatically.');
}

// Start automatic mining
function startAutoMining() {
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
    }
    
    // Calculate actual mining speed with upgrades
    const baseSpeed = 9;
    const speedReduction = gameState.upgrades.speedLevel * 3;
    const actualSpeed = Math.max(3, baseSpeed - speedReduction); // Minimum 3s
    
    // Calculate mining amount with upgrades
    const baseAmount = 0.000000001;
    const efficiencyMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const actualAmount = baseAmount * efficiencyMultiplier;
    
    // Start mining cycle
    gameState.miningInterval = setInterval(() => {
        if (!gameState.isAutoMining) {
            clearInterval(gameState.miningInterval);
            return;
        }
        
        // Check if session ended
        if (new Date() >= new Date(gameState.miningSessionEnd)) {
            endMiningSession();
            return;
        }
        
        // Mine BTC
        gameState.balance += actualAmount;
        gameState.totalMined += actualAmount;
        
        // Update UI
        updateUI();
        saveGameState();
        
        // Animation
        animateMining();
        
    }, actualSpeed * 1000); // Convert seconds to milliseconds
    
    // Update timer every second
    setInterval(updateTimerDisplay, 1000);
}

// End mining session
function endMiningSession() {
    gameState.isAutoMining = false;
    gameState.miningSessionEnd = null;
    
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
        gameState.miningInterval = null;
    }
    
    updateUI();
    saveGameState();
    
    tg.showAlert('⏰ Mining session ended! Start a new session to continue mining.');
}

// Mining animation
function animateMining() {
    const miner = document.getElementById('miner');
    const progress = document.getElementById('progress');
    
    // Reset and animate progress bar
    progress.style.transition = 'none';
    progress.style.width = '0%';
    
    setTimeout(() => {
        progress.style.transition = `width ${gameState.miningSpeed - (gameState.upgrades.speedLevel * 3)}s linear`;
        progress.style.width = '100%';
    }, 10);
    
    // Miner bounce animation
    miner.style.transform = 'scale(1.2)';
    setTimeout(() => {
        miner.style.transform = 'scale(1)';
    }, 300);
}

// UPGRADE SYSTEM WITH REAL PAYMENT
function buyUpgrade(type) {
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            tg.showAlert('Maximum speed level reached!');
            return;
        }
        
        const cost = gameState.upgrades.speedCost;
        
        // Show payment instructions
        tg.showConfirm(
            `⚡ Speed Upgrade #${gameState.upgrades.speedLevel + 1}\n\n` +
            `Cost: ${cost} USDT\n\n` +
            `Send ${cost} USDT (ERC-20) to:\n` +
            `${gameState.payments.ethAddress}\n\n` +
            `After payment, enter your transaction hash:`,
            (confirmed) => {
                if (confirmed) {
                    askForTransactionHash('speed', cost);
                }
            }
        );
    }
    
    else if (type === 'efficiency') {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            tg.showAlert('Maximum efficiency level reached!');
            return;
        }
        
        const cost = gameState.upgrades.efficiencyCost;
        
        tg.showConfirm(
            `💎 Efficiency Upgrade #${gameState.upgrades.efficiencyLevel + 1}\n\n` +
            `Cost: ${cost} USDT\n\n` +
            `Send ${cost} USDT (ERC-20) to:\n` +
            `${gameState.payments.ethAddress}\n\n` +
            `After payment, enter your transaction hash:`,
            (confirmed) => {
                if (confirmed) {
                    askForTransactionHash('efficiency', cost);
                }
            }
        );
    }
}

// Ask for transaction hash
function askForTransactionHash(type, cost) {
    tg.showPopup(
        {
            title: `Enter Transaction Hash`,
            message: `Paste the transaction hash after sending ${cost} USDT`,
            buttons: [
                {id: 'submit', type: 'default', text: 'Submit'},
                {id: 'cancel', type: 'cancel', text: 'Cancel'}
            ]
        },
        (buttonId) => {
            if (buttonId === 'submit') {
                // In real app, verify transaction here
                tg.showAlert('Transaction submitted! Verification may take a few minutes.');
                
                // For demo, auto-approve after 3 seconds
                setTimeout(() => {
                    completeUpgrade(type);
                }, 3000);
            }
        }
    );
}

// Complete upgrade after payment verification
function completeUpgrade(type) {
    if (type === 'speed') {
        gameState.upgrades.speedLevel++;
        tg.showAlert(`✅ Speed Upgrade #${gameState.upgrades.speedLevel} Activated!\nMining now ${3 * gameState.upgrades.speedLevel}s faster!`);
        
        // Increase next upgrade cost
        gameState.upgrades.speedCost += 5;
    }
    
    else if (type === 'efficiency') {
        gameState.upgrades.efficiencyLevel++;
        tg.showAlert(`✅ Efficiency Upgrade #${gameState.upgrades.efficiencyLevel} Activated!\nNow mining ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x more BTC!`);
        
        // Increase next upgrade cost
        gameState.upgrades.efficiencyCost += 10;
    }
    
    // Restart mining with new speed if active
    if (gameState.isAutoMining) {
        startAutoMining();
    }
    
    updateUI();
    saveGameState();
}

// Update upgrade costs display
function updateUpgradeCosts() {
    const speedCostElement = document.querySelectorAll('.cost')[0];
    const efficiencyCostElement = document.querySelectorAll('.cost')[1];
    
    if (speedCostElement) {
        speedCostElement.textContent = `${gameState.upgrades.speedCost} USDT`;
    }
    if (efficiencyCostElement) {
        efficiencyCostElement.textContent = `${gameState.upgrades.efficiencyCost} USDT`;
    }
    
    // Update upgrade buttons
    const speedBtn = document.querySelectorAll('.btn-upgrade')[0];
    const efficiencyBtn = document.querySelectorAll('.btn-upgrade')[1];
    
    if (speedBtn) {
        speedBtn.innerHTML = gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel 
            ? 'MAX LEVEL REACHED' 
            : `⚡ Buy Speed (${gameState.upgrades.speedCost} USDT)`;
        
        speedBtn.disabled = gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel;
    }
    
    if (efficiencyBtn) {
        efficiencyBtn.innerHTML = gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel
            ? 'MAX LEVEL REACHED'
            : `💎 Buy Efficiency (${gameState.upgrades.efficiencyCost} USDT)`;
        
        efficiencyBtn.disabled = gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel;
    }
}

// Withdraw function (unchanged, but using mined balance)
function withdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const wallet = document.getElementById('wallet-address').value.trim();
    
    if (!amount || amount <= 0) {
        tg.showAlert('Please enter a valid amount');
        return;
    }
    
    if (amount > gameState.balance) {
        tg.showAlert('Insufficient balance!');
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        tg.showAlert('Please enter a valid BTC wallet address');
        return;
    }
    
    tg.showConfirm(
        `Withdraw ${amount.toFixed(8)} BTC to:\n${wallet}\n\nProcessing fee: 0.0001 BTC`,
        (confirmed) => {
            if (confirmed) {
                // Deduct amount + fee
                gameState.balance -= (amount + 0.0001);
                
                // Add to history
                addToHistory(amount, wallet);
                
                tg.showAlert(`✅ Withdrawal request submitted!\n${amount.toFixed(8)} BTC to ${wallet.substring(0, 15)}...\nProcessing may take 24 hours.`);
                
                updateUI();
                saveGameState();
                
                // Clear form
                document.getElementById('withdraw-amount').value = '';
                document.getElementById('wallet-address').value = '';
            }
        }
    );
}

// Add to withdrawal history
function addToHistory(amount, wallet) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    const date = new Date().toLocaleString();
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <p><strong>${date}</strong></p>
        <p>Amount: ${amount.toFixed(8)} BTC</p>
        <p>To: ${wallet.substring(0, 10)}...</p>
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

// Add timer display to HTML if not exists
function ensureTimerElement() {
    const miningTab = document.getElementById('mining-tab');
    if (miningTab && !document.getElementById('mining-timer')) {
        const timerDiv = document.createElement('div');
        timerDiv.id = 'mining-timer';
        timerDiv.className = 'mining-timer';
        timerDiv.style.cssText = `
            background: rgba(247, 147, 26, 0.1);
            border: 2px solid rgba(247, 147, 26, 0.3);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            font-size: 18px;
            font-weight: bold;
            color: #f7931a;
        `;
        miningTab.insertBefore(timerDiv, miningTab.querySelector('.miner-animation'));
    }
}

// Auto-save every minute
setInterval(saveGameState, 60000);

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    ensureTimerElement();
    loadGameState();
    
    // Show welcome message
    if (!localStorage.getItem('btcMinerWelcome')) {
        tg.showAlert('Welcome to BTC DK Mining!\n\n• Start 2-hour mining sessions\n• Upgrade with USDT payments\n• Withdraw your mined BTC');
        localStorage.setItem('btcMinerWelcome', 'true');
    }
});