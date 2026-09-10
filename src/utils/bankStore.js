import { getLocalDateString } from './dateUtils';

const KEYS = {
  ACCOUNTS: 'rc_bank_accounts',
  TRANSACTIONS: 'rc_bank_transactions',
};

// Available Account Types
export const ACCOUNT_TYPES = ['Savings', 'Current', 'Overdraft', 'Cash / Wallet'];

// Popular Bank Color Themes & Presets
export const BANK_PRESETS = [
  { name: 'State Bank of India (SBI)', shortName: 'SBI', color: '#00539F', bgGradient: 'linear-gradient(135deg, #0b4f8a 0%, #002b52 50%, #001730 100%)', badgeBg: 'rgba(0, 83, 159, 0.35)' },
  { name: 'HDFC Bank', shortName: 'HDFC', color: '#004c8f', bgGradient: 'linear-gradient(135deg, #004c8f 0%, #002c59 50%, #00152e 100%)', badgeBg: 'rgba(0, 76, 143, 0.35)' },
  { name: 'ICICI Bank', shortName: 'ICICI', color: '#B02A30', bgGradient: 'linear-gradient(135deg, #c43239 0%, #85181d 50%, #4a090c 100%)', badgeBg: 'rgba(176, 42, 48, 0.35)' },
  { name: 'Axis Bank', shortName: 'Axis', color: '#97144D', bgGradient: 'linear-gradient(135deg, #97144D 0%, #680d35 50%, #3d051e 100%)', badgeBg: 'rgba(151, 20, 77, 0.35)' },
  { name: 'Punjab National Bank (PNB)', shortName: 'PNB', color: '#A21D21', bgGradient: 'linear-gradient(135deg, #b82227 0%, #6e1115 50%, #380608 100%)', badgeBg: 'rgba(162, 29, 33, 0.35)' },
  { name: 'Bank of Baroda (BOB)', shortName: 'BOB', color: '#F15A24', bgGradient: 'linear-gradient(135deg, #f15a24 0%, #b83c11 50%, #571602 100%)', badgeBg: 'rgba(241, 90, 36, 0.35)' },
  { name: 'Kotak Mahindra Bank', shortName: 'Kotak', color: '#ED1C24', bgGradient: 'linear-gradient(135deg, #ed1c24 0%, #a81016 50%, #54060a 100%)', badgeBg: 'rgba(237, 28, 36, 0.35)' },
  { name: 'Canara Bank', shortName: 'Canara', color: '#0090DA', bgGradient: 'linear-gradient(135deg, #0090da 0%, #005a8f 50%, #002a45 100%)', badgeBg: 'rgba(0, 144, 218, 0.35)' },
  { name: 'Union Bank of India', shortName: 'UBI', color: '#0054A6', bgGradient: 'linear-gradient(135deg, #0054a6 0%, #00366b 50%, #001b38 100%)', badgeBg: 'rgba(0, 84, 166, 0.35)' },
  { name: 'IndusInd Bank', shortName: 'IndusInd', color: '#881F23', bgGradient: 'linear-gradient(135deg, #962529 0%, #5c1114 50%, #2e0507 100%)', badgeBg: 'rgba(136, 31, 35, 0.35)' },
  { name: 'IDBI Bank', shortName: 'IDBI', color: '#007A3E', bgGradient: 'linear-gradient(135deg, #008f48 0%, #005229 50%, #002613 100%)', badgeBg: 'rgba(0, 122, 62, 0.35)' },
  { name: 'Yes Bank', shortName: 'Yes Bank', color: '#002B49', bgGradient: 'linear-gradient(135deg, #003c66 0%, #00223b 50%, #00101c 100%)', badgeBg: 'rgba(0, 43, 73, 0.35)' },
  { name: 'Cash In Hand / Wallet', shortName: 'Cash', color: '#10B981', bgGradient: 'linear-gradient(135deg, #10b981 0%, #047857 50%, #024733 100%)', badgeBg: 'rgba(16, 185, 129, 0.35)' },
  { name: 'Other Bank', shortName: 'Other', color: '#4B5563', bgGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%)', badgeBg: 'rgba(75, 85, 99, 0.35)' }
];

export const bankStore = {
  // Initialize storage
  init() {
    if (!localStorage.getItem(KEYS.ACCOUNTS)) {
      localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
    }
  },

  notify() {
    window.dispatchEvent(new CustomEvent('bankStoreUpdated'));
  },

  // Helper: Mask Account Number for Security (e.g., •••• •••• •••• 4589)
  maskAccountNumber(accNo) {
    if (!accNo || !String(accNo).trim()) return '•••• •••• •••• 0000';
    const clean = String(accNo).replace(/\s/g, '').trim();
    if (clean.length <= 4) return `•••• •••• •••• ${clean.padStart(4, '0')}`;
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
  },

  // Helper: Format raw account number into 4-digit groups for unmasked reveal
  formatAccountNumber(accNo) {
    if (!accNo) return 'N/A';
    const clean = String(accNo).replace(/\s/g, '').trim();
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  },

  // Get raw stored accounts
  _getRawAccounts() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACCOUNTS) || '[]');
    } catch {
      return [];
    }
  },

  // Get raw stored transactions
  _getRawTransactions() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    } catch {
      return [];
    }
  },

  // ==========================================
  // BANK ACCOUNTS CRUD WITH DERIVED BALANCES
  // ==========================================

  // Get all accounts with dynamic computed balances
  getAccounts(userId = null) {
    const rawAccounts = this._getRawAccounts();
    const rawTx = this._getRawTransactions();

    const filtered = userId 
      ? rawAccounts.filter(a => !a.userId || a.userId === userId)
      : rawAccounts;

    return filtered.map(acc => {
      const accTx = rawTx.filter(t => t.bankAccountId === acc.id);
      
      const totalCredit = accTx
        .filter(t => t.type === 'Credit' || t.type === 'Transfer_In')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalDebit = accTx
        .filter(t => t.type === 'Debit' || t.type === 'Transfer_Out')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const openingBalance = Number(acc.openingBalance || 0);
      const currentBalance = openingBalance + totalCredit - totalDebit;

      return {
        ...acc,
        openingBalance,
        totalCredit,
        totalDebit,
        currentBalance,
        transactionCount: accTx.length
      };
    });
  },

  // Get single account by ID with calculated balance
  getAccountById(id, userId = null) {
    const accounts = this.getAccounts(userId);
    return accounts.find(a => a.id === id) || null;
  },

  // Get default bank account (or first available)
  getDefaultAccount(userId = null) {
    const accounts = this.getAccounts(userId).filter(a => !a.isArchived);
    if (accounts.length === 0) return null;
    return accounts.find(a => a.isDefault) || accounts[0];
  },

  // Add a new bank account
  addAccount(accountData) {
    const accounts = this._getRawAccounts();
    const isFirst = accounts.length === 0;

    const newAccount = {
      id: 'BNK-' + Date.now().toString(36).toUpperCase(),
      userId: accountData.userId || 'current_user',
      bankName: accountData.bankName || 'General Bank',
      accountHolderName: accountData.accountHolderName || 'Account Holder',
      accountNumber: accountData.accountNumber || '',
      ifscCode: (accountData.ifscCode || '').toUpperCase(),
      branchName: accountData.branchName || '',
      accountType: accountData.accountType || 'Savings',
      openingBalance: Number(accountData.openingBalance || 0),
      openingDate: accountData.openingDate || getLocalDateString(),
      color: accountData.color || '#00539F',
      bgGradient: accountData.bgGradient || 'linear-gradient(135deg, #00539F 0%, #002b52 100%)',
      isDefault: isFirst || Boolean(accountData.isDefault),
      isArchived: false,
      createdAt: Date.now(),
      notes: accountData.notes || ''
    };

    // If marked default, unset other defaults
    let updated = accounts;
    if (newAccount.isDefault) {
      updated = updated.map(a => ({ ...a, isDefault: false }));
    }

    updated.push(newAccount);
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updated));
    this.notify();
    return newAccount;
  },

  // Update bank account details (Opening balance change triggers automatic recalculation)
  updateAccount(id, updates) {
    const accounts = this._getRawAccounts();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return null;

    let updatedList = [...accounts];
    if (updates.isDefault) {
      updatedList = updatedList.map(a => ({ ...a, isDefault: false }));
    }

    updatedList[index] = {
      ...updatedList[index],
      ...updates,
      openingBalance: updates.openingBalance !== undefined ? Number(updates.openingBalance || 0) : updatedList[index].openingBalance,
      updatedAt: Date.now()
    };

    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updatedList));
    this.notify();
    return updatedList[index];
  },

  // Set account as default
  setDefaultAccount(id) {
    const accounts = this._getRawAccounts();
    const updated = accounts.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updated));
    this.notify();
  },

  // Delete bank account & its linked transactions
  deleteAccount(id) {
    const accounts = this._getRawAccounts().filter(a => a.id !== id);
    const transactions = this._getRawTransactions().filter(t => t.bankAccountId !== id && t.fromBankAccountId !== id && t.toBankAccountId !== id);
    
    // If the deleted account was default and others remain, make first one default
    if (accounts.length > 0 && !accounts.some(a => a.isDefault)) {
      accounts[0].isDefault = true;
    }

    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    this.notify();
    return true;
  },

  // ==========================================
  // BANK TRANSACTIONS ENGINE & PASSBOOK
  // ==========================================

  // Get transactions with optional filters and running balance calculation
  getTransactions(bankAccountId = null, filters = {}, userId = null) {
    let transactions = this._getRawTransactions();
    const accounts = this._getRawAccounts();

    if (userId) {
      transactions = transactions.filter(t => !t.userId || t.userId === userId);
    }

    if (bankAccountId && bankAccountId !== 'All') {
      transactions = transactions.filter(t => t.bankAccountId === bankAccountId);
    }

    if (filters.type && filters.type !== 'All') {
      if (filters.type === 'Credit') {
        transactions = transactions.filter(t => t.type === 'Credit' || t.type === 'Transfer_In');
      } else if (filters.type === 'Debit') {
        transactions = transactions.filter(t => t.type === 'Debit' || t.type === 'Transfer_Out');
      } else if (filters.type === 'Transfer') {
        transactions = transactions.filter(t => t.type === 'Transfer_In' || t.type === 'Transfer_Out');
      } else {
        transactions = transactions.filter(t => t.type === filters.type);
      }
    }

    if (filters.category && filters.category !== 'All') {
      transactions = transactions.filter(t => t.category === filters.category);
    }

    if (filters.startDate) {
      transactions = transactions.filter(t => (t.date || '') >= filters.startDate);
    }

    if (filters.endDate) {
      transactions = transactions.filter(t => (t.date || '') <= filters.endDate);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      transactions = transactions.filter(t => 
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q) ||
        (t.refId || '').toLowerCase().includes(q) ||
        String(t.amount || '').includes(q)
      );
    }

    // Sort chronologically ascending to compute accurate historical running balance
    transactions.sort((a, b) => {
      const d1 = (a.date || '') + (a.createdAt ? String(a.createdAt).padStart(15, '0') : '');
      const d2 = (b.date || '') + (b.createdAt ? String(b.createdAt).padStart(15, '0') : '');
      return d1.localeCompare(d2);
    });

    // If queried for a specific account, calculate running passbook balance
    if (bankAccountId && bankAccountId !== 'All') {
      const acc = accounts.find(a => a.id === bankAccountId);
      let running = Number(acc?.openingBalance || 0);

      transactions = transactions.map(t => {
        const isCredit = t.type === 'Credit' || t.type === 'Transfer_In';
        const amt = Number(t.amount || 0);
        running = isCredit ? running + amt : running - amt;
        return {
          ...t,
          runningBalance: running,
          bankName: acc?.bankName || 'Bank',
          accountNumber: acc?.accountNumber || ''
        };
      });
    } else {
      // Multiple accounts view: enrich with account name
      transactions = transactions.map(t => {
        const acc = accounts.find(a => a.id === t.bankAccountId);
        return {
          ...t,
          bankName: acc?.bankName || 'Bank',
          accountNumber: acc?.accountNumber || ''
        };
      });
    }

    // Return descending for UI presentation (latest on top)
    return transactions.reverse();
  },

  // Record a single Bank Transaction (Credit or Debit)
  recordTransaction(txData) {
    if (!txData.bankAccountId || !txData.amount) return null;

    const transactions = this._getRawTransactions();
    const newTx = {
      id: txData.id || 'BTX-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      userId: txData.userId || 'current_user',
      bankAccountId: txData.bankAccountId,
      type: txData.type || 'Debit', // 'Credit' | 'Debit' | 'Transfer_In' | 'Transfer_Out'
      amount: Math.abs(Number(txData.amount || 0)),
      date: txData.date || getLocalDateString(),
      category: txData.category || 'General',
      description: txData.description || '',
      refType: txData.refType || 'MANUAL', // 'EMI_PAYMENT' | 'LOAN_DISBURSEMENT' | 'EXPENSE' | 'UDHAAR' | 'TRANSFER' | 'MANUAL'
      refId: txData.refId || null,
      paymentMethod: txData.paymentMethod || 'Bank Transfer',
      notes: txData.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    transactions.push(newTx);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    this.notify();
    return newTx;
  },

  // Record a Bank-to-Bank Transfer (Creates 2 paired transactions with shared transferGroupId)
  recordBankTransfer({ fromBankId, toBankId, amount, date, description, notes, userId }) {
    if (!fromBankId || !toBankId || fromBankId === toBankId || !amount || Number(amount) <= 0) {
      throw new Error('Please select different valid From and To bank accounts with positive amount');
    }

    const amt = Math.abs(Number(amount));
    const txDate = date || getLocalDateString();
    const accounts = this._getRawAccounts();
    const fromAcc = accounts.find(a => a.id === fromBankId);
    const toAcc = accounts.find(a => a.id === toBankId);

    const fromName = fromAcc ? `${fromAcc.bankName} (..${fromAcc.accountNumber.slice(-4)})` : 'Bank A';
    const toName = toAcc ? `${toAcc.bankName} (..${toAcc.accountNumber.slice(-4)})` : 'Bank B';

    const transferGroupId = 'TRF-' + Date.now().toString(36).toUpperCase();
    const timestamp = Date.now();

    // 1. Debit from Source Bank (Transfer_Out)
    const outTx = {
      id: 'BTX-OUT-' + transferGroupId,
      userId: userId || 'current_user',
      bankAccountId: fromBankId,
      toBankAccountId: toBankId,
      transferGroupId,
      type: 'Transfer_Out',
      amount: amt,
      date: txDate,
      category: 'Bank Transfer',
      description: description || `Transfer to ${toName}`,
      refType: 'BANK_TRANSFER',
      refId: transferGroupId,
      paymentMethod: 'Self Bank Transfer',
      notes: notes || '',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // 2. Credit to Target Bank (Transfer_In)
    const inTx = {
      id: 'BTX-IN-' + transferGroupId,
      userId: userId || 'current_user',
      bankAccountId: toBankId,
      fromBankAccountId: fromBankId,
      transferGroupId,
      type: 'Transfer_In',
      amount: amt,
      date: txDate,
      category: 'Bank Transfer',
      description: description || `Transfer from ${fromName}`,
      refType: 'BANK_TRANSFER',
      refId: transferGroupId,
      paymentMethod: 'Self Bank Transfer',
      notes: notes || '',
      createdAt: timestamp + 1,
      updatedAt: timestamp + 1
    };

    const transactions = this._getRawTransactions();
    transactions.push(outTx, inTx);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    this.notify();
    return { transferGroupId, outTx, inTx };
  },

  // Delete a transaction (or paired transfer) by ID
  deleteTransaction(id) {
    const transactions = this._getRawTransactions();
    const target = transactions.find(t => t.id === id);
    if (!target) return false;

    let filtered = [];
    if (target.transferGroupId) {
      // If it's a transfer, delete both paired records atomically
      filtered = transactions.filter(t => t.transferGroupId !== target.transferGroupId);
    } else {
      filtered = transactions.filter(t => t.id !== id);
    }

    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
    this.notify();
    return true;
  },

  // ==========================================
  // MODULE SYNCHRONIZATION HOOKS
  // ==========================================

  // Automatically sync or update a bank transaction originating from Expenses, Loans, EMI, or Udhaar
  syncModuleTransaction(refType, refId, txDetails) {
    if (!refType || !refId) return null;

    let transactions = this._getRawTransactions();
    const existingIndex = transactions.findIndex(t => t.refType === refType && t.refId === String(refId));

    if (!txDetails || !txDetails.bankAccountId || !txDetails.amount) {
      // If txDetails is null or has no bank, remove existing if present
      if (existingIndex !== -1) {
        transactions.splice(existingIndex, 1);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
        this.notify();
      }
      return null;
    }

    const updatedTx = {
      id: existingIndex !== -1 ? transactions[existingIndex].id : 'BTX-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      userId: txDetails.userId || 'current_user',
      bankAccountId: txDetails.bankAccountId,
      type: txDetails.type || 'Debit',
      amount: Math.abs(Number(txDetails.amount || 0)),
      date: txDetails.date || getLocalDateString(),
      category: txDetails.category || 'General',
      description: txDetails.description || '',
      refType: refType,
      refId: String(refId),
      paymentMethod: txDetails.paymentMethod || 'Bank Transfer',
      notes: txDetails.notes || '',
      createdAt: existingIndex !== -1 ? transactions[existingIndex].createdAt : Date.now(),
      updatedAt: Date.now()
    };

    if (existingIndex !== -1) {
      transactions[existingIndex] = updatedTx;
    } else {
      transactions.push(updatedTx);
    }

    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    this.notify();
    return updatedTx;
  },

  // Clean up any bank transactions linked to a deleted module record
  deleteModuleTransactions(refType, refId) {
    if (!refType || !refId) return;
    const transactions = this._getRawTransactions();
    const filtered = transactions.filter(t => !(t.refType === refType && t.refId === String(refId)));
    if (filtered.length !== transactions.length) {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
      this.notify();
    }
  },

  // Get total liquid aggregate balance across all bank accounts
  getTotalLiquidity(userId = null) {
    const accounts = this.getAccounts(userId).filter(a => !a.isArchived);
    return accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
  },

  // Get high-level financial dashboard summary
  getFinancialSummary(userId = null) {
    const accounts = this.getAccounts(userId);
    const transactions = this._getRawTransactions();
    const currentMonth = getLocalDateString().substring(0, 7);

    const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const activeAccountsCount = accounts.filter(a => !a.isArchived).length;

    // Monthly Inflow (excluding self transfers)
    const monthlyInflow = transactions
      .filter(t => t.type === 'Credit' && (t.date || '').startsWith(currentMonth))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Monthly Outflow (excluding self transfers)
    const monthlyOutflow = transactions
      .filter(t => t.type === 'Debit' && (t.date || '').startsWith(currentMonth))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Monthly Bank-to-Bank transfers
    const monthlyTransfers = transactions
      .filter(t => t.type === 'Transfer_Out' && (t.date || '').startsWith(currentMonth))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return {
      totalBalance,
      activeAccountsCount,
      monthlyInflow,
      monthlyOutflow,
      monthlyTransfers,
      totalTransactions: transactions.length
    };
  }
};
