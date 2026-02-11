// BTC DK MINING - SIMPLE & WORKING
// ============================================

// Game state - simple and clean
let balance = 0.000000000000001;
let totalMined = 0.000000000000001;
let miningSpeed = 9;
let baseMiningAmount = 0.000000000000001;
let speedLevel = 0;
let efficiencyLevel = 0;
let isMining = false;
let sessionEndTime = null;
let miningInterval = null;
let timerInterval = null;

// Telegram Web App
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// Load saved data
function loadGame() {
    try {
        const saved = localStorage.getItem('btc_mining_simple');
        if (saved) {
            const data = JSON.parse(saved);
            balance = data.balance || 0.000000000000001;
            totalMined = data.totalMined || 0.000000000000001;
            speedLevel = data.speedLevel || 0;
            efficiencyLevel = data.efficiencyLevel || 0;
            
            // Check if session was active
            if (data.sessionEndTime && new Date(data.sessionEndTime) > new Date()) {
                sessionEndTime = data.sessionEndTime;
                isMining = true;
                startMiningSession();
            }
        }
    } catch (e) {
        console.log('No saved data');
    }
    updateUI();
}

// Save data
function saveGame() {
    const data = {
        balance,
        totalMined,
        speedLevel,
        efficiencyLevel,
        sessionEndTime,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('btc_mining_simple', JSON.stringify(data));
}

// Format BTC
function formatBTC(value) {
    if (value === 0) return "0.000000000000000";
    return value.toFixed(15);
}

// Update UI
function updateUI() {
    // Balance displays
    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.textContent = formatBTC(balance);
    
    const availableEl = document.getElementById('available-balance');
    if (availableEl) availableEl.textContent = formatBTC(balance);
    
    const totalEl = document.getElementById('total-mined');
    if (totalEl) totalEl.textContent = formatBTC(totalMined);
    
    // Mining stats
    const currentSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
    const miningAmount = baseMiningAmount * Math.pow(2, efficiencyLevel);
    
    const speedEl = document.getElementById('mining-speed');
    if (speedEl) speedEl.textContent = currentSpeed;
    
    const amountEl = document.getElementById('mining-amount');
    if (amountEl) amountEl.textContent = formatBTC(miningAmount);
    
    const rewardEl = document.getElementById('next-reward');
    if (rewardEl) rewardEl.textContent = formatBTC(miningAmount) + ' BTC';
    
    // Upgrade levels
    const speedLevelEl = document.getElementById('speed-level');
    if (speedLevelEl) speedLevelEl.textContent = speedLevel;
    
    const speedDisplayEl = document.getElementById('speed-level-display');
    if (speedDisplayEl) speedDisplayEl.textContent = speedLevel;
    
    const effLevelEl = document.getElementById('efficiency-level');
    if (effLevelEl) effLevelEl.textContent = efficiencyLevel;
    
    const effDisplayEl = document.getElementById('efficiency-level-display');
    if (effDisplayEl) effDisplayEl.textContent = efficiencyLevel;
    
    // Speed display
    const currentSpeedEl = document.getElementById('current-mining-speed');
    if (currentSpeedEl) currentSpeedEl.textContent = currentSpeed;
    
    const nextSpeedEl = document.getElementById('next-speed');
    if (nextSpeedEl) nextSpeedEl.textContent = Math.max(3, currentSpeed - 3);
    
    // Multiplier display
    const currentMultiEl = document.getElementById('current-multiplier');
    if (currentMultiEl) currentMultiEl.textContent = Math.pow(2, efficiencyLevel);
    
    const nextMultiEl = document.getElementById('next-multiplier');
    if (nextMultiEl) nextMultiEl.textContent = Math.pow(2, efficiencyLevel + 1);
    
    // Mining button
    const mineBtn = document.getElementById('mine-btn');
    if (mineBtn) {
        if (isMining && sessionEndTime && new Date(sessionEndTime) > new Date()) {
            mineBtn.innerHTML = '⛏️ Mining in progress...';
            mineBtn.disabled = true;
        } else {
            mineBtn.innerHTML = '⚡ Start 2-Hour Mining Session';
            mineBtn.disabled = false;
            isMining = false;
            sessionEndTime = null;
        }
    }
    
    // Update timer
    updateTimer();
    
    // Upgrade buttons
    updateUpgradeButtons();
}

// Update timer
function updateTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const timerLabel = document.getElementById('timer-label');
    const sessionProgress = document.getElementById('session-progress');
    
    if (!timerDisplay) return;
    
    if (isMining && sessionEndTime) {
        const now = new Date();
        const end = new Date(sessionEndTime);
        const diff = end - now;
        
        if (diff <= 0) {
            stopMining();
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timerLabel) timerLabel.textContent = 'MINING IN PROGRESS';
        if (sessionProgress) sessionProgress.textContent = `${hours}h ${minutes}m remaining`;
    } else {
        timerDisplay.textContent = '--:--:--';
        if (timerLabel) timerLabel.textContent = 'NO ACTIVE SESSION';
        if (sessionProgress) sessionProgress.textContent = 'No active session';
    }
}

// START MINING - THIS IS THE FIXED FUNCTION
function startMining() {
    console.log('Start mining clicked'); // Debug
    
    if (isMining) {
        if (sessionEndTime && new Date(sessionEndTime) > new Date()) {
            tg?.showAlert('Mining already in progress!');
            return;
        }
    }
    
    // Set 2-hour session
    const now = new Date();
    sessionEndTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)).toISOString();
    isMining = true;
    
    // Start mining
    startMiningSession();
    saveGame();
    
    tg?.showAlert('✅ 2-hour mining session started!\nMining continues even if you leave.');
}

// Mining session
function startMiningSession() {
    // Clear old intervals
    if (miningInterval) clearInterval(miningInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    const currentSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
    const miningAmount = baseMiningAmount * Math.pow(2, efficiencyLevel);
    
    // Mining interval - THIS ADDS BTC
    miningInterval = setInterval(() => {
        if (!isMining) {
            clearInterval(miningInterval);
            return;
        }
        
        const now = new Date();
        const end = new Date(sessionEndTime);
        
        if (now >= end) {
            stopMining();
            return;
        }
        
        // ADD BTC - THIS IS THE MONEY LINE
        balance = parseFloat((balance + miningAmount).toFixed(15));
        totalMined = parseFloat((totalMined + miningAmount).toFixed(15));
        
        // Update UI
        updateUI();
        saveGame();
        
        // Animate
        animateProgress();
        
    }, currentSpeed * 1000);
    
    // Timer interval
    timerInterval = setInterval(updateTimer, 1000);
}

// Stop mining
function stopMining() {
    isMining = false;
    sessionEndTime = null;
    
    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    updateUI();
    saveGame();
    tg?.showAlert('⏹ Mining session completed!');
}

// Progress animation
function animateProgress() {
    const progressBar = document.getElementById('progress');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar && progressText) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        
        const currentSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
        
        setTimeout(() => {
            progressBar.style.transition = `width ${currentSpeed}s linear`;
            progressBar.style.width = '100%';
            
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 1;
                progressText.textContent = `${progress}%`;
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    progressText.textContent = '0%';
                }
            }, currentSpeed * 10);
        }, 10);
    }
}

// Buy upgrade
function buyUpgrade(type) {
    if (type === 'speed') {
        if (speedLevel >= 10) {
            tg?.showAlert('Maximum speed level reached!');
            return;
        }
        
        const cost = 29.99;
        const nextSpeed = Math.max(3, miningSpeed - ((speedLevel + 1) * 3));
        
        tg?.showConfirm(
            `⚡ Speed Upgrade\n\n` +
            `Cost: $${cost} USDT\n` +
            `Current Speed: ${Math.max(3, miningSpeed - (speedLevel * 3))}s\n` +
            `New Speed: ${nextSpeed}s\n\n` +
            `Send $${cost} USDT to:\n0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c`,
            (confirmed) => {
                if (confirmed) {
                    speedLevel++;
                    tg?.showAlert(`✅ Speed Level ${speedLevel} activated!`);
                    
                    if (isMining) {
                        startMiningSession();
                    }
                    updateUI();
                    saveGame();
                }
            }
        );
    }
    
    if (type === 'efficiency') {
        if (efficiencyLevel >= 5) {
            tg?.showAlert('Maximum efficiency level reached!');
            return;
        }
        
        const cost = 79.99;
        const nextMultiplier = Math.pow(2, efficiencyLevel + 1);
        
        tg?.showConfirm(
            `💎 Efficiency Upgrade\n\n` +
            `Cost: $${cost} USDT\n` +
            `Current Multiplier: ${Math.pow(2, efficiencyLevel)}x\n` +
            `New Multiplier: ${nextMultiplier}x\n\n` +
            `Send $${cost} USDT to:\n0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c`,
            (confirmed) => {
                if (confirmed) {
                    efficiencyLevel++;
                    tg?.showAlert(`✅ Efficiency Level ${efficiencyLevel} activated!`);
                    updateUI();
                    saveGame();
                }
            }
        );
    }
}

// Update upgrade buttons
function updateUpgradeButtons() {
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
        if (speedLevel >= 10) {
            speedBtn.innerHTML = '✓ MAX LEVEL';
            speedBtn.disabled = true;
        } else {
            speedBtn.innerHTML = `Purchase Speed Upgrade - $29.99`;
            speedBtn.disabled = false;
        }
    }
    
    const effBtn = document.getElementById('efficiency-btn');
    if (effBtn) {
        if (efficiencyLevel >= 5) {
            effBtn.innerHTML = '✓ MAX LEVEL';
            effBtn.disabled = true;
        } else {
            effBtn.innerHTML = `Purchase Efficiency Upgrade - $79.99`;
            effBtn.disabled = false;
        }
    }
}

// Withdraw function
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    if (!amount || amount < 0.001) {
        tg?.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > balance) {
        tg?.showAlert(`Insufficient balance. Available: ${formatBTC(balance)} BTC`);
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        tg?.showAlert('Please enter a valid Bitcoin wallet address');
        return;
    }
    
    const fee = 0.0001;
    const netAmount = amount - fee;
    
    tg?.showConfirm(
        `💰 Withdrawal Request\n\n` +
        `Amount: ${amount.toFixed(8)} BTC\n` +
        `Fee: ${fee.toFixed(8)} BTC\n` +
        `You receive: ${netAmount.toFixed(8)} BTC\n\n` +
        `Confirm withdrawal?`,
        (confirmed) => {
            if (confirmed) {
                balance = parseFloat((balance - amount).toFixed(15));
                updateUI();
                saveGame();
                tg?.showAlert(`✅ Withdrawal request submitted!\n${netAmount.toFixed(8)} BTC will be sent to your wallet.`);
                
                // Clear form
                if (amountInput) amountInput.value = '';
                if (walletInput) walletInput.value = '';
            }
        }
    );
}

// Copy address
function copyAddress() {
    const address = "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c";
    navigator.clipboard.writeText(address).then(() => {
        tg?.showAlert('✅ Address copied!');
    });
}

// Set max withdraw
function setMaxWithdraw() {
    const input = document.getElementById('withdraw-amount');
    if (input) {
        input.value = balance.toFixed(8);
    }
}

// Copy referral link (simple version)
function copyReferralLink() {
    const link = `https://t.me/Btcdkminingbot?start=ref_${Date.now()}`;
    navigator.clipboard.writeText(link).then(() => {
        tg?.showAlert('✅ Referral link copied!');
    });
}

// Share referral
function shareReferral() {
    const link = `https://t.me/Btcdkminingbot?start=ref_${Date.now()}`;
    const text = encodeURIComponent('Join me on BTC DK Mining! ');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game loaded');
    loadGame();
    
    // Set up withdraw input listener
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', function() {
            const receiveEl = document.getElementById('receive-amount');
            if (receiveEl) {
                const amount = parseFloat(this.value || '0');
                const receive = amount - 0.0001;
                receiveEl.textContent = receive > 0 ? receive.toFixed(8) + ' BTC' : '0.00000000 BTC';
            }
        });
    }
    
    // Save every 30 seconds
    setInterval(saveGame, 30000);
});
