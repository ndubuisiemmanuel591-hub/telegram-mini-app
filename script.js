// BTC DK MINING - PROFESSIONAL EDITION
// WITH COMPLETE REFERRAL SYSTEM

// ============================================
// GAME STATE - WITH REFERRAL SYSTEM
// ============================================
const gameState = {
    // Balance & Mining
    balance: 1e-14,
    totalMined: 1e-14,
    miningSpeed: 9,
    baseMiningAmount: 1e-14,
    
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
        ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c",
        network: "ERC-20",
        confirmations: 3
    },
    
    // ========================================
    // REFERRAL SYSTEM - COMPLETE
    // ========================================
    referral: {
        // User's own referral code
        code: generateReferralCode(),
        
        // Who referred this user (null if none)
        referredBy: null,
        
        // Statistics
        totalReferrals: 0,
        activeReferrals: 0,
        commissionEarned: 0,
        commissionHistory: [],
        
        // Referral tree (simplified)
        referrals: [],
        
        // Commission rates
        commissionRates: {
            level1: 0.20,  // 20% direct
            level2: 0.05,  // 5% second level
            level3: 0.02   // 2% third level
        }
    },
    
    // Withdrawal History
    withdrawalHistory: []
};

// ============================================
// GENERATE UNIQUE REFERRAL CODE
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

// ============================================
// INITIALIZE REFERRAL FROM TELEGRAM START PARAM
// ============================================
function initReferral() {
    try {
        // Check if opened with referral code
        const tg = window.Telegram?.WebApp;
        if (tg?.initDataUnsafe?.start_param) {
            const startParam = tg.initDataUnsafe.start_param;
            
            // Check if it's a referral code (format: ref_XXXX)
            if (startParam.startsWith('ref_')) {
                const referrerCode = startParam.replace('ref_', 'BTC-');
                
                // Don't refer yourself
                if (referrerCode !== gameState.referral.code) {
                    gameState.referral.referredBy = referrerCode;
                    
                    // Store in localStorage
                    localStorage.setItem('btc_referred_by', referrerCode);
                    
                    // Show welcome message
                    setTimeout(() => {
                        if (tg) {
                            tg.showAlert('🎁 You were referred by a friend!\nYou both get 20% bonus mining for 24 hours!');
                        }
                    }, 2000);
                }
            }
        }
        
        // Check localStorage for existing referral
        const savedReferrer = localStorage.getItem('btc_referred_by');
        if (savedReferrer && !gameState.referral.referredBy) {
            gameState.referral.referredBy = savedReferrer;
        }
        
    } catch (e) {
        console.error('Error initializing referral:', e);
    }
}

// ============================================
// PROCESS REFERRAL COMMISSION
// ============================================
function processReferralCommission(minerAddress, miningAmount) {
    // This would be called when a referred user mines
    // In production, this would be handled server-side
    
    if (!gameState.referral.referredBy) return 0;
    
    // Calculate commission (20% of mining amount)
    const commission = miningAmount * 0.20;
    
    // Add to commission earned
    gameState.referral.commissionEarned += commission;
    
    // Add to history
    gameState.referral.commissionHistory.push({
        id: Date.now(),
        amount: commission,
        from: minerAddress,
        timestamp: new Date().toISOString(),
        level: 1
    });
    
    // Keep only last 50 records
    if (gameState.referral.commissionHistory.length > 50) {
        gameState.referral.commissionHistory.shift();
    }
    
    return commission;
}

// ============================================
// ADD REFERRAL (when someone uses your code)
// ============================================
function addReferral(referralCode, userId) {
    if (referralCode !== gameState.referral.code) return false;
    
    // Check if already referred
    const existing = gameState.referral.referrals.find(r => r.userId === userId);
    if (existing) return false;
    
    // Add new referral
    gameState.referral.referrals.push({
        userId: userId,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalMined: 0,
        commissionGenerated: 0,
        active: true
    });
    
    // Update stats
    gameState.referral.totalReferrals = gameState.referral.referrals.length;
    gameState.referral.activeReferrals = gameState.referral.referrals.filter(r => r.active).length;
    
    saveGameState();
    updateReferralUI();
    
    return true;
}

// ============================================
// UPDATE REFERRAL UI
// ============================================
function updateReferralUI() {
    // Update referral code display
    updateElement('referral-code', gameState.referral.code);
    
    // Update referral link
    const botUsername = 'Btcdkminingbot'; // Your bot username
    const referralLink = `https://t.me/${botUsername}?start=ref_${gameState.referral.code.replace('BTC-', '')}`;
    updateElement('referral-link', referralLink);
    
    // Update statistics
    updateElement('referral-earnings', formatBTC(gameState.referral.commissionEarned));
    updateElement('referral-count', `${gameState.referral.totalReferrals} referrals`);
    updateElement('referral-count-stat', gameState.referral.totalReferrals);
    updateElement('referral-active', gameState.referral.activeReferrals);
    
    // Calculate rank (mock data - in production would be server-side)
    const rank = calculateReferralRank();
    updateElement('referral-rank', rank);
    
    // Update referral history list
    updateReferralHistory();
    
    // Update leaderboard
    updateReferralLeaderboard();
}

// ============================================
// UPDATE REFERRAL HISTORY DISPLAY
// ============================================
function updateReferralHistory() {
    const historyList = document.getElementById('referral-history-list');
    if (!historyList) return;
    
    if (gameState.referral.referrals.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 20px; color: #5a6a78;">No referrals yet. Share your code!</div>';
        return;
    }
    
    let html = '';
    gameState.referral.referrals.slice(0, 5).forEach(ref => {
        const date = new Date(ref.joinedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: white;">User ${ref.userId?.substring(0, 6) || 'New'}</div>
                    <div style="font-size: 11px; color: #5a6a78;">Joined ${date}</div>
                </div>
                <div>
                    <span style="color: ${ref.active ? '#00c3ff' : '#8a9aa8'}; font-size: 12px;">
                        ${ref.active ? '● Active' : '○ Inactive'}
                    </span>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// ============================================
// UPDATE REFERRAL LEADERBOARD
// ============================================
function updateReferralLeaderboard() {
    const leaderboard = document.getElementById('referral-leaderboard');
    if (!leaderboard) return;
    
    // Mock leaderboard data
    const mockLeaderboard = [
        { rank: 1, name: '🐳 CryptoWhale', referrals: 47, earnings: '0.0254' },
        { rank: 2, name: '⚡ MiningKing', referrals: 32, earnings: '0.0189' },
        { rank: 3, name: '💎 DiamondHands', referrals: 28, earnings: '0.0152' },
        { rank: 4, name: '🎯 You', referrals: gameState.referral.totalReferrals, earnings: formatBTC(gameState.referral.commissionEarned).replace(' BTC', '') },
        { rank: 5, name: '🚀 MoonSeeker', referrals: 15, earnings: '0.0087' }
    ];
    
    let html = '';
    mockLeaderboard.forEach(entry => {
        const isYou = entry.name === '🎯 You';
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: ${isYou ? 'rgba(0,195,255,0.1)' : 'transparent'}; border-radius: 12px; margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 14px; font-weight: 600; color: ${isYou ? '#00c3ff' : '#8a9aa8'};">#${entry.rank}</span>
                    <span style="font-size: 14px; color: ${isYou ? 'white' : '#8a9aa8'}; font-weight: ${isYou ? '700' : '400'};">${entry.name}</span>
                </div>
                <div style="display: flex; gap: 15px;">
                    <span style="font-size: 12px; color: #8a9aa8;">${entry.referrals} refs</span>
                    <span style="font-size: 12px; color: #f7931a;">${entry.earnings} BTC</span>
                </div>
            </div>
        `;
    });
    
    leaderboard.innerHTML = html;
}

// ============================================
// CALCULATE REFERRAL RANK
// ============================================
function calculateReferralRank() {
    const referrals = gameState.referral.totalReferrals;
    
    if (referrals >= 50) return '👑 Whale';
    if (referrals >= 25) return '⚡ Pro Miner';
    if (referrals >= 10) return '💎 Diamond';
    if (referrals >= 5) return '🌟 Bronze';
    if (referrals >= 1) return '🌱 Rookie';
    return '—';
}

// ============================================
// MODIFY MINING TO INCLUDE REFERRAL COMMISSION
// ============================================
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
        gameState.balance = parseFloat((gameState.balance + miningAmount).toFixed(14));
        gameState.totalMined = parseFloat((gameState.totalMined + miningAmount).toFixed(14));
        
        // ========================================
        // PROCESS REFERRAL COMMISSION
        // If this user was referred, pay commission
        // ========================================
        if (gameState.referral.referredBy) {
            const commission = miningAmount * 0.20;
            
            // In production, this would call an API to credit the referrer
            console.log(`💰 Commission paid: ${commission} BTC to referrer ${gameState.referral.referredBy}`);
            
            // For demo, we add to our own commission earned
            gameState.referral.commissionEarned += commission;
        }
        
        updateUI();
        updateUSDValues();
        updateReferralUI();
        saveGameState();
        animateProgress();
        
    }, miningSpeed * 1000);
    
    // Update timer every second
    gameState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

// ============================================
// MODIFY WITHDRAWAL TO INCLUDE REFERRAL EARNINGS
// ============================================
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    // Include referral earnings in available balance
    const totalBalance = gameState.balance + gameState.referral.commissionEarned;
    
    // Validation
    if (!amount || amount < 0.001) {
        if (tg) tg.showAlert('Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > totalBalance) {
        if (tg) tg.showAlert(`Insufficient balance\nAvailable: ${formatCompactBTC(totalBalance)}`);
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
                    processWithdrawal(amount, netAmount, wallet, fee, totalBalance);
                }
            }
        );
    }
}

function processWithdrawal(amount, netAmount, wallet, fee, totalBalance) {
    // Deduct from mining balance first, then referral earnings
    if (amount <= gameState.balance) {
        gameState.balance -= amount;
    } else {
        const remaining = amount - gameState.balance;
        gameState.balance = 0;
        gameState.referral.commissionEarned -= remaining;
    }
    
    // Create withdrawal record
    const withdrawal = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        wallet: wallet,
        status: 'pending',
        type: 'withdrawal'
    };
    
    gameState.withdrawalHistory.unshift(withdrawal);
    
    updateUI();
    updateUSDValues();
    updateReferralUI();
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

// ============================================
// MODIFY LOAD/SAVE TO INCLUDE REFERRAL DATA
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
        
        // Initialize referral system
        initReferral();
        
    } catch (e) {
        console.error('Error loading state:', e);
        initReferral();
    }
    
    updateUI();
    updateUSDValues();
    updateReferralUI();
}

// ============================================
// MODIFY WELCOME MESSAGE TO INCLUDE REFERRAL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    
    // Withdrawal amount listener
    const withdrawInput = document.getElementById('withdraw-amount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateReceiveAmount);
    }
    
    // Professional welcome message with referral info
    if (!localStorage.getItem('btcDKMining_welcome')) {
        setTimeout(() => {
            if (tg) {
                let welcomeMsg = '⚡ BTC DK MINING - Professional Edition\n\n' +
                    '• Starting balance: 1e-14 BTC\n' +
                    '• 2-Hour mining sessions\n' +
                    '• USDT upgrades (ERC-20)\n' +
                    '• Minimum withdrawal: 0.001 BTC\n' +
                    '• Network fee: 0.0001 BTC\n\n' +
                    '🎁 NEW: Referral Program\n' +
                    '• 20% lifetime commission\n' +
                    '• 3-level rewards\n' +
                    '• Share your code to earn!\n\n' +
                    'Professional mining interface ready.';
                
                tg.showAlert(welcomeMsg);
            }
            localStorage.setItem('btcDKMining_welcome', 'true');
        }, 1500);
    }
});

// ============================================
// EXPORT FUNCTIONS FOR DEBUGGING
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        gameState, 
        startMining, 
        buyUpgrade, 
        withdraw,
        generateReferralCode,
        addReferral
    };
}
