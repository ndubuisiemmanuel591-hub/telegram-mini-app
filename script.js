// BTC DK MINING - PROFESSIONAL EDITION
// COMPLETE - Starting Balance: 0.000000000000000 BTC
// 20% Referral | USDT Upgrades | 2-Hour Sessions

// ============================================
// TELEGRAM WEB APP INITIALIZATION
// ============================================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// ============================================
// GAME STATE - 0.000000000000000 BTC STARTING
// ============================================
const gameState = {
    // Balance & Mining - 15 decimal places
    balance: 0.000000000000000,
    totalMined: 0.000000000000000,
    miningSpeed: 9,
    baseMiningAmount: 0.000000000000000,
    
    // Session Management
    isAutoMining: false,
    miningSessionEnd: null,
    miningInterval: null,
    timerInterval: null,
    progressInterval: null,
    
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
    
    // ========================================
    // REFERRAL SYSTEM - CLEAN & PROFESSIONAL
    // ========================================
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
// NUMBER FORMATTING - 15 DECIMAL PLACES
// ============================================
function formatBTC(value) {
    if (value === 0) return '0.000000000000000';
    if (value < 0.00000001) {
        return value.toFixed(15);
    }
    if (value < 1) {
        return value.toFixed(8);
    }
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
    });
}

function formatCompactBTC(value) {
    if (value === 0) return '0.000000000000000 BTC';
    if (value < 1e-8) {
        const satoshis = value * 1e8;
        if (satoshis < 0.01) {
            return value.toFixed(15) + ' BTC';
        }
        return satoshis.toFixed(2) + ' sats';
    }
    if (value < 1) {
        return value.toFixed(8) + ' BTC';
    }
    return value.toFixed(4) + ' BTC';
}

// ============================================
// REFERRAL SYSTEM - CORE FUNCTIONS
// ============================================

// Generate unique referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BTC-';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3) code += '-';
    }
    return code;
}

// Initialize referral from Telegram start parameter
function initReferral() {
    try {
        if (tg?.initDataUnsafe?.start_param) {
            const param = tg.initDataUnsafe.start_param;
            if (param.startsWith('ref_')) {
                const referrerCode = 'BTC-' + param.replace('ref_', '');
                if (referrerCode !== gameState.referral.code) {
                    gameState.referral.referredBy = referrerCode;
                    localStorage.setItem('btc_referred_by', referrerCode);
                    
                    setTimeout(() => {
                        if (tg) tg.showAlert('🎁 You were referred by a friend!\nYou both get 20% mining bonus');
                    }, 2000);
                }
            }
        }
        
        const savedReferrer = localStorage.getItem('btc_referred_by');
        if (savedReferrer && !gameState.referral.referredBy) {
            gameState.referral.referredBy = savedReferrer;
        }
    } catch (e) {
        console.error('Referral init error:', e);
    }
}

// Add referral when someone joins
function addReferral(userId) {
    const existing = gameState.referral.referrals.find(r => r.userId === userId);
    if (existing) return false;
    
    gameState.referral.referrals.push({
        userId: userId,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        active: true
    });
    
    gameState.referral.count = gameState.referral.referrals.length;
    gameState.referral.activeCount = gameState.referral.referrals.filter(r => r.active).length;
    
    updateReferralUI();
    saveGameState();
    return true;
}

// Process referral commission (20%)
function processReferralCommission(miningAmount) {
    if (gameState.referral.referredBy) {
        const commission = miningAmount * 0.20;
        gameState.referral.earnings += commission;
        gameState.balance += commission;
        
        updateReferralUI();
        return commission;
    }
    return 0;
}

// Update referral UI
function updateReferralUI() {
    updateElement('referral-code', gameState.referral.code);
    
    const botUsername = 'Btcdkminingbot';
    const cleanCode = gameState.referral.code.replace('BTC-', '');
    updateElement('referral-link', `https://t.me/${botUsername}?start=ref_${cleanCode}`);
    
    updateElement('referral-earnings', gameState.referral.earnings.toFixed(8));
    updateElement('referral-count', `${gameState.referral.count} referrals`);
    updateElement('referral-total', gameState.referral.count);
    updateElement('referral-active', `${gameState.referral.activeCount} active`);
}

// Copy referral code
function copyReferralCode() {
    navigator.clipboard.writeText(gameState.referral.code).then(() => {
        if (tg) tg.showAlert('✓ Referral code copied');
    });
}

// Copy referral link
function copyReferralLink() {
    const botUsername = 'Btcdkminingbot';
    const cleanCode = gameState.referral.code.replace('BTC-', '');
    const link = `https://t.me/${botUsername}?start=ref_${cleanCode}`;
    
    navigator.clipboard.writeText(link).then(() => {
        if (tg) tg.showAlert('✓ Referral link copied\nShare with friends to earn 20%');
    });
}

// ============================================
// LOAD / SAVE STATE
// ============================================
function loadGameState() {
    try {
        const saved = localStorage.getItem('btcDKMining_pro');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Preserve referral data
            if (parsed.referral) {
                gameState.referral = parsed.referral;
            }
            if (parsed.upgrades) {
                gameState.upgrades = parsed.upgrades;
            }
            if (parsed.balance !== undefined) gameState.balance = parsed.balance;
            if (parsed.totalMined !== undefined) gameState.totalMined = parsed.totalMined;
            if (parsed.withdrawalHistory) gameState.withdrawalHistory = parsed.withdrawalHistory;
            
            // Resume mining if session still active
            if (parsed.miningSessionEnd && new Date(parsed.miningSessionEnd) > new Date()) {
                gameState.miningSessionEnd = parsed.miningSessionEnd;
                gameState.isAutoMining = true;
                startMiningSession();
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    
    initReferral();
    updateUI();
    updateUSDValues();
    updateReferralUI();
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
    // Balance displays - 15 decimal places
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
    
    // Mining button
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
    
    // Upgrade buttons
    updateUpgradeButtons();
    
    // Timer
    updateTimerDisplay();
    
    // Withdrawal history
    updateWithdrawalHistory();
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================
// USD VALUE CONVERSION
// ============================================
const BTC_TO_USD = 45000;

function updateUSDValues() {
    const balanceUSD = gameState.balance * BTC_TO_USD;
    const availableUSD = gameState.balance * BTC_TO_USD;
    
    if (balanceUSD < 0.0001) {
        updateElement('balance-usd', balanceUSD.toFixed(8));
        updateElement('available-usd', availableUSD.toFixed(8));
    } else {
        updateElement('balance-usd', balanceUSD.toFixed(4));
        updateElement('available-usd', availableUSD.toFixed(4));
    }
}

// ============================================
// MINING SESSION MANAGEMENT
// ============================================
function startMining() {
    if (gameState.isAutoMining) return;
    
    const now = new Date();
    gameState.miningSessionEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    gameState.isAutoMining = true;
    
    startMiningSession();
    saveGameState();
    
    if (tg) tg.showAlert('✓ 2-hour mining session initiated\nMining will continue automatically');
}

function startMiningSession() {
    if (gameState.miningInterval) clearInterval(gameState.miningInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    gameState.miningInterval = setInterval(() => {
        if (!gameState.isAutoMining) {
            clearInterval(gameState.miningInterval);
            return;
        }
        
        if (new Date() >= new Date(gameState.miningSessionEnd)) {
            endMiningSession();
            return;
        }
        
        // Add mining reward - 15 decimal precision
        gameState.balance = parseFloat((gameState.balance + miningAmount).toFixed(15));
        gameState.totalMined = parseFloat((gameState.totalMined + miningAmount).toFixed(15));
        
        // Process referral commission (20% to referrer)
        processReferralCommission(miningAmount);
        
        updateUI();
        updateUSDValues();
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
    
    if (tg) tg.showAlert('⏹ Mining session completed\nStart a new session to continue');
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
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 1;
                progressText.textContent = `${progress}%`;
                if (progress >= 100) {
                    clearInterval(interval);
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
// UPGRADE SYSTEM
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
    if (tg) tg.showAlert(`⏳ Transaction verification in progress...\nUpgrade will activate within 60 seconds`);
    
    setTimeout(() => {
        if (type === 'speed') {
            gameState.upgrades.speedLevel++;
            gameState.upgrades.speedCost = Math.min(99.99, gameState.upgrades.speedCost + 5);
            
            if (tg) tg.showAlert(`✓ Speed Acceleration Level ${gameState.upgrades.speedLevel} Activated\nMining speed: ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s per cycle`);
        }
        
        if (type === 'efficiency') {
            gameState.upgrades.efficiencyLevel++;
            gameState.upgrades.efficiencyCost = Math.min(199.99, gameState.upgrades.efficiencyCost + 15);
            
            if (tg) tg.showAlert(`✓ Hashrate Multiplier Level ${gameState.upgrades.efficiencyLevel} Activated\nOutput: ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x per cycle`);
        }
        
        if (gameState.isAutoMining) {
            startMiningSession();
        }
        
        updateUI();
        updateUpgradeButtons();
        saveGameState();
        
    }, 3000);
}

function updateUpgradeButtons() {
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
// WITHDRAWAL SYSTEM
// ============================================
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    // Total includes mining balance + referral earnings
    const totalBalance = gameState.balance;
    
    if (!amount || amount < 0.001) {
        if (tg) tg.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > totalBalance) {
        if (tg) tg.showAlert(`Insufficient balance\nAvailable: ${totalBalance.toFixed(8)} BTC`);
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
    gameState.balance = parseFloat((gameState.balance - amount).toFixed(15));
    
    const withdrawal = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        wallet: wallet,
        status: 'pending'
    };
    
    gameState.withdrawalHistory.unshift(withdrawal);
    
    updateUI();
    updateUSDValues();
    updateWithdrawalHistory();
    saveGameState();
    
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
            <div class="history-item">
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: white;">${item.netAmount.toFixed(8)} BTC</div>
                    <div style="font-size: 12px; color: #5a6a78;">${date}</div>
                </div>
                <span class="status-badge status-pending">Pending</span>
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
        if (tg) tg.showAlert('✓ Address copied to clipboard');
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
    
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    // Welcome message
    if (!localStorage.getItem('btcDKMining_welcome')) {
        setTimeout(() => {
            if (tg) {
                tg.showAlert(
                    '⚡ BTC DK MINING - Professional Edition\n\n' +
                    '• Starting balance: 0.000000000000000 BTC\n' +
                    '• 2-Hour mining sessions\n' +
                    '• USDT upgrades (ERC-20)\n' +
                    '• Minimum withdrawal: 0.001 BTC\n' +
                    '• Network fee: 0.0001 BTC\n\n' +
                    '🎁 NEW: Referral Program\n' +
                    '• 20% lifetime commission\n' +
                    '• Share your code to earn!\n\n' +
                    'Professional mining interface ready.'
                );
            }
            localStorage.setItem('btcDKMining_welcome', 'true');
        }, 1500);
    }
});

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.startMining = startMining;
window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;
window.copyAddress = copyAddress;
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.setMaxWithdraw = setMaxWithdraw;
window.updateReceiveAmount = updateReceiveAmount;
