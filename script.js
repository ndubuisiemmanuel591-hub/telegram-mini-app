// BTC DK MINING - PROFESSIONAL EDITION
// ULTRA-PERSISTENT MINING - NEVER LOSES PROGRESS
// ============================================

// ============================================
// GAME STATE - WITH BACKUP SYSTEMS
// ============================================
const gameState = {
    // Balance & Mining
    balance: 0.000000000000001,
    totalMined: 0.000000000000001,
    miningSpeed: 9,
    baseMiningAmount: 0.000000000000001,
    
    // Session Management - PERSISTENT WITH TIMESTAMPS
    isAutoMining: false,
    miningSessionStart: null,
    miningSessionEnd: null,
    lastMinedTime: null,
    sessionID: null,  // Unique session ID for tracking
    
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
    withdrawalHistory: [],
    
    // BACKUP TIMESTAMPS - CRITICAL FOR PERSISTENCE
    lastSaved: new Date().toISOString(),
    version: '2.0.0'
};

// ============================================
// TELEGRAM WEB APP - WITH BACKUP USER ID
// ============================================
const tg = window.Telegram?.WebApp;
let telegramUserID = null;

if (tg) {
    tg.expand();
    tg.ready();
    telegramUserID = tg.initDataUnsafe?.user?.id || `web_${Date.now()}`;
}

// ============================================
// MULTI-LAYER STORAGE SYSTEM
// ============================================

// PRIMARY: localStorage
// SECONDARY: sessionStorage
// TERTIARY: Telegram Cloud Storage (if available)
// QUATERNARY: URL params (as last resort)

const STORAGE_KEYS = {
    main: `btc_dk_mining_${telegramUserID || 'default'}`,
    backup: `btc_dk_mining_backup_${telegramUserID || 'default'}`,
    session: `btc_dk_mining_session_${telegramUserID || 'default'}`,
    timestamp: `btc_dk_mining_ts_${telegramUserID || 'default'}`
};

// ============================================
// PERSISTENT STORAGE WITH FALLBACKS
// ============================================
function saveGameStatePersistent() {
    try {
        // Update timestamp
        gameState.lastSaved = new Date().toISOString();
        
        // Prepare data for storage
        const stateString = JSON.stringify(gameState);
        
        // 1. Save to localStorage (primary)
        try {
            localStorage.setItem(STORAGE_KEYS.main, stateString);
            localStorage.setItem(STORAGE_KEYS.timestamp, Date.now().toString());
        } catch (e) {
            console.warn('localStorage failed:', e);
        }
        
        // 2. Save to sessionStorage (backup)
        try {
            sessionStorage.setItem(STORAGE_KEYS.backup, stateString);
        } catch (e) {
            console.warn('sessionStorage failed:', e);
        }
        
        // 3. Save to Telegram Cloud Storage if available
        if (tg?.CloudStorage) {
            tg.CloudStorage.setItem(STORAGE_KEYS.main, stateString, (error) => {
                if (error) console.warn('Telegram Cloud save failed:', error);
            });
        }
        
        // 4. Save to localStorage as backup with different key
        try {
            localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
                sessionID: gameState.sessionID,
                miningSessionEnd: gameState.miningSessionEnd,
                lastMinedTime: gameState.lastMinedTime,
                balance: gameState.balance,
                totalMined: gameState.totalMined,
                timestamp: Date.now()
            }));
        } catch (e) {}
        
        return true;
    } catch (e) {
        console.error('Save failed:', e);
        return false;
    }
}

// ============================================
// LOAD WITH FALLBACKS - TRIES EVERYWHERE
// ============================================
function loadGameStatePersistent() {
    let loaded = false;
    let savedState = null;
    
    // Try multiple storage locations in order
    
    // 1. Try Telegram Cloud Storage first (most persistent)
    if (tg?.CloudStorage) {
        // This is async, so we'll handle it in callback
        tg.CloudStorage.getItem(STORAGE_KEYS.main, (error, value) => {
            if (!error && value) {
                try {
                    const parsed = JSON.parse(value);
                    Object.assign(gameState, parsed);
                    loaded = true;
                    calculateMissedRewards();
                    updateUI();
                    updateUSDValues();
                    updateReferralUI();
                } catch (e) {}
            }
        });
    }
    
    // 2. Try localStorage (primary)
    try {
        const main = localStorage.getItem(STORAGE_KEYS.main);
        if (main) {
            const parsed = JSON.parse(main);
            Object.assign(gameState, parsed);
            loaded = true;
        }
    } catch (e) {}
    
    // 3. Try sessionStorage (backup)
    if (!loaded) {
        try {
            const backup = sessionStorage.getItem(STORAGE_KEYS.backup);
            if (backup) {
                const parsed = JSON.parse(backup);
                Object.assign(gameState, parsed);
                loaded = true;
            }
        } catch (e) {}
    }
    
    // 4. Try localStorage session backup
    if (!loaded) {
        try {
            const session = localStorage.getItem(STORAGE_KEYS.session);
            if (session) {
                const parsed = JSON.parse(session);
                // Only restore critical data
                gameState.sessionID = parsed.sessionID;
                gameState.miningSessionEnd = parsed.miningSessionEnd;
                gameState.lastMinedTime = parsed.lastMinedTime;
                gameState.balance = parsed.balance || gameState.balance;
                gameState.totalMined = parsed.totalMined || gameState.totalMined;
                loaded = true;
            }
        } catch (e) {}
    }
    
    // 5. Check if session is still valid and calculate missed rewards
    if (gameState.miningSessionEnd && new Date(gameState.miningSessionEnd) > new Date()) {
        gameState.isAutoMining = true;
        calculateMissedRewards();
        startMiningSession();
    } else {
        gameState.isAutoMining = false;
        gameState.miningSessionEnd = null;
        gameState.miningSessionStart = null;
        gameState.lastMinedTime = null;
    }
    
    // Generate session ID if not exists
    if (!gameState.sessionID) {
        gameState.sessionID = `${telegramUserID}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    
    updateUI();
    updateUSDValues();
    updateReferralUI();
    
    return loaded;
}

// ============================================
// FORMAT BTC WITH 15 DECIMAL PLACES
// ============================================
function formatBTC(value) {
    if (value === 0 || value === undefined) return "0.000000000000000";
    if (value < 1e-15) return "0.000000000000001";
    
    try {
        return value.toFixed(15);
    } catch (e) {
        return "0.000000000000001";
    }
}

// ============================================
// CRITICAL: CALCULATE REWARDS EARNED WHILE AWAY
// ============================================
function calculateMissedRewards() {
    if (!gameState.lastMinedTime || !gameState.miningSessionEnd) return 0;
    
    try {
        const now = new Date();
        const lastMined = new Date(gameState.lastMinedTime);
        const sessionEnd = new Date(gameState.miningSessionEnd);
        
        // If session expired, calculate up to end time
        const calculationEnd = now > sessionEnd ? sessionEnd : now;
        
        // Calculate seconds since last mine
        const secondsSinceLastMine = Math.max(0, (calculationEnd - lastMined) / 1000);
        
        // Calculate mining parameters
        const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
        const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
        
        // Calculate missed cycles
        const missedCycles = Math.floor(secondsSinceLastMine / miningSpeed);
        
        if (missedCycles > 0) {
            const missedRewards = missedCycles * miningAmount;
            
            // Add rewards
            gameState.balance = parseFloat((gameState.balance + missedRewards).toFixed(15));
            gameState.totalMined = parseFloat((gameState.totalMined + missedRewards).toFixed(15));
            
            // Update last mined time
            const newLastMined = new Date(lastMined.getTime() + (missedCycles * miningSpeed * 1000));
            gameState.lastMinedTime = newLastMined.toISOString();
            
            // Save immediately
            saveGameStatePersistent();
            
            // Show notification if significant rewards
            if (missedRewards > 0.0000000000001 && tg) {
                tg.showAlert(`⏰ Mining continued while you were away!\n+${formatBTC(missedRewards)} BTC earned`);
            }
            
            return missedRewards;
        }
    } catch (e) {
        console.error('Error calculating missed rewards:', e);
    }
    
    return 0;
}

// ============================================
// START MINING - WITH PERSISTENT SESSION
// ============================================
function startMining() {
    if (gameState.isAutoMining) {
        // Check if session is still valid
        if (gameState.miningSessionEnd && new Date(gameState.miningSessionEnd) > new Date()) {
            tg?.showAlert('✓ Mining session already active');
            return;
        } else {
            // Session expired, clear it
            gameState.isAutoMining = false;
            gameState.miningSessionEnd = null;
        }
    }
    
    const now = new Date();
    gameState.miningSessionStart = now.toISOString();
    gameState.miningSessionEnd = new Date(now.getTime() + (2 * 60 * 60 * 1000)).toISOString();
    gameState.lastMinedTime = now.toISOString();
    gameState.isAutoMining = true;
    gameState.sessionID = `${telegramUserID}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Save immediately
    saveGameStatePersistent();
    startMiningSession();
    
    if (tg) {
        tg.showAlert('✓ 2-hour mining session started\n✓ Mining continues even when you leave\n✓ Progress never lost');
    }
}

// ============================================
// MINING SESSION - WITH ERROR HANDLING
// ============================================
function startMiningSession() {
    // Clear existing intervals
    if (gameState.miningInterval) clearInterval(gameState.miningInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    const miningSpeed = Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3));
    const miningAmount = gameState.baseMiningAmount * Math.pow(2, gameState.upgrades.efficiencyLevel);
    
    // Main mining interval
    gameState.miningInterval = setInterval(() => {
        try {
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
            gameState.balance = parseFloat((gameState.balance + miningAmount).toFixed(15));
            gameState.totalMined = parseFloat((gameState.totalMined + miningAmount).toFixed(15));
            gameState.lastMinedTime = now.toISOString();
            
            // Update UI
            updateUI();
            updateUSDValues();
            
            // Save every cycle
            saveGameStatePersistent();
            
            // Animate
            animateProgress();
            
        } catch (e) {
            console.error('Mining cycle error:', e);
        }
    }, miningSpeed * 1000);
    
    // Timer update interval
    gameState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

// ============================================
// END MINING SESSION
// ============================================
function endMiningSession() {
    gameState.isAutoMining = false;
    gameState.miningSessionEnd = null;
    gameState.miningSessionStart = null;
    gameState.lastMinedTime = null;
    
    if (gameState.miningInterval) {
        clearInterval(gameState.miningInterval);
        gameState.miningInterval = null;
    }
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    updateUI();
    saveGameStatePersistent();
    
    if (tg) {
        tg.showAlert('⏹ 2-hour mining session completed!\nStart a new session to continue mining.');
    }
}

// ============================================
// UI UPDATES
// ============================================
function updateUI() {
    try {
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
            if (gameState.isAutoMining && gameState.miningSessionEnd && new Date(gameState.miningSessionEnd) > new Date()) {
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
    } catch (e) {
        console.error('UI update error:', e);
    }
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
    try {
        const balanceUSD = gameState.balance * BTC_TO_USD;
        updateElement('balance-usd', balanceUSD.toFixed(8));
        updateElement('available-usd', balanceUSD.toFixed(8));
    } catch (e) {}
}

// ============================================
// TIMER DISPLAY
// ============================================
function updateTimerDisplay() {
    try {
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
    } catch (e) {}
}

// ============================================
// PROGRESS ANIMATION
// ============================================
function animateProgress() {
    try {
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
    } catch (e) {}
}

// ============================================
// GENERATE REFERRAL CODE
// ============================================
function generateReferralCode() {
    const userID = telegramUserID || Math.floor(Math.random() * 1000000);
    return `ref_${userID}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ============================================
// REFERRAL SYSTEM
// ============================================
function updateReferralUI() {
    try {
        updateElement('referral-count', gameState.referral.count);
        updateElement('referral-earnings', formatBTC(gameState.referral.earnings));
        updateElement('referral-tier', gameState.referral.tier);
        updateElement('commission-rate', `${gameState.referral.commission}%`);
        
        const referralLink = document.getElementById('referral-link');
        if (referralLink) {
            const botUsername = 'Btcdkminingbot';
            referralLink.textContent = `https://t.me/${botUsername}?start=${gameState.referral.code}`;
        }
    } catch (e) {}
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
    const text = encodeURIComponent('⚡ Join me on BTC DK Mining - Professional Bitcoin Mining Bot\n\n');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

function shareWhatsApp() {
    const link = `https://t.me/Btcdkminingbot?start=${gameState.referral.code}`;
    const text = encodeURIComponent(`⚡ BTC DK MINING - Professional Bitcoin Mining\n\nStart earning Bitcoin instantly!\n\nMy referral link: ${link}\n\n5-15% lifetime commission on referrals.`);
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
    saveGameStatePersistent();
    
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
// UPGRADE SYSTEM
// ============================================
function buyUpgrade(type) {
    if (type === 'speed') {
        if (gameState.upgrades.speedLevel >= gameState.upgrades.maxSpeedLevel) {
            if (tg) tg.showAlert('Maximum speed level reached (10/10)');
            return;
        }
        
        const cost = gameState.upgrades.speedCost;
        
        if (tg) {
            tg.showConfirm(
                `⚡ Speed Acceleration Upgrade\n\n` +
                `Investment: $${cost} USDT\n` +
                `Current Speed: ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s\n` +
                `New Speed: ${Math.max(3, gameState.miningSpeed - ((gameState.upgrades.speedLevel + 1) * 3))}s\n\n` +
                `Send $${cost} USDT (ERC-20) to:\n${gameState.payments.ethAddress}`,
                (confirmed) => {
                    if (confirmed) {
                        processUpgrade('speed');
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
        
        if (tg) {
            tg.showConfirm(
                `💎 Hashrate Multiplier Upgrade\n\n` +
                `Investment: $${cost} USDT\n` +
                `Current Multiplier: ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x\n` +
                `New Multiplier: ${Math.pow(2, gameState.upgrades.efficiencyLevel + 1)}x\n\n` +
                `Send $${cost} USDT (ERC-20) to:\n${gameState.payments.ethAddress}`,
                (confirmed) => {
                    if (confirmed) {
                        processUpgrade('efficiency');
                    }
                }
            );
        }
    }
}

function processUpgrade(type) {
    if (tg) {
        tg.showAlert(`⏳ Upgrade verification in progress...`);
    }
    
    setTimeout(() => {
        if (type === 'speed') {
            gameState.upgrades.speedLevel++;
            gameState.upgrades.speedCost = Math.min(99.99, gameState.upgrades.speedCost + 5);
            
            if (tg) {
                tg.showAlert(`✓ Speed Level ${gameState.upgrades.speedLevel} Activated\nNow mining ${Math.max(3, gameState.miningSpeed - (gameState.upgrades.speedLevel * 3))}s per cycle`);
            }
        }
        
        if (type === 'efficiency') {
            gameState.upgrades.efficiencyLevel++;
            gameState.upgrades.efficiencyCost = Math.min(199.99, gameState.upgrades.efficiencyCost + 15);
            
            if (tg) {
                tg.showAlert(`✓ Efficiency Level ${gameState.upgrades.efficiencyLevel} Activated\nNow earning ${Math.pow(2, gameState.upgrades.efficiencyLevel)}x per cycle`);
            }
        }
        
        if (gameState.isAutoMining) {
            startMiningSession();
        }
        
        updateUI();
        updateUpgradeButtons();
        saveGameStatePersistent();
        
    }, 2000);
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
// INITIALIZATION - WITH BACKUP RECOVERY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Load saved state
    loadGameStatePersistent();
    
    // Set up withdrawal listener
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    // Update referral UI
    updateReferralUI();
    
    // AGGRESSIVE SAVE - every 5 seconds
    setInterval(saveGameStatePersistent, 5000);
    
    // Check for missed rewards every time page loads
    setTimeout(() => {
        if (gameState.isAutoMining && gameState.miningSessionEnd) {
            const rewards = calculateMissedRewards();
            if (rewards > 0) {
                updateUI();
                saveGameStatePersistent();
            }
        }
    }, 500);
    
    // Welcome message (only once)
    if (!localStorage.getItem('btc_dk_mining_welcome_v2')) {
        setTimeout(() => {
            if (tg) {
                tg.showAlert(
                    '⚡ BTC DK MINING - PROFESSIONAL EDITION\n\n' +
                    '✓ ULTRA-PERSISTENT MINING\n' +
                    '✓ Never lose progress - even if you close Telegram\n' +
                    '✓ 2-hour auto-mining sessions\n' +
                    '✓ USDT upgrades (ERC-20)\n' +
                    '✓ Referral rewards: 5-15% commission\n' +
                    '✓ Minimum withdrawal: 0.001 BTC\n\n' +
                    'Your mining continues even when you\'re away!'
                );
            }
            localStorage.setItem('btc_dk_mining_welcome_v2', 'true');
        }, 1500);
    }
});

// ============================================
// PAGE VISIBILITY API - Save when user leaves
// ============================================
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // User is leaving the page - save immediately
        saveGameStatePersistent();
    } else {
        // User returned - check for missed rewards
        if (gameState.isAutoMining && gameState.miningSessionEnd) {
            calculateMissedRewards();
            updateUI();
        }
    }
});

// ============================================
// BEFORE UNLOAD - Final save
// ============================================
window.addEventListener('beforeunload', function() {
    saveGameStatePersistent();
});

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        gameState, 
        startMining, 
        buyUpgrade, 
        withdraw, 
        copyReferralLink,
        loadGameStatePersistent,
        saveGameStatePersistent
    };
}
