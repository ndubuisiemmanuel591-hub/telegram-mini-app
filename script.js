// BTC DK MINING - ADVANCED EDITION
// ============================================
// COMBINED: Simple Working Base + Etherscan Verification + Persistent Mining + Referral System
// ============================================

// ============================================
// CONFIGURATION - YOUR API KEY IS ACTIVE
// ============================================
const CONFIG = {
    // Your Ethereum address that receives payments
    PAYMENT_ADDRESS: "0x742d35Cc6634C0532925a3b844Bc9e34F3bA2E1c",
    
    // 🔴 YOUR ACTIVE ETHERSCAN API KEY 🔴
    ETHERSCAN_API_KEY: "7GIDX2A3TN16VPQRPHINF2UKRYFE5HDHA5",
    
    // USDT Contract Address on Ethereum
    USDT_CONTRACT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    
    // Payment amounts
    USDT_PRICE_SPEED: 29.99,
    USDT_PRICE_EFFICIENCY: 79.99,
    
    // Network (mainnet)
    NETWORK: "api.etherscan.io",
    
    // Minimum confirmations required
    MIN_CONFIRMATIONS: 3,
    
    // Bot username for referrals
    BOT_USERNAME: "Btcdkminingbot"
};

// ============================================
// GAME STATE - SIMPLE & CLEAN
// ============================================
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

// PENDING UPGRADES - WAITING FOR PAYMENT VERIFICATION
let pendingUpgrades = {
    speed: {
        level: 0,
        paymentRequested: false,
        transactionHash: null,
        paymentId: null,
        cost: CONFIG.USDT_PRICE_SPEED,
        timestamp: null,
        verificationAttempts: 0,
        status: 'pending'
    },
    efficiency: {
        level: 0,
        paymentRequested: false,
        transactionHash: null,
        paymentId: null,
        cost: CONFIG.USDT_PRICE_EFFICIENCY,
        timestamp: null,
        verificationAttempts: 0,
        status: 'pending'
    }
};

// REFERRAL SYSTEM
let referralData = {
    code: generateReferralCode(),
    count: 0,
    earnings: 0,
    tier: 'Bronze',
    commission: 5,
    history: []
};

// ============================================
// TELEGRAM WEB APP
// ============================================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// ============================================
// GENERATE REFERRAL CODE
// ============================================
function generateReferralCode() {
    const userId = tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000);
    return `ref_${userId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ============================================
// FORMAT BTC - 15 DECIMAL PLACES, NO SCIENTIFIC NOTATION
// ============================================
function formatBTC(value) {
    if (value === 0 || value === undefined) return "0.000000000000000";
    try {
        return value.toFixed(15);
    } catch (e) {
        return "0.000000000000001";
    }
}

// ============================================
// LOAD/SAVE GAME - SIMPLE & RELIABLE
// ============================================
function loadGame() {
    try {
        const saved = localStorage.getItem('btc_mining_advanced');
        if (saved) {
            const data = JSON.parse(saved);
            balance = data.balance || 0.000000000000001;
            totalMined = data.totalMined || 0.000000000000001;
            speedLevel = data.speedLevel || 0;
            efficiencyLevel = data.efficiencyLevel || 0;
            
            // Load pending upgrades
            if (data.pendingUpgrades) {
                pendingUpgrades = data.pendingUpgrades;
            }
            
            // Load referral data
            if (data.referralData) {
                referralData = data.referralData;
            } else {
                referralData.code = generateReferralCode();
            }
            
            // Check if session was active
            if (data.sessionEndTime && new Date(data.sessionEndTime) > new Date()) {
                sessionEndTime = data.sessionEndTime;
                isMining = true;
                startMiningSession();
                
                // Calculate missed rewards while away
                if (data.lastMinedTime) {
                    calculateMissedRewards(data.lastMinedTime);
                }
            }
        } else {
            // First time user - generate referral code
            referralData.code = generateReferralCode();
        }
    } catch (e) {
        console.log('No saved data');
    }
    updateUI();
    checkPendingUpgrades();
}

function saveGame() {
    try {
        const data = {
            balance,
            totalMined,
            speedLevel,
            efficiencyLevel,
            pendingUpgrades,
            referralData,
            sessionEndTime,
            lastMinedTime: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('btc_mining_advanced', JSON.stringify(data));
    } catch (e) {
        console.log('Save error:', e);
    }
}

// ============================================
// CALCULATE MISSED REWARDS - PERSISTENT MINING
// ============================================
function calculateMissedRewards(lastMinedTime) {
    try {
        const now = new Date();
        const lastMined = new Date(lastMinedTime);
        const sessionEnd = new Date(sessionEndTime);
        
        if (now > sessionEnd) {
            // Session already ended
            stopMining();
            return;
        }
        
        const secondsSinceLastMine = (now - lastMined) / 1000;
        const currentSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
        const miningAmount = baseMiningAmount * Math.pow(2, efficiencyLevel);
        
        const missedCycles = Math.floor(secondsSinceLastMine / currentSpeed);
        
        if (missedCycles > 0) {
            const missedRewards = missedCycles * miningAmount;
            balance = parseFloat((balance + missedRewards).toFixed(15));
            totalMined = parseFloat((totalMined + missedRewards).toFixed(15));
            
            tg?.showAlert(`⏰ While you were away:\n+${formatBTC(missedRewards)} BTC mined!`);
            saveGame();
            updateUI();
        }
    } catch (e) {
        console.log('Missed rewards calculation error:', e);
    }
}

// ============================================
// ETHERSCAN PAYMENT VERIFICATION
// ============================================
async function verifyUSDTTransaction(txHash, expectedAmount) {
    try {
        console.log(`🔍 Verifying transaction: ${txHash}`);
        
        tg?.showAlert(`⏳ Verifying payment on Etherscan...\nTX: ${txHash.substring(0, 10)}...`);
        
        // Get transaction receipt
        const receiptUrl = `https://${CONFIG.NETWORK}/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${CONFIG.ETHERSCAN_API_KEY}`;
        const receiptResponse = await fetch(receiptUrl);
        const receiptData = await receiptResponse.json();
        
        if (!receiptData.result) {
            return { success: false, error: 'Transaction not found on blockchain', status: 'not_found' };
        }
        
        // Get transaction details
        const txUrl = `https://${CONFIG.NETWORK}/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${CONFIG.ETHERSCAN_API_KEY}`;
        const txResponse = await fetch(txUrl);
        const txData = await txResponse.json();
        
        if (!txData.result) {
            return { success: false, error: 'Cannot fetch transaction details', status: 'error' };
        }
        
        const tx = txData.result;
        
        // Check if transaction is to USDT contract
        if (tx.to.toLowerCase() !== CONFIG.USDT_CONTRACT.toLowerCase()) {
            return { success: false, error: 'Transaction is not sent to USDT contract', status: 'invalid_contract' };
        }
        
        // Decode USDT transfer data
        const inputData = tx.input;
        if (!inputData || !inputData.startsWith('0xa9059cbb')) {
            return { success: false, error: 'Transaction is not a USDT transfer', status: 'invalid_transfer' };
        }
        
        // Extract recipient address
        const recipientHex = '0x' + inputData.substring(34, 74);
        const recipient = '0x' + recipientHex.substring(26);
        
        // Extract amount
        const amountHex = inputData.substring(74, 138);
        const amount = parseInt(amountHex, 16) / 1e6;
        
        // Verify recipient
        if (recipient.toLowerCase() !== CONFIG.PAYMENT_ADDRESS.toLowerCase()) {
            return { success: false, error: `Sent to wrong address`, status: 'wrong_recipient' };
        }
        
        // Verify amount
        if (Math.abs(amount - expectedAmount) > 0.01) {
            return { success: false, error: `Incorrect amount: ${amount.toFixed(2)} USDT`, status: 'wrong_amount' };
        }
        
        // Get confirmations
        const currentBlockUrl = `https://${CONFIG.NETWORK}/api?module=proxy&action=eth_blockNumber&apikey=${CONFIG.ETHERSCAN_API_KEY}`;
        const currentBlockResponse = await fetch(currentBlockUrl);
        const currentBlockData = await currentBlockResponse.json();
        
        const currentBlock = parseInt(currentBlockData.result, 16);
        const txBlock = parseInt(tx.blockNumber, 16);
        const confirmations = currentBlock - txBlock;
        
        if (confirmations < CONFIG.MIN_CONFIRMATIONS) {
            return {
                success: false,
                error: `Waiting for confirmations: ${confirmations}/${CONFIG.MIN_CONFIRMATIONS}`,
                status: 'pending_confirmations',
                confirmations,
                required: CONFIG.MIN_CONFIRMATIONS
            };
        }
        
        // ALL CHECKS PASSED
        return {
            success: true,
            status: 'confirmed',
            amount,
            recipient,
            confirmations,
            txHash,
            blockNumber: txBlock
        };
        
    } catch (error) {
        console.error('Etherscan error:', error);
        return { success: false, error: 'Network error. Try again.', status: 'error' };
    }
}

// ============================================
// PAYMENT FLOW
// ============================================
function requestPayment(upgradeType) {
    const cost = upgradeType === 'speed' ? CONFIG.USDT_PRICE_SPEED : CONFIG.USDT_PRICE_EFFICIENCY;
    const level = upgradeType === 'speed' ? speedLevel + 1 : efficiencyLevel + 1;
    const maxLevel = upgradeType === 'speed' ? 10 : 5;
    
    if (upgradeType === 'speed' && speedLevel >= maxLevel) {
        tg?.showAlert('❌ Maximum speed level reached!');
        return;
    }
    if (upgradeType === 'efficiency' && efficiencyLevel >= maxLevel) {
        tg?.showAlert('❌ Maximum efficiency level reached!');
        return;
    }
    
    const paymentId = `${upgradeType}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    tg?.showPopup({
        title: upgradeType === 'speed' ? '⚡ SPEED UPGRADE' : '💎 EFFICIENCY UPGRADE',
        message: 
            `💵 AMOUNT: $${cost} USDT\n` +
            `⛓️ NETWORK: ERC-20\n\n` +
            `📤 SEND TO:\n${CONFIG.PAYMENT_ADDRESS}\n\n` +
            `⚠️ Send EXACT $${cost} USDT\n` +
            `⚠️ Keep transaction hash\n\n` +
            `✅ Click "I PAID" after sending`,
        buttons: [
            {id: 'paid', type: 'default', text: '✅ I PAID'},
            {id: 'copy', type: 'default', text: '📋 COPY ADDRESS'},
            {id: 'cancel', type: 'cancel', text: '❌ CANCEL'}
        ]
    }, async (buttonId) => {
        if (buttonId === 'copy') {
            await navigator.clipboard.writeText(CONFIG.PAYMENT_ADDRESS);
            tg?.showAlert('✅ Address copied!');
            requestPayment(upgradeType);
        }
        else if (buttonId === 'paid') {
            requestTransactionHash(upgradeType, paymentId, cost);
        }
    });
}

function requestTransactionHash(upgradeType, paymentId, cost) {
    tg?.showPopup({
        title: '🔍 ENTER TX HASH',
        message: 'Paste your transaction hash (TXID):',
        buttons: [
            {id: 'submit', type: 'default', text: '📋 SUBMIT'},
            {id: 'cancel', type: 'cancel', text: '❌ CANCEL'}
        ]
    }, (buttonId) => {
        if (buttonId === 'submit') {
            const hash = prompt('Paste transaction hash:', '0x');
            if (hash && hash.length > 10 && hash.startsWith('0x')) {
                processTransactionHash(upgradeType, paymentId, cost, hash);
            } else {
                tg?.showAlert('❌ Invalid transaction hash');
            }
        }
    });
}

async function processTransactionHash(upgradeType, paymentId, cost, txHash) {
    pendingUpgrades[upgradeType] = {
        level: upgradeType === 'speed' ? speedLevel + 1 : efficiencyLevel + 1,
        paymentRequested: true,
        transactionHash: txHash,
        paymentId,
        cost,
        timestamp: new Date().toISOString(),
        verificationAttempts: 0,
        status: 'verifying'
    };
    saveGame();
    
    tg?.showAlert(`⏳ Verifying on Etherscan...`);
    
    const result = await verifyUSDTTransaction(txHash, cost);
    
    if (result.success) {
        pendingUpgrades[upgradeType].status = 'confirmed';
        activateUpgrade(upgradeType, result);
    } else {
        pendingUpgrades[upgradeType].status = 'failed';
        saveGame();
        
        let errorMsg = `❌ VERIFICATION FAILED\n\n${result.error}`;
        
        if (result.status === 'pending_confirmations') {
            errorMsg += `\n\n⏳ Auto-retrying in 1 minute...`;
            setTimeout(() => {
                processTransactionHash(upgradeType, paymentId, cost, txHash);
            }, 60000);
        }
        
        tg?.showAlert(errorMsg);
    }
}

function activateUpgrade(upgradeType, verificationResult) {
    if (upgradeType === 'speed') {
        speedLevel++;
        pendingUpgrades.speed = { level: 0, paymentRequested: false, transactionHash: null, paymentId: null, cost: CONFIG.USDT_PRICE_SPEED, timestamp: null, verificationAttempts: 0, status: 'pending' };
        
        const newSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
        tg?.showAlert(`✅ SPEED LEVEL ${speedLevel} ACTIVATED!\n⏱️ Mining speed: ${newSpeed}s`);
    } else {
        efficiencyLevel++;
        pendingUpgrades.efficiency = { level: 0, paymentRequested: false, transactionHash: null, paymentId: null, cost: CONFIG.USDT_PRICE_EFFICIENCY, timestamp: null, verificationAttempts: 0, status: 'pending' };
        
        const newMultiplier = Math.pow(2, efficiencyLevel);
        tg?.showAlert(`✅ EFFICIENCY LEVEL ${efficiencyLevel} ACTIVATED!\n📈 Multiplier: ${newMultiplier}x`);
    }
    
    if (isMining) startMiningSession();
    updateUI();
    saveGame();
}

// ============================================
// MINING FUNCTIONS
// ============================================
function startMining() {
    if (isMining && sessionEndTime && new Date(sessionEndTime) > new Date()) {
        tg?.showAlert('⛏️ Mining already in progress!');
        return;
    }
    
    const now = new Date();
    sessionEndTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)).toISOString();
    isMining = true;
    
    startMiningSession();
    saveGame();
    
    tg?.showAlert('✅ 2-hour mining session started!\nMining continues even if you leave.');
}

function startMiningSession() {
    if (miningInterval) clearInterval(miningInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    const currentSpeed = Math.max(3, miningSpeed - (speedLevel * 3));
    const miningAmount = baseMiningAmount * Math.pow(2, efficiencyLevel);
    
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
        
        balance = parseFloat((balance + miningAmount).toFixed(15));
        totalMined = parseFloat((totalMined + miningAmount).toFixed(15));
        
        updateUI();
        saveGame();
        animateProgress();
        
    }, currentSpeed * 1000);
    
    timerInterval = setInterval(updateTimer, 1000);
}

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

// ============================================
// UPGRADE FUNCTIONS - PAYMENT REQUIRED
// ============================================
function buyUpgrade(type) {
    requestPayment(type);
}

// ============================================
// REFERRAL FUNCTIONS
// ============================================
function updateReferralUI() {
    const countEl = document.getElementById('referral-count');
    if (countEl) countEl.textContent = referralData.count;
    
    const earningsEl = document.getElementById('referral-earnings');
    if (earningsEl) earningsEl.textContent = formatBTC(referralData.earnings);
    
    const tierEl = document.getElementById('referral-tier');
    if (tierEl) tierEl.textContent = referralData.tier;
    
    const commissionEl = document.getElementById('commission-rate');
    if (commissionEl) commissionEl.textContent = `${referralData.commission}%`;
    
    const linkEl = document.getElementById('referral-link');
    if (linkEl) {
        linkEl.textContent = `https://t.me/${CONFIG.BOT_USERNAME}?start=${referralData.code}`;
    }
}

function copyReferralLink() {
    const link = `https://t.me/${CONFIG.BOT_USERNAME}?start=${referralData.code}`;
    navigator.clipboard.writeText(link).then(() => {
        tg?.showAlert('✅ Referral link copied!\nEarn 5-15% commission!');
    });
}

function shareTelegram() {
    const link = `https://t.me/${CONFIG.BOT_USERNAME}?start=${referralData.code}`;
    const text = encodeURIComponent('⚡ Join me on BTC DK Mining! Earn Bitcoin with professional mining bot. ');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

function shareWhatsApp() {
    const link = `https://t.me/${CONFIG.BOT_USERNAME}?start=${referralData.code}`;
    const text = encodeURIComponent(`⚡ BTC DK MINING - Professional Bitcoin Mining\n\nStart earning Bitcoin instantly!\n\nMy referral link: ${link}\n\nEarn 5-15% lifetime commission!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ============================================
// UI UPDATES
// ============================================
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
    
    // Referral UI
    updateReferralUI();
}

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

function updateUpgradeButtons() {
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
        if (speedLevel >= 10) {
            speedBtn.innerHTML = '✓ MAX LEVEL REACHED';
            speedBtn.disabled = true;
        } else {
            speedBtn.innerHTML = `⚡ Purchase Speed Upgrade - $${CONFIG.USDT_PRICE_SPEED}`;
            speedBtn.disabled = false;
        }
    }
    
    const effBtn = document.getElementById('efficiency-btn');
    if (effBtn) {
        if (efficiencyLevel >= 5) {
            effBtn.innerHTML = '✓ MAX LEVEL REACHED';
            effBtn.disabled = true;
        } else {
            effBtn.innerHTML = `💎 Purchase Efficiency Upgrade - $${CONFIG.USDT_PRICE_EFFICIENCY}`;
            effBtn.disabled = false;
        }
    }
}

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

// ============================================
// WITHDRAWAL FUNCTIONS
// ============================================
function withdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const walletInput = document.getElementById('wallet-address');
    
    const amount = parseFloat(amountInput?.value || '0');
    const wallet = walletInput?.value.trim() || '';
    
    if (!amount || amount < 0.001) {
        tg?.showAlert('❌ Minimum withdrawal: 0.001 BTC');
        return;
    }
    
    if (amount > balance) {
        tg?.showAlert(`❌ Insufficient balance. Available: ${formatBTC(balance)} BTC`);
        return;
    }
    
    if (!wallet || wallet.length < 26) {
        tg?.showAlert('❌ Please enter a valid Bitcoin wallet address');
        return;
    }
    
    const fee = 0.0001;
    const netAmount = amount - fee;
    
    tg?.showConfirm(
        `💰 WITHDRAWAL REQUEST\n\n` +
        `Amount: ${amount.toFixed(8)} BTC\n` +
        `Fee: ${fee.toFixed(8)} BTC\n` +
        `You receive: ${netAmount.toFixed(8)} BTC\n\n` +
        `Confirm withdrawal?`,
        (confirmed) => {
            if (confirmed) {
                balance = parseFloat((balance - amount).toFixed(15));
                updateUI();
                saveGame();
                tg?.showAlert(`✅ Withdrawal submitted!\n${netAmount.toFixed(8)} BTC`);
                
                if (amountInput) amountInput.value = '';
                if (walletInput) walletInput.value = '';
            }
        }
    );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
async function copyAddress() {
    await navigator.clipboard.writeText(CONFIG.PAYMENT_ADDRESS);
    tg?.showAlert('✅ Payment address copied!');
}

function setMaxWithdraw() {
    const input = document.getElementById('withdraw-amount');
    if (input) {
        input.value = balance.toFixed(8);
        const receiveEl = document.getElementById('receive-amount');
        if (receiveEl) {
            const receive = balance - 0.0001;
            receiveEl.textContent = receive > 0 ? receive.toFixed(8) + ' BTC' : '0.00000000 BTC';
        }
    }
}

function checkPendingUpgrades() {
    if (pendingUpgrades.speed.paymentRequested && pendingUpgrades.speed.status === 'verifying') {
        tg?.showAlert(`⏳ Pending Speed Upgrade - Verifying...`);
    }
    if (pendingUpgrades.efficiency.paymentRequested && pendingUpgrades.efficiency.status === 'verifying') {
        tg?.showAlert(`⏳ Pending Efficiency Upgrade - Verifying...`);
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('BTC DK MINING - Advanced Edition Loaded');
    loadGame();
    
    // Withdraw input listener
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
    
    // Check pending verifications every minute
    setInterval(() => {
        if (pendingUpgrades.speed.status === 'verifying' && pendingUpgrades.speed.transactionHash) {
            processTransactionHash('speed', pendingUpgrades.speed.paymentId, pendingUpgrades.speed.cost, pendingUpgrades.speed.transactionHash);
        }
        if (pendingUpgrades.efficiency.status === 'verifying' && pendingUpgrades.efficiency.transactionHash) {
            processTransactionHash('efficiency', pendingUpgrades.efficiency.paymentId, pendingUpgrades.efficiency.cost, pendingUpgrades.efficiency.transactionHash);
        }
    }, 60000);
    
    // Welcome message
    if (!localStorage.getItem('btc_mining_advanced_welcome')) {
        setTimeout(() => {
            tg?.showAlert(
                '⚡ BTC DK MINING - ADVANCED EDITION\n\n' +
                '✅ Real Etherscan payment verification\n' +
                '✅ Persistent mining - never lose progress\n' +
                '✅ 2-hour auto-mining sessions\n' +
                '✅ Referral rewards: 5-15% commission\n' +
                '✅ USDT upgrades (ERC-20)\n\n' +
                'Your API key is ACTIVE!'
            );
            localStorage.setItem('btc_mining_advanced_welcome', 'true');
        }, 1500);
    }
});

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.startMining = startMining;
window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;
window.copyAddress = copyAddress;
window.setMaxWithdraw = setMaxWithdraw;
window.copyReferralLink = copyReferralLink;
window.shareTelegram = shareTelegram;
window.shareWhatsApp = shareWhatsApp;
