import React, { useState, useEffect, useMemo } from 'react';
import { 
  MdAccountBalance, MdAdd, MdSwapHoriz, MdArrowUpward, MdArrowDownward,
  MdCreditCard, MdDelete, MdEdit, MdCheckCircle, MdSearch,
  MdFileDownload, MdPrint, MdFilterList, MdVisibility, MdVisibilityOff,
  MdOutlineAccountBalanceWallet, MdMoreVert, MdContentCopy, MdCheck,
  MdViewModule, MdViewList, MdInfoOutline, MdAccountBalanceWallet as MdWallet
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import { bankStore, BANK_PRESETS, ACCOUNT_TYPES } from '../utils/bankStore';
import { getLocalDateString, formatIndianDate, getLastEntryDate, setLastEntryDate } from '../utils/dateUtils';
import AnimatedNumber from '../components/AnimatedNumber';

// EMV Gold Chip SVG Graphic
const EmvChip = () => (
  <svg width="38" height="28" viewBox="0 0 38 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-2 shadow-sm" style={{ flexShrink: 0 }}>
    <rect width="38" height="28" rx="4" fill="url(#goldChipGrad)" />
    <path d="M0 14H13M25 14H38M13 5V23M25 5V23M13 10H25M13 18H25" stroke="#7a5813" strokeWidth="1.2" />
    <rect x="13" y="9.5" width="12" height="9" rx="2" fill="#E5C158" stroke="#7a5813" strokeWidth="1" />
    <defs>
      <linearGradient id="goldChipGrad" x1="0" y1="0" x2="38" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5D77F"/>
        <stop offset="0.5" stopColor="#D4AF37"/>
        <stop offset="1" stopColor="#996515"/>
      </linearGradient>
    </defs>
  </svg>
);

// Contactless NFC Wave Icon
const ContactlessWave = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ opacity: 0.85, flexShrink: 0 }}>
    <path d="M8.5 16.5a5 5 0 0 1 0-7"/>
    <path d="M12 19a8.5 8.5 0 0 1 0-12"/>
    <path d="M15.5 21.5a12 12 0 0 1 0-17"/>
  </svg>
);

const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    activeAccountsCount: 0,
    monthlyInflow: 0,
    monthlyOutflow: 0,
    monthlyTransfers: 0,
    totalTransactions: 0
  });

  // UI state
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rc_view_bank_accounts') || (window.innerWidth >= 768 ? 'cards' : 'cards');
  });
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Credit', 'Debit', 'Transfer'
  const [dateFilter, setDateFilter] = useState('All'); // 'Today', 'This Week', 'This Month', 'All'
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedAccounts, setRevealedAccounts] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('Credit'); // 'Credit' (Deposit) or 'Debit' (Withdrawal)
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form states
  const [accountForm, setAccountForm] = useState({
    bankName: 'State Bank of India (SBI)',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'Savings',
    openingBalance: '',
    openingDate: getLocalDateString(),
    color: '#00539F',
    bgGradient: 'linear-gradient(135deg, #0b4f8a 0%, #002b52 50%, #001730 100%)',
    isDefault: false,
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    fromBankId: '',
    toBankId: '',
    amount: '',
    date: getLocalDateString(),
    description: '',
    notes: ''
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    bankAccountId: '',
    amount: '',
    date: getLocalDateString(),
    category: 'Direct Deposit',
    description: '',
    paymentMethod: 'Net Banking',
    notes: ''
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rc_view_bank_accounts', mode);
  };

  // Load Data
  const loadData = () => {
    const accList = bankStore.getAccounts();
    setAccounts(accList);
    setSummary(bankStore.getFinancialSummary());

    // Load passbook transactions based on active account filter
    const txList = bankStore.getTransactions(selectedAccountId, {
      type: typeFilter,
      search: searchQuery
    });
    setTransactions(txList);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('bankStoreUpdated', loadData);
    return () => window.removeEventListener('bankStoreUpdated', loadData);
  }, [selectedAccountId, typeFilter, searchQuery]);

  // Date filtering logic
  const filteredTransactions = useMemo(() => {
    const today = getLocalDateString();
    const currentMonth = today.substring(0, 7);

    return transactions.filter(t => {
      const tDate = t.date || '';
      if (dateFilter === 'Today') {
        return tDate === today;
      }
      if (dateFilter === 'This Week') {
        const tTime = new Date(tDate).getTime();
        const nowTime = new Date(today).getTime();
        return nowTime - tTime <= 7 * 86400000 && tDate <= today;
      }
      if (dateFilter === 'This Month') {
        return tDate.startsWith(currentMonth);
      }
      return true;
    });
  }, [transactions, dateFilter]);

  // Handle Preset Selection for Bank
  const handleBankPresetSelect = (preset) => {
    setAccountForm(prev => ({
      ...prev,
      bankName: preset.name,
      color: preset.color,
      bgGradient: preset.bgGradient
    }));
  };

  // Open Add/Edit Account Modal
  const openAccountModal = (acc = null) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        bankName: acc.bankName || '',
        accountHolderName: acc.accountHolderName || '',
        accountNumber: acc.accountNumber || '',
        ifscCode: acc.ifscCode || '',
        branchName: acc.branchName || '',
        accountType: acc.accountType || 'Savings',
        openingBalance: acc.openingBalance?.toString() || '0',
        openingDate: acc.openingDate || getLocalDateString(),
        color: acc.color || '#00539F',
        bgGradient: acc.bgGradient || 'linear-gradient(135deg, #0b4f8a 0%, #002b52 50%, #001730 100%)',
        isDefault: Boolean(acc.isDefault),
        notes: acc.notes || ''
      });
    } else {
      const defaultPreset = BANK_PRESETS[0];
      setEditingAccount(null);
      setAccountForm({
        bankName: defaultPreset.name,
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        accountType: 'Savings',
        openingBalance: '',
        openingDate: getLocalDateString(),
        color: defaultPreset.color,
        bgGradient: defaultPreset.bgGradient,
        isDefault: accounts.length === 0,
        notes: ''
      });
    }
    setShowAccountModal(true);
  };

  // Save Account
  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!accountForm.bankName || !accountForm.accountHolderName) {
      alert('Please provide Bank Name and Account Holder Name');
      return;
    }

    if (editingAccount) {
      bankStore.updateAccount(editingAccount.id, {
        ...accountForm,
        openingBalance: Number(accountForm.openingBalance || 0)
      });
    } else {
      bankStore.addAccount({
        ...accountForm,
        openingBalance: Number(accountForm.openingBalance || 0)
      });
    }
    setShowAccountModal(false);
  };

  // Open Transfer Modal
  const openTransferModal = (fromId = null) => {
    if (accounts.length < 2) {
      alert('Please add at least 2 bank accounts to perform a Bank-to-Bank transfer.');
      return;
    }
    const defaultFrom = fromId || accounts[0]?.id || '';
    const defaultTo = accounts.find(a => a.id !== defaultFrom)?.id || '';

    setTransferForm({
      fromBankId: defaultFrom,
      toBankId: defaultTo,
      amount: '',
      date: getLastEntryDate('bank', getLocalDateString()),
      description: '',
      notes: ''
    });
    setShowTransferModal(true);
  };

  // Execute Bank-to-Bank Transfer
  const handleExecuteTransfer = (e) => {
    e.preventDefault();
    const amt = Number(transferForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }
    if (transferForm.fromBankId === transferForm.toBankId) {
      alert('From Bank and To Bank cannot be the same');
      return;
    }

    const fromAcc = accounts.find(a => a.id === transferForm.fromBankId);
    if (fromAcc && fromAcc.currentBalance < amt) {
      const confirmLow = window.confirm(`Source bank has available balance ₹${fromAcc.currentBalance.toLocaleString('en-IN')}, which is less than transfer amount ₹${amt.toLocaleString('en-IN')}. Do you want to proceed with transfer?`);
      if (!confirmLow) return;
    }

    try {
      const chosenDate = transferForm.date || getLocalDateString();
      setLastEntryDate('bank', chosenDate);

      bankStore.recordBankTransfer({
        fromBankId: transferForm.fromBankId,
        toBankId: transferForm.toBankId,
        amount: amt,
        date: chosenDate,
        description: transferForm.description,
        notes: transferForm.notes
      });
      setShowTransferModal(false);
      alert('✓ Bank-to-Bank transfer recorded successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record transfer');
    }
  };

  // Open Direct Adjustment Modal
  const openAdjustmentModal = (type = 'Credit', bankId = null) => {
    if (accounts.length === 0) {
      alert('Please add a bank account first.');
      return;
    }
    setAdjustmentType(type);
    const targetBank = bankId || (selectedAccountId !== 'All' ? selectedAccountId : accounts[0].id);
    setAdjustmentForm({
      bankAccountId: targetBank,
      amount: '',
      date: getLastEntryDate('bank', getLocalDateString()),
      category: type === 'Credit' ? 'Direct Deposit / Capital' : 'Direct Withdrawal / Charges',
      description: '',
      paymentMethod: 'Net Banking',
      notes: ''
    });
    setShowAdjustmentModal(true);
  };

  // Save Direct Adjustment
  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    const amt = Number(adjustmentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const chosenDate = adjustmentForm.date || getLocalDateString();
    setLastEntryDate('bank', chosenDate);

    bankStore.recordTransaction({
      bankAccountId: adjustmentForm.bankAccountId,
      type: adjustmentType,
      amount: amt,
      date: chosenDate,
      category: adjustmentForm.category,
      description: adjustmentForm.description || `${adjustmentType === 'Credit' ? 'Deposit' : 'Withdrawal'} in Bank`,
      paymentMethod: adjustmentForm.paymentMethod,
      notes: adjustmentForm.notes,
      refType: 'MANUAL'
    });

    setShowAdjustmentModal(false);
    alert(`✓ ${adjustmentType === 'Credit' ? 'Deposit' : 'Withdrawal'} recorded successfully!`);
  };

  // Toggle account number mask
  const toggleAccountReveal = (accId) => {
    setRevealedAccounts(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  // Copy account number
  const copyAccountNumber = (accNumber, accId) => {
    if (!accNumber) return;
    navigator.clipboard.writeText(accNumber);
    setCopiedId(accId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Passbook / Ledger to Excel (.xlsx)
  const exportToExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const exportRows = filteredTransactions.map((t, idx) => ({
      'Sl No': idx + 1,
      'Date': t.date || '',
      'Bank Account': t.bankName || 'Bank',
      'Account Number': bankStore.maskAccountNumber(t.accountNumber),
      'Transaction ID': t.id,
      'Type': t.type,
      'Category': t.category || '',
      'Description': t.description || '',
      'Amount (₹)': Number(t.amount || 0),
      'Running Balance (₹)': t.runningBalance !== undefined ? Number(t.runningBalance) : '-',
      'Payment Method': t.paymentMethod || 'Bank',
      'Reference Type': t.refType || 'MANUAL'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Ledger');
    const filename = `Bank_Ledger_${selectedAccountId !== 'All' ? selectedAccountId : 'All_Accounts'}_${getLocalDateString()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Print Passbook
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container-fluid px-2 px-md-4 py-3 py-md-4 animate-fadeIn">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <MdAccountBalance className="text-primary" size={28} /> Bank Accounts & Central Ledger
            </h3>
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill small fw-semibold">
              Central Financial System
            </span>
          </div>
          <p className="text-muted small mb-0">
            Real-time balance derived from transaction history, passbook ledger, and bank-to-bank transfers
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-md-auto">
          <button
            className="btn btn-outline-secondary rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
            onClick={() => openTransferModal()}
            disabled={accounts.length < 2}
            title={accounts.length < 2 ? 'Add at least 2 bank accounts to transfer' : 'Transfer between accounts'}
          >
            <MdSwapHoriz size={19} /> Bank Transfer
          </button>

          <button
            className="btn btn-outline-success rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
            onClick={() => openAdjustmentModal('Credit')}
            disabled={accounts.length === 0}
          >
            <MdArrowDownward size={18} /> Deposit
          </button>

          <button
            className="btn btn-outline-danger rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
            onClick={() => openAdjustmentModal('Debit')}
            disabled={accounts.length === 0}
          >
            <MdArrowUpward size={18} /> Withdraw
          </button>

          <button
            className="btn btn-primary rounded-3 px-3.5 py-2 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => openAccountModal()}
          >
            <MdAdd size={18} /> Add Bank Account
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Cards */}
      <div className="row g-2 g-md-3 mb-4">
        {/* Card 1: Total Bank Liquidity */}
        <div className="col-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Total Bank Liquidity
              </span>
              <div className="rounded-3 p-2 bg-primary bg-opacity-10 text-primary d-none d-sm-block">
                <MdAccountBalance size={20} />
              </div>
            </div>
            <h3 className={`fw-bold mb-1 ${summary.totalBalance >= 0 ? 'text-primary' : 'text-danger'}`}>
              ₹<AnimatedNumber value={summary.totalBalance} />
            </h3>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.72rem' }}>
              Across {summary.activeAccountsCount} active bank account{summary.activeAccountsCount !== 1 ? 's' : ''}
            </small>
          </div>
        </div>

        {/* Card 2: Total Credits / Inflow */}
        <div className="col-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Month Inflow (Credits)
              </span>
              <div className="rounded-3 p-2 bg-success bg-opacity-10 text-success d-none d-sm-block">
                <MdArrowDownward size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-success mb-1">
              ₹<AnimatedNumber value={summary.monthlyInflow} />
            </h3>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.72rem' }}>
              EMI collections & deposits
            </small>
          </div>
        </div>

        {/* Card 3: Total Debits / Outflow */}
        <div className="col-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Month Outflow (Debits)
              </span>
              <div className="rounded-3 p-2 bg-danger bg-opacity-10 text-danger d-none d-sm-block">
                <MdArrowUpward size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-danger mb-1">
              ₹<AnimatedNumber value={summary.monthlyOutflow} />
            </h3>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.72rem' }}>
              Expenses & disbursements
            </small>
          </div>
        </div>

        {/* Card 4: Bank-to-Bank Transfers */}
        <div className="col-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Month Bank Transfers
              </span>
              <div className="rounded-3 p-2 bg-warning bg-opacity-15 text-dark d-none d-sm-block">
                <MdSwapHoriz size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">
              ₹<AnimatedNumber value={summary.monthlyTransfers} />
            </h3>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.72rem' }}>
              P&L neutral account movements
            </small>
          </div>
        </div>
      </div>

      {/* Bank Accounts Section */}
      <div className="mb-4">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
          <div>
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <MdCreditCard size={22} className="text-primary" /> Managed Bank Accounts ({accounts.length})
            </h5>
            <small className="text-muted">Balances are dynamically computed from transactions</small>
          </div>

          {/* View Mode Toggle Button Group */}
          <div className="btn-group btn-group-sm rounded-3 shadow-2xs border bg-white p-0.5" role="group">
            <button 
              type="button" 
              className={`btn btn-sm px-3 rounded-2 fw-semibold d-flex align-items-center gap-1.5 ${viewMode === 'cards' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'}`}
              onClick={() => handleSetViewMode('cards')}
            >
              <MdViewModule size={16} /> Cards View
            </button>
            <button 
              type="button" 
              className={`btn btn-sm px-3 rounded-2 fw-semibold d-flex align-items-center gap-1.5 ${viewMode === 'table' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'}`}
              onClick={() => handleSetViewMode('table')}
            >
              <MdViewList size={16} /> Table View
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 bg-white text-center">
            <div className="text-muted mb-3 opacity-50">
              <MdAccountBalance size={48} />
            </div>
            <h5 className="fw-bold text-dark mb-1">No Bank Accounts Added Yet</h5>
            <p className="text-muted small mb-4">
              Add your primary bank accounts (SBI, HDFC, ICICI, etc.) or Cash Wallet to link your income, expenses, and loans.
            </p>
            <div>
              <button className="btn btn-primary rounded-3 px-4 fw-bold shadow-sm" onClick={() => openAccountModal()}>
                <MdAdd size={18} className="me-1" /> Add Your First Bank Account
              </button>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div className="row g-3">
            {accounts.map((acc) => {
              const isRevealed = revealedAccounts[acc.id];
              const displayAccNo = isRevealed 
                ? (bankStore.formatAccountNumber(acc.accountNumber) || '•••• •••• •••• 0000') 
                : bankStore.maskAccountNumber(acc.accountNumber);

              const isSelected = selectedAccountId === acc.id;

              return (
                <div key={acc.id} className="col-12 col-md-6 col-xl-4">
                  <div 
                    className="card border-0 rounded-4 text-white position-relative overflow-hidden transition-all shadow-sm"
                    style={{
                      background: acc.bgGradient || 'linear-gradient(135deg, #0b4f8a 0%, #002b52 50%, #001730 100%)',
                      minHeight: '235px',
                      boxShadow: isSelected 
                        ? '0 12px 30px rgba(0, 83, 159, 0.45), 0 0 0 2px #3b82f6' 
                        : '0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    {/* Glassmorphic Sheen Overlay */}
                    <div 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 65%)',
                        pointerEvents: 'none'
                      }}
                    />

                    <div className="p-3.5 p-md-4 d-flex flex-column h-100 position-relative" style={{ zIndex: 1 }}>
                      {/* Top Bar: Badges + Options Dropdown */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          {/* Account Type Badge */}
                          <span 
                            className="badge px-2.5 py-1 rounded-pill small fw-bold text-uppercase"
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.35)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              letterSpacing: '0.6px'
                            }}
                          >
                            {acc.accountType ? `${acc.accountType.toUpperCase()} A/C` : 'SAVINGS A/C'}
                          </span>

                          {/* Default / Primary Badge */}
                          {acc.isDefault && (
                            <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill small fw-bold shadow-2xs" style={{ fontSize: '0.68rem' }}>
                              ★ Primary
                            </span>
                          )}
                        </div>

                        {/* Options Dropdown */}
                        <div className="dropdown">
                          <button 
                            className="btn btn-sm btn-link text-white text-decoration-none p-1 rounded-circle hover-bg-white-10"
                            data-bs-toggle="dropdown"
                            title="Account Options"
                          >
                            <MdMoreVert size={20} />
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow-sm rounded-3 border-0">
                            <li>
                              <button className="dropdown-item d-flex align-items-center gap-2 small" onClick={() => openAccountModal(acc)}>
                                <MdEdit size={16} /> Edit Account Details
                              </button>
                            </li>
                            <li>
                              <button className="dropdown-item d-flex align-items-center gap-2 small" onClick={() => openAdjustmentModal('Credit', acc.id)}>
                                <MdArrowDownward size={16} className="text-success" /> Deposit / Capital
                              </button>
                            </li>
                            <li>
                              <button className="dropdown-item d-flex align-items-center gap-2 small" onClick={() => openAdjustmentModal('Debit', acc.id)}>
                                <MdArrowUpward size={16} className="text-danger" /> Withdraw / Charges
                              </button>
                            </li>
                            {!acc.isDefault && (
                              <li>
                                <button className="dropdown-item d-flex align-items-center gap-2 small" onClick={() => bankStore.setDefaultAccount(acc.id)}>
                                  <MdCheckCircle size={16} className="text-success" /> Set as Default
                                </button>
                              </li>
                            )}
                            <li><hr className="dropdown-divider my-1" /></li>
                            <li>
                              <button className="dropdown-item d-flex align-items-center gap-2 small text-danger" onClick={() => setDeleteConfirm(acc)}>
                                <MdDelete size={16} /> Delete Account
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Middle Row: Bank Name, Chip & Contactless */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="pe-2 overflow-hidden">
                          <h5 className="fw-bold mb-0 text-truncate" title={acc.bankName} style={{ letterSpacing: '-0.3px', fontSize: '1.15rem' }}>
                            {acc.bankName}
                          </h5>
                          <small className="opacity-85 d-block text-truncate" style={{ fontSize: '0.78rem' }}>
                            {acc.branchName ? `${acc.branchName} Branch` : 'General Branch'} {acc.ifscCode ? `• ${acc.ifscCode}` : ''}
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <ContactlessWave />
                          <EmvChip />
                        </div>
                      </div>

                      {/* Card Number Line */}
                      <div className="d-flex align-items-center gap-2 mb-3 mt-1">
                        <span className="font-monospace fw-bold" style={{ fontSize: '1.08rem', letterSpacing: '2.5px', textShadow: '0 2px 4px rgba(0,0,0,0.45)' }}>
                          {displayAccNo}
                        </span>

                        {acc.accountNumber && (
                          <div className="d-flex align-items-center gap-1">
                            <button 
                              className="btn btn-sm btn-link text-white p-0 opacity-75 hover-opacity-100"
                              onClick={() => toggleAccountReveal(acc.id)}
                              title={isRevealed ? 'Mask account number' : 'Show full account number'}
                            >
                              {isRevealed ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                            </button>
                            <button
                              className="btn btn-sm btn-link text-white p-0 opacity-75 hover-opacity-100 ms-1"
                              onClick={() => copyAccountNumber(acc.accountNumber, acc.id)}
                              title="Copy account number"
                            >
                              {copiedId === acc.id ? <MdCheck size={16} className="text-warning" /> : <MdContentCopy size={15} />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Cardholder Name */}
                      <div className="mb-2">
                        <small className="d-block opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.62rem', letterSpacing: '1px' }}>Cardholder</small>
                        <span className="text-uppercase fw-bold text-truncate d-block" style={{ letterSpacing: '1.2px', fontSize: '0.85rem' }}>
                          {acc.accountHolderName || 'ACCOUNT HOLDER'}
                        </span>
                      </div>

                      {/* Bottom Footer: Balance + Quick Buttons */}
                      <div className="mt-auto pt-2 border-top border-white border-opacity-20 d-flex justify-content-between align-items-end flex-wrap gap-2">
                        <div>
                          <small className="d-block opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.8px' }}>Available Balance</small>
                          <h4 className="fw-bold mb-0 text-white" style={{ fontSize: '1.35rem' }}>
                            ₹{Number(acc.currentBalance).toLocaleString('en-IN')}
                          </h4>
                        </div>

                        <div className="d-flex align-items-center gap-1.5 ms-auto">
                          <button 
                            className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all ${
                              isSelected 
                                ? 'btn-light text-dark shadow-xs' 
                                : 'text-white'
                            }`}
                            style={!isSelected ? { background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' } : {}}
                            onClick={() => setSelectedAccountId(isSelected ? 'All' : acc.id)}
                            title="Filter passbook by this bank account"
                          >
                            {isSelected ? '✓ Passbook Active' : 'Passbook'}
                          </button>
                          <button 
                            className="btn btn-sm btn-light rounded-pill px-3 py-1 fw-bold text-dark shadow-2xs hover-lift"
                            onClick={() => openTransferModal(acc.id)}
                            title="Transfer funds from this account"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light text-muted small">
                  <tr>
                    <th className="py-3">Bank Name & Branch</th>
                    <th>Account Holder</th>
                    <th>Account Number</th>
                    <th>Type</th>
                    <th className="text-end">Opening Balance</th>
                    <th className="text-end">Current Balance</th>
                    <th className="text-center">Transactions</th>
                    <th className="text-center">Primary</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => {
                    const isRevealed = revealedAccounts[acc.id];
                    const displayAccNo = isRevealed 
                      ? (acc.accountNumber || 'N/A') 
                      : bankStore.maskAccountNumber(acc.accountNumber);

                    return (
                      <tr key={acc.id} className={selectedAccountId === acc.id ? 'table-primary bg-opacity-25' : ''}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: acc.color || '#00539F' }}></span>
                            <div>
                              <span className="fw-bold text-dark d-block">{acc.bankName}</span>
                              <small className="text-muted">{acc.branchName || 'Main Branch'} {acc.ifscCode ? `(${acc.ifscCode})` : ''}</small>
                            </div>
                          </div>
                        </td>
                        <td className="fw-semibold text-dark small">{acc.accountHolderName}</td>
                        <td className="font-monospace small">
                          <div className="d-flex align-items-center gap-1.5">
                            <span>{displayAccNo}</span>
                            <button 
                              className="btn btn-sm btn-link text-muted p-0"
                              onClick={() => toggleAccountReveal(acc.id)}
                              title={isRevealed ? 'Mask' : 'Reveal'}
                            >
                              {isRevealed ? <MdVisibilityOff size={15} /> : <MdVisibility size={15} />}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2.5 py-1 small fw-semibold">
                            {acc.accountType || 'Savings'}
                          </span>
                        </td>
                        <td className="text-end fw-semibold text-muted font-monospace small">
                          ₹{Number(acc.openingBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-end fw-bold font-monospace text-dark">
                          ₹{Number(acc.currentBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary px-2.5 py-1 rounded-pill small">
                            {acc.transactionCount || 0}
                          </span>
                        </td>
                        <td className="text-center">
                          {acc.isDefault ? (
                            <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill small fw-bold">Primary</span>
                          ) : (
                            <button className="btn btn-sm btn-link text-muted p-0 small text-decoration-none" onClick={() => bankStore.setDefaultAccount(acc.id)}>
                              Set Default
                            </button>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button 
                              className={`btn btn-xs btn-sm rounded-pill px-2.5 py-0.5 small fw-bold ${selectedAccountId === acc.id ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'All' : acc.id)}
                            >
                              Passbook
                            </button>
                            <button className="btn btn-sm btn-outline-secondary rounded-3 p-1" onClick={() => openAccountModal(acc)} title="Edit Account">
                              <MdEdit size={16} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger rounded-3 p-1" onClick={() => setDeleteConfirm(acc)} title="Delete Account">
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Central Ledger / Passbook Section */}
      <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 bg-white">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-3">
          <div>
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2 flex-wrap">
              <MdOutlineAccountBalanceWallet className="text-primary" size={22} />
              {selectedAccountId === 'All' 
                ? 'Central Passbook & Multi-Bank Ledger' 
                : `${accounts.find(a => a.id === selectedAccountId)?.bankName || 'Bank'} Passbook Ledger`}
            </h5>
            <small className="text-muted">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} recorded
            </small>
          </div>

          {/* Filter Toolbar with full responsive wrap */}
          <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-lg-auto">
            {/* Account Selector Filter */}
            <select
              className="form-select form-select-sm rounded-3 fw-semibold flex-grow-1 flex-md-grow-0"
              style={{ minWidth: '160px' }}
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="All">All Bank Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.bankName} ({a.accountNumber ? `..${a.accountNumber.slice(-4)}` : a.accountType})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              className="form-select form-select-sm rounded-3 flex-grow-1 flex-md-grow-0"
              style={{ minWidth: '120px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Credit">Credits (+) Inflow</option>
              <option value="Debit">Debits (-) Outflow</option>
              <option value="Transfer">Bank Transfers</option>
            </select>

            {/* Date Filter */}
            <select
              className="form-select form-select-sm rounded-3 flex-grow-1 flex-md-grow-0"
              style={{ minWidth: '110px' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>

            {/* Search Input */}
            <div className="input-group input-group-sm flex-grow-1 flex-md-grow-0" style={{ minWidth: '160px', maxWidth: '220px' }}>
              <span className="input-group-text bg-light border-end-0"><MdSearch size={16} /></span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search passbook..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Export & Print */}
            <div className="d-flex gap-1.5 ms-auto ms-md-0">
              <button className="btn btn-sm btn-outline-success rounded-3 d-flex align-items-center gap-1" onClick={exportToExcel} title="Export to Excel (.xlsx)">
                <MdFileDownload size={16} /> Excel
              </button>
              <button className="btn btn-sm btn-outline-secondary rounded-3 d-flex align-items-center gap-1" onClick={handlePrint} title="Print Passbook">
                <MdPrint size={16} /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-muted small">
              <tr>
                <th className="py-2.5">Date</th>
                <th>Bank Account</th>
                <th>Category / Source</th>
                <th>Description</th>
                <th>Method / Ref</th>
                <th className="text-end">Amount (₹)</th>
                {selectedAccountId !== 'All' && <th className="text-end">Running Balance</th>}
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={selectedAccountId !== 'All' ? 8 : 7} className="text-center py-5 text-muted">
                    <p className="mb-0">No bank transactions found matching the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'Credit' || tx.type === 'Transfer_In';
                  const isTransfer = tx.type === 'Transfer_In' || tx.type === 'Transfer_Out';

                  return (
                    <tr key={tx.id}>
                      {/* Date */}
                      <td className="text-nowrap small fw-semibold text-dark">
                        {formatIndianDate(tx.date)}
                      </td>

                      {/* Bank Name & Masked Number */}
                      <td>
                        <div className="fw-bold text-dark small">{tx.bankName || 'Bank'}</div>
                        <small className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>
                          {bankStore.maskAccountNumber(tx.accountNumber)}
                        </small>
                      </td>

                      {/* Category / Source Badge */}
                      <td>
                        <span className={`badge rounded-pill px-2.5 py-1 small fw-semibold ${
                          isTransfer ? 'bg-warning bg-opacity-15 text-dark border border-warning border-opacity-25' :
                          isCredit ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' :
                          'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                        }`}>
                          {tx.category || tx.type}
                        </span>
                        {tx.refType && tx.refType !== 'MANUAL' && (
                          <span className="badge bg-light text-secondary border ms-1" style={{ fontSize: '0.65rem' }}>
                            {tx.refType.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="small text-secondary" style={{ maxWidth: '280px' }}>
                        <div className="text-truncate" title={tx.description || tx.notes}>
                          {tx.description || '-'}
                        </div>
                        {tx.notes && <small className="text-muted d-block">{tx.notes}</small>}
                      </td>

                      {/* Method / Ref */}
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                          {tx.paymentMethod || 'Bank'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="text-end fw-bold">
                        <span className={isCredit ? 'text-success' : 'text-danger'}>
                          {isCredit ? '+' : '-'} ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Running Balance (shown for individual account view) */}
                      {selectedAccountId !== 'All' && (
                        <td className="text-end fw-semibold text-dark font-monospace small">
                          ₹{Number(tx.runningBalance || 0).toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Action */}
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this bank transaction? Balance will automatically recalculate.')) {
                              bankStore.deleteTransaction(tx.id);
                            }
                          }}
                          title="Delete transaction & recalculate balance"
                        >
                          <MdDelete size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD / EDIT BANK ACCOUNT MODAL */}
      {/* ========================================== */}
      {showAccountModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdAccountBalance className="text-primary" /> {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
              </div>

              <form onSubmit={handleSaveAccount}>
                <div className="modal-body p-4">
                  {/* Quick Preset Selector */}
                  <label className="form-label small fw-semibold text-muted mb-2">Select Bank / Preset Theme</label>
                  <div className="d-flex flex-wrap gap-1.5 mb-3" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                    {BANK_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        className={`btn btn-sm rounded-pill px-2.5 py-1 ${accountForm.bankName === preset.name ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleBankPresetSelect(preset)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {preset.shortName}
                      </button>
                    ))}
                  </div>

                  <div className="row g-3">
                    {/* Bank Name */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Bank Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. State Bank of India"
                        value={accountForm.bankName}
                        onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                        required
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Account Holder Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Rahul Chauhan"
                        value={accountForm.accountHolderName}
                        onChange={(e) => setAccountForm({ ...accountForm, accountHolderName: e.target.value })}
                        required
                      />
                    </div>

                    {/* Account Number */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Account Number (Masked in UI)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. 50100458921123"
                        value={accountForm.accountNumber}
                        onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                      />
                    </div>

                    {/* Account Type */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Account Type</label>
                      <select
                        className="form-select"
                        value={accountForm.accountType}
                        onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
                      >
                        {ACCOUNT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* IFSC Code */}
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">IFSC Code (Optional)</label>
                      <input
                        type="text"
                        className="form-control text-uppercase"
                        placeholder="e.g. SBIN0001234"
                        value={accountForm.ifscCode}
                        onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value.toUpperCase() })}
                      />
                    </div>

                    {/* Branch Name */}
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Branch Name (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Main Branch"
                        value={accountForm.branchName}
                        onChange={(e) => setAccountForm({ ...accountForm, branchName: e.target.value })}
                      />
                    </div>

                    {/* Opening Balance */}
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Opening Balance (₹)</label>
                      <input
                        type="number"
                        className="form-control fw-bold"
                        placeholder="0"
                        value={accountForm.openingBalance}
                        onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                      />
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>
                        Initial starting amount
                      </small>
                    </div>

                    {/* Default Account Switch */}
                    <div className="col-12">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isDefaultAccount"
                          checked={accountForm.isDefault}
                          onChange={(e) => setAccountForm({ ...accountForm, isDefault: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold text-dark" htmlFor="isDefaultAccount">
                          Set as Primary / Default Bank Account for automated receipts & payments
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setShowAccountModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 fw-bold shadow-sm">
                    {editingAccount ? 'Update Bank Account' : 'Save Bank Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* BANK-TO-BANK TRANSFER MODAL */}
      {/* ========================================== */}
      {showTransferModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdSwapHoriz className="text-primary" size={24} /> Bank-to-Bank Transfer
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowTransferModal(false)}></button>
              </div>

              <form onSubmit={handleExecuteTransfer}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* From Bank */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">From Bank Account *</label>
                      <select
                        className="form-select"
                        value={transferForm.fromBankId}
                        onChange={(e) => setTransferForm({ ...transferForm, fromBankId: e.target.value })}
                        required
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.bankName} (₹{Number(a.currentBalance).toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* To Bank */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">To Bank Account *</label>
                      <select
                        className="form-select"
                        value={transferForm.toBankId}
                        onChange={(e) => setTransferForm({ ...transferForm, toBankId: e.target.value })}
                        required
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id} disabled={a.id === transferForm.fromBankId}>
                            {a.bankName} (₹{Number(a.currentBalance).toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Transfer Amount */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Transfer Amount (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control form-control-lg fw-bold"
                          placeholder="0"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                          required
                          autoFocus
                        />
                      </div>
                      {/* Quick Amount Pills */}
                      <div className="d-flex gap-1.5 mt-2 flex-wrap">
                        {[5000, 10000, 25000, 50000].map(amt => (
                          <button
                            type="button"
                            key={amt}
                            className="btn btn-sm btn-light border rounded-pill px-2.5 py-0.5 small"
                            onClick={() => setTransferForm({ ...transferForm, amount: amt.toString() })}
                          >
                            +₹{amt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold text-muted mb-0">Transfer Date *</label>
                        {getLastEntryDate('bank') && getLastEntryDate('bank') !== getLocalDateString() && (
                          <span
                            className="badge bg-light text-primary border"
                            style={{ fontSize: '0.62rem', cursor: 'pointer' }}
                            onClick={() => setTransferForm({ ...transferForm, date: getLastEntryDate('bank') })}
                            title="Click to use Last Entry Date"
                          >
                            Last: {formatIndianDate(getLastEntryDate('bank'))}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        className="form-control"
                        value={transferForm.date}
                        onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                        required
                      />
                      <div className="d-flex gap-1 mt-1">
                        <button 
                          type="button" 
                          className={`btn btn-xs py-0 px-1.5 rounded-pill ${transferForm.date === getLocalDateString() ? 'btn-primary' : 'btn-light border text-muted'}`}
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => setTransferForm({ ...transferForm, date: getLocalDateString() })}
                        >
                          Today
                        </button>
                        {getLastEntryDate('bank') && getLastEntryDate('bank') !== getLocalDateString() && (
                          <button 
                            type="button" 
                            className={`btn btn-xs py-0 px-1.5 rounded-pill ${transferForm.date === getLastEntryDate('bank') ? 'btn-primary' : 'btn-light border text-muted'}`}
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => setTransferForm({ ...transferForm, date: getLastEntryDate('bank') })}
                          >
                            Last Date
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Reference / Note</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Funds allocation, ATM load"
                        value={transferForm.description}
                        onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="alert alert-info py-2 px-3 small mt-3 mb-0 rounded-3 border-0">
                    💡 <strong>Note:</strong> Bank-to-Bank transfers do NOT count as income or expenses in P&L reports.
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setShowTransferModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 fw-bold shadow-sm">
                    Execute Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DIRECT ADJUSTMENT (DEPOSIT / WITHDRAWAL) MODAL */}
      {/* ========================================== */}
      {showAdjustmentModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  {adjustmentType === 'Credit' ? (
                    <><MdArrowDownward className="text-success" size={24} /> Direct Bank Deposit</>
                  ) : (
                    <><MdArrowUpward className="text-danger" size={24} /> Direct Bank Withdrawal</>
                  )}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAdjustmentModal(false)}></button>
              </div>

              <form onSubmit={handleSaveAdjustment}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Bank Account */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Target Bank Account *</label>
                      <select
                        className="form-select"
                        value={adjustmentForm.bankAccountId}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, bankAccountId: e.target.value })}
                        required
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.bankName} ({a.accountNumber ? `..${a.accountNumber.slice(-4)}` : a.accountType}) - Current: ₹{Number(a.currentBalance).toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Amount (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control form-control-lg fw-bold"
                          placeholder="0"
                          value={adjustmentForm.amount}
                          onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Category</label>
                      <select
                        className="form-select"
                        value={adjustmentForm.category}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, category: e.target.value })}
                      >
                        {adjustmentType === 'Credit' ? (
                          <>
                            <option value="Direct Deposit / Capital">Owner Capital / Equity</option>
                            <option value="Interest Received">Bank Interest Received</option>
                            <option value="Refund / Cashback">Refund / Cashback</option>
                            <option value="Other Credit">Other Direct Credit</option>
                          </>
                        ) : (
                          <>
                            <option value="Direct Withdrawal / Cash">Cash Withdrawal</option>
                            <option value="Bank Charges / SMS Fee">Bank Charges / SMS Fee</option>
                            <option value="Taxes / TDS">Tax / TDS Deduction</option>
                            <option value="Other Debit">Other Direct Debit</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold text-muted mb-0">Date *</label>
                        {getLastEntryDate('bank') && getLastEntryDate('bank') !== getLocalDateString() && (
                          <span
                            className="badge bg-light text-primary border"
                            style={{ fontSize: '0.62rem', cursor: 'pointer' }}
                            onClick={() => setAdjustmentForm({ ...adjustmentForm, date: getLastEntryDate('bank') })}
                            title="Click to use Last Entry Date"
                          >
                            Last: {formatIndianDate(getLastEntryDate('bank'))}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        className="form-control"
                        value={adjustmentForm.date}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                        required
                      />
                      <div className="d-flex gap-1 mt-1">
                        <button 
                          type="button" 
                          className={`btn btn-xs py-0 px-1.5 rounded-pill ${adjustmentForm.date === getLocalDateString() ? 'btn-primary' : 'btn-light border text-muted'}`}
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => setAdjustmentForm({ ...adjustmentForm, date: getLocalDateString() })}
                        >
                          Today
                        </button>
                        {getLastEntryDate('bank') && getLastEntryDate('bank') !== getLocalDateString() && (
                          <button 
                            type="button" 
                            className={`btn btn-xs py-0 px-1.5 rounded-pill ${adjustmentForm.date === getLastEntryDate('bank') ? 'btn-primary' : 'btn-light border text-muted'}`}
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => setAdjustmentForm({ ...adjustmentForm, date: getLastEntryDate('bank') })}
                          >
                            Last Date
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Description / Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Added capital from personal savings"
                        value={adjustmentForm.description}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setShowAdjustmentModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className={`btn rounded-3 px-4 fw-bold shadow-sm ${adjustmentType === 'Credit' ? 'btn-success' : 'btn-danger'}`}
                  >
                    Record {adjustmentType === 'Credit' ? 'Deposit' : 'Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
              <div className="text-danger mb-2">
                <MdDelete size={40} />
              </div>
              <h5 className="fw-bold text-dark mb-1">Delete Bank Account?</h5>
              <p className="text-muted small mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.bankName}</strong>? This will remove all associated passbook transactions.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  className="btn btn-danger rounded-3 px-3 fw-bold"
                  onClick={() => {
                    bankStore.deleteAccount(deleteConfirm.id);
                    setDeleteConfirm(null);
                  }}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
