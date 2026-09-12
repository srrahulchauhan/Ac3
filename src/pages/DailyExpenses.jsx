import React, { useState, useEffect, useMemo } from 'react';
import { 
  MdAttachMoney, MdDateRange, MdDescription, MdEdit, MdDelete, 
  MdWarning, MdAdd, MdSearch, MdFilterList, MdTrendingDown, 
  MdAccountBalanceWallet, MdCheckCircle, MdSettings, MdShoppingBag, 
  MdRestaurant, MdDirectionsCar, MdReceipt, MdLocalHospital, MdMoreHoriz,
  MdClose, MdSave, MdRefresh, MdViewList, MdViewModule, MdAccountBalance
} from 'react-icons/md';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { getLocalDateString, formatIndianDate, getLastEntryDate, setLastEntryDate } from '../utils/dateUtils';
import { bankStore } from '../utils/bankStore';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend
);

const LOCAL_STORAGE_EXPENSES_KEY = 'daily_expenses_tracker';
const LOCAL_STORAGE_BUDGET_KEY = 'daily_expense_budget_limit';

const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: <MdRestaurant size={18} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'Travel', label: 'Travel & Transport', icon: <MdDirectionsCar size={18} />, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'Shopping', label: 'Shopping', icon: <MdShoppingBag size={18} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'Bills', label: 'Bills & Utilities', icon: <MdReceipt size={18} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'Health', label: 'Health & Medical', icon: <MdLocalHospital size={18} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  { id: 'Other', label: 'Other Expenses', icon: <MdMoreHoriz size={18} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
];

const getCategoryMeta = (catId) => {
  return CATEGORIES.find(c => c.id === catId) || CATEGORIES[5];
};

const DailyExpenses = () => {
  // State
  const [expenses, setExpenses] = useState([]);
  const [dailyBudget, setDailyBudget] = useState(0); // Default ₹0 for fresh users until configured
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(0);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rc_view_expenses') || (window.innerWidth >= 768 ? 'table' : 'cards');
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rc_view_expenses', mode);
  };

  // Form State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    date: getLocalDateString(),
    bankAccountId: '',
    paymentMethod: 'UPI',
    notes: ''
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('Today'); // 'Today', 'This Week', 'This Month', 'All'

  // Load from Local Storage & bank accounts
  const loadBankAccounts = () => {
    setBankAccounts(bankStore.getAccounts());
  };

  useEffect(() => {
    loadBankAccounts();
    window.addEventListener('bankStoreUpdated', loadBankAccounts);
    return () => window.removeEventListener('bankStoreUpdated', loadBankAccounts);
  }, []);

  useEffect(() => {
    try {
      const savedExpenses = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      } else {
        setExpenses([]);
        localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify([]));
      }

      const savedBudget = localStorage.getItem(LOCAL_STORAGE_BUDGET_KEY);
      if (savedBudget !== null && savedBudget !== undefined) {
        const b = Number(savedBudget);
        setDailyBudget(b);
        setTempBudget(b);
      } else {
        setDailyBudget(0);
        setTempBudget(0);
      }
    } catch (e) {
      console.error("Failed to load daily expenses data", e);
    }
  }, []);

  // Helper to save expenses
  const saveExpensesToStorage = (updated) => {
    setExpenses(updated);
    localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
  };

  // Helper to save budget limit
  const handleSaveBudget = () => {
    const b = Math.max(0, Number(tempBudget) || 0);
    setDailyBudget(b);
    localStorage.setItem(LOCAL_STORAGE_BUDGET_KEY, b.toString());
    setEditingBudget(false);
  };

  // Open modal for new expense
  const handleOpenAddModal = (cat = 'Food') => {
    const defBank = bankStore.getDefaultAccount()?.id || bankAccounts[0]?.id || '';
    setEditingId(null);
    setFormData({
      amount: '',
      category: cat,
      date: getLastEntryDate('expenses', getLocalDateString()),
      bankAccountId: defBank,
      paymentMethod: 'UPI',
      notes: ''
    });
    setShowFormModal(true);
  };

  // Open modal for editing
  const handleEditClick = (expense) => {
    const defBank = expense.bankAccountId || bankStore.getDefaultAccount()?.id || bankAccounts[0]?.id || '';
    setEditingId(expense.id);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      bankAccountId: defBank,
      paymentMethod: expense.paymentMethod || 'UPI',
      notes: expense.notes || ''
    });
    setShowFormModal(true);
  };

  // Delete expense
  const handleDeleteClick = (id) => {
    if (window.confirm("Are you sure you want to delete this expense record?")) {
      const updated = expenses.filter(e => e.id !== id);
      saveExpensesToStorage(updated);
      bankStore.deleteModuleTransactions('EXPENSE', id);
    }
  };

  // Form submit handler
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const val = Number(formData.amount);
    if (!val || val <= 0) {
      alert("Please enter a valid expense amount greater than 0");
      return;
    }

    const selectedBankId = formData.bankAccountId || bankStore.getDefaultAccount()?.id || null;

    // Remember last used entry date
    setLastEntryDate('expenses', formData.date);

    if (editingId) {
      const updated = expenses.map(item => {
        if (item.id === editingId) {
          return { 
            ...item, 
            amount: val, 
            category: formData.category, 
            date: formData.date,
            bankAccountId: selectedBankId,
            paymentMethod: formData.paymentMethod, 
            notes: formData.notes 
          };
        }
        return item;
      });
      saveExpensesToStorage(updated);

      if (selectedBankId) {
        bankStore.syncModuleTransaction('EXPENSE', editingId, {
          bankAccountId: selectedBankId,
          type: 'Debit',
          amount: val,
          date: formData.date,
          category: `Expense - ${formData.category}`,
          description: formData.notes || `${formData.category} Expense`,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes
        });
      }
    } else {
      const newExpId = Date.now().toString();
      const newExp = {
        id: newExpId,
        amount: val,
        category: formData.category,
        date: formData.date,
        bankAccountId: selectedBankId,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      };
      saveExpensesToStorage([newExp, ...expenses]);

      if (selectedBankId) {
        bankStore.syncModuleTransaction('EXPENSE', newExpId, {
          bankAccountId: selectedBankId,
          type: 'Debit',
          amount: val,
          date: formData.date,
          category: `Expense - ${formData.category}`,
          description: formData.notes || `${formData.category} Expense`,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes
        });
      }
    }

    setShowFormModal(false);
  };

  // Metrics Calculations
  const todayStr = getLocalDateString();
  const todayExpenses = useMemo(() => expenses.filter(e => e.date === todayStr), [expenses, todayStr]);
  const todaySpending = useMemo(() => todayExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0), [todayExpenses]);
  const remainingBudget = dailyBudget > 0 ? (dailyBudget - todaySpending) : 0;
  const isBudgetExceeded = dailyBudget > 0 && remainingBudget < 0;
  const budgetUsagePct = dailyBudget > 0 ? Math.min(100, Math.round((todaySpending / dailyBudget) * 100)) : 0;

  const thisMonthStr = todayStr.substring(0, 7);
  const monthlyExpenses = useMemo(() => expenses.filter(e => (e.date || '').startsWith(thisMonthStr)), [expenses, thisMonthStr]);
  const monthlySpending = useMemo(() => monthlyExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0), [monthlyExpenses]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = !searchTerm || 
        exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = categoryFilter === 'All' || exp.category === categoryFilter;

      let matchesDate = true;
      if (dateFilter === 'Today') {
        matchesDate = exp.date === todayStr;
      } else if (dateFilter === 'This Week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        matchesDate = new Date(exp.date) >= d;
      } else if (dateFilter === 'This Month') {
        matchesDate = (exp.date || '').startsWith(thisMonthStr);
      }

      return matchesSearch && matchesCat && matchesDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, searchTerm, categoryFilter, dateFilter, todayStr, thisMonthStr]);

  // Category Breakdown for Doughnut Chart
  const categoryTotals = useMemo(() => {
    const totals = {};
    CATEGORIES.forEach(c => totals[c.id] = 0);
    monthlyExpenses.forEach(e => {
      if (totals[e.category] !== undefined) {
        totals[e.category] += Number(e.amount);
      } else {
        totals['Other'] = (totals['Other'] || 0) + Number(e.amount);
      }
    });
    return totals;
  }, [monthlyExpenses]);

  const doughnutData = {
    labels: CATEGORIES.map(c => c.label),
    datasets: [
      {
        data: CATEGORIES.map(c => categoryTotals[c.id]),
        backgroundColor: CATEGORIES.map(c => c.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Weekly Trend Chart (Last 7 Days)
  const last7DaysData = useMemo(() => {
    const days = [];
    const amounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = getLocalDateString(d);
      const dayTotal = expenses.filter(e => e.date === str).reduce((acc, curr) => acc + Number(curr.amount), 0);
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      amounts.push(dayTotal);
    }
    return { days, amounts };
  }, [expenses]);

  const barChartData = {
    labels: last7DaysData.days,
    datasets: [
      {
        label: 'Daily Expenses (₹)',
        data: last7DaysData.amounts,
        backgroundColor: 'rgba(14, 165, 233, 0.85)',
        hoverBackgroundColor: '#0ea5e9',
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4 bg-light page-transition" style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      
      {/* Header & Quick Action */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <span className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
              <MdAccountBalanceWallet size={24} />
            </span>
            Daily Expense Tracker
          </h4>
          <p className="text-muted small mb-0">Record, organize, and control your daily personal & business outgoing expenses</p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="btn-group bg-white rounded-3 border p-0.5 shadow-2xs">
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1.5 fw-bold ${viewMode === 'table' ? 'btn-primary' : 'btn-light text-muted'}`}
              onClick={() => handleSetViewMode('table')}
              title="Table View"
            >
              <MdViewList size={18} /> Table
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1.5 fw-bold ${viewMode === 'cards' ? 'btn-primary' : 'btn-light text-muted'}`}
              onClick={() => handleSetViewMode('cards')}
              title="Cards View"
            >
              <MdViewModule size={18} /> Cards
            </button>
          </div>

          <button 
            className="btn text-white px-3 py-2 fw-bold shadow-sm d-flex align-items-center gap-1.5 rounded-3"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)', border: 'none' }}
            onClick={() => handleOpenAddModal()}
            title="Add New Daily Expense"
          >
            <MdAdd size={20} /> Add Expense
          </button>
        </div>
      </div>

      {/* Budget Warning Alert (When limit exceeded) */}
      {isBudgetExceeded && (
        <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center justify-content-between animate-fadeIn" style={{ background: '#fef2f2', borderLeft: '5px solid #ef4444' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="bg-danger bg-opacity-10 text-danger p-2 rounded-circle">
              <MdWarning size={28} />
            </div>
            <div>
              <h6 className="fw-bold text-danger mb-0">⚠️ Daily Budget Limit Exceeded!</h6>
              <p className="small text-secondary mb-0">
                You have spent <strong className="text-danger">₹{todaySpending.toLocaleString('en-IN')}</strong> today, exceeding your daily limit of <strong>₹{dailyBudget.toLocaleString('en-IN')}</strong> by <strong className="text-danger">₹{Math.abs(remainingBudget).toLocaleString('en-IN')}</strong>.
              </p>
            </div>
          </div>
          <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => handleOpenAddModal()}>Manage</button>
        </div>
      )}

      {/* Top Spending & Budget Metrics Cards */}
      <div className="row g-3 g-lg-4 mb-4">
        {/* Today's Total Card */}
        <div className="col-6 col-lg-3">
          <div 
            className={`card modern-card p-3 p-lg-4 h-100 border-0 shadow-sm hover-lift transition-all cursor-pointer ${dateFilter === 'Today' ? 'ring-2 ring-emerald-500' : ''}`}
            style={{ borderTop: '4px solid #10b981', cursor: 'pointer' }}
            onClick={() => setDateFilter('Today')}
            title="Click to filter Today's expenses"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <p className="text-muted small mb-1 fw-semibold">Today's Spending</p>
                <h3 className="fw-bold mb-0 text-success">₹{todaySpending.toLocaleString('en-IN')}</h3>
              </div>
              <div className="p-3 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <MdTrendingDown size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Budget Card */}
        <div className="col-6 col-lg-3">
          <div 
            className="card modern-card p-3 p-lg-4 h-100 border-0 shadow-sm hover-lift transition-all cursor-pointer"
            style={{ borderTop: '4px solid #0ea5e9', cursor: 'pointer' }}
            onClick={() => { setEditingBudget(true); setTempBudget(dailyBudget || ''); }}
            title="Click to edit Daily Budget Limit"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <p className="text-muted small mb-1 fw-semibold">Daily Budget</p>
                <h3 className="fw-bold mb-0 text-primary">
                  {dailyBudget > 0 ? `₹${dailyBudget.toLocaleString('en-IN')}` : '₹0'}
                </h3>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                  {dailyBudget > 0 ? 'Click to edit limit' : 'Click to set limit'}
                </small>
              </div>
              <div className="p-3 rounded-3" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                <MdAccountBalanceWallet size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Balance Card */}
        <div className="col-6 col-lg-3">
          <div 
            className="card modern-card p-3 p-lg-4 h-100 border-0 shadow-sm hover-lift transition-all cursor-pointer"
            style={{ borderTop: `4px solid ${remainingBudget < 0 ? '#ef4444' : '#8b5cf6'}`, cursor: 'pointer' }}
            onClick={() => { setEditingBudget(true); setTempBudget(dailyBudget || ''); }}
            title="Click to adjust Daily Budget"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <p className="text-muted small mb-1 fw-semibold">Remaining Balance</p>
                <h3 className={`fw-bold mb-0 ${remainingBudget < 0 ? 'text-danger' : 'text-purple'}`} style={{ color: remainingBudget < 0 ? '#ef4444' : '#8b5cf6' }}>
                  {dailyBudget > 0 ? `₹${remainingBudget.toLocaleString('en-IN')}` : '₹0'}
                </h3>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                  {dailyBudget > 0 ? (isBudgetExceeded ? 'Limit exceeded' : 'Available today') : 'No budget set'}
                </small>
              </div>
              <div className="p-3 rounded-3" style={{ background: remainingBudget < 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(139, 92, 246, 0.12)', color: remainingBudget < 0 ? '#ef4444' : '#8b5cf6' }}>
                <MdCheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Summary Card */}
        <div className="col-6 col-lg-3">
          <div 
            className={`card modern-card p-3 p-lg-4 h-100 border-0 shadow-sm hover-lift transition-all cursor-pointer ${dateFilter === 'This Month' ? 'ring-2 ring-amber-500' : ''}`}
            style={{ borderTop: '4px solid #f59e0b', cursor: 'pointer' }}
            onClick={() => setDateFilter('This Month')}
            title="Click to filter This Month's expenses"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <p className="text-muted small mb-1 fw-semibold">This Month Spending</p>
                <h3 className="fw-bold mb-0 text-warning">₹{monthlySpending.toLocaleString('en-IN')}</h3>
              </div>
              <div className="p-3 rounded-3" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <MdReceipt size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="card modern-card p-3 mb-4 border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="small fw-bold text-muted text-uppercase" style={{ letterSpacing: '0.5px' }}>
            Daily Budget Usage ({dailyBudget > 0 ? `${budgetUsagePct}%` : 'Not Configured'})
          </span>
          <span className={`badge rounded-pill ${isBudgetExceeded ? 'bg-danger' : 'bg-success'}`}>
            ₹{todaySpending.toLocaleString('en-IN')} / {dailyBudget > 0 ? `₹${dailyBudget.toLocaleString('en-IN')}` : 'No limit'}
          </span>
        </div>
        <div className="progress" style={{ height: 10, borderRadius: 5 }}>
          <div 
            className={`progress-bar ${isBudgetExceeded ? 'bg-danger' : budgetUsagePct > 80 ? 'bg-warning' : 'bg-success'}`}
            role="progressbar"
            style={{ width: `${dailyBudget > 0 ? budgetUsagePct : 0}%` }}
          ></div>
        </div>
      </div>

      {/* Expense List & Search/Filter Section */}
      <div className="card modern-card border-0 shadow-sm overflow-hidden mb-4">
        <div className="p-3 p-md-4 border-bottom bg-light bg-opacity-40">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <h5 className="fw-bold mb-0 text-dark">Recent Daily Expenses</h5>

            {/* Filters */}
            <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-md-auto">
              <div className="input-group input-group-sm flex-grow-1" style={{ minWidth: '180px', maxWidth: '250px' }}>
                <span className="input-group-text bg-white border-end-0"><MdSearch size={16} /></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-0" 
                  placeholder="Search notes or category..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="form-select form-select-sm" 
                style={{ width: 'auto' }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <div className="btn-group btn-group-sm">
                {['Today', 'This Week', 'This Month', 'All'].map(df => (
                  <button 
                    key={df}
                    type="button" 
                    className={`btn btn-sm ${dateFilter === df ? 'btn-primary fw-bold' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => setDateFilter(df)}
                  >
                    {df}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Content: Table or Cards View */}
        {viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-muted small text-uppercase">
                  <th className="px-4 py-3">Category</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Notes / Description</th>
                  <th className="py-3 text-end">Amount</th>
                  <th className="py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      No expense records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const catMeta = getCategoryMeta(exp.category);
                    return (
                      <tr key={exp.id}>
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 36, height: 36, background: catMeta.bg, color: catMeta.color }}
                            >
                              {catMeta.icon}
                            </div>
                            <div>
                              <span className="fw-bold d-block text-dark small">{exp.category}</span>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>{catMeta.label}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                            {formatIndianDate(exp.date)}
                          </span>
                        </td>
                        <td>
                          <span className="text-dark small">{exp.notes || '—'}</span>
                        </td>
                        <td className="text-end">
                          <span className="fw-bold text-dark font-monospace">₹{exp.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1.5 justify-content-center">
                            <button 
                              className="btn btn-outline-primary btn-sm rounded-circle p-1"
                              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleEditClick(exp)}
                              title="Edit Expense"
                              aria-label="Edit Expense"
                            >
                              <MdEdit size={16} />
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-sm rounded-circle p-1"
                              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleDeleteClick(exp.id)}
                              title="Delete Expense"
                              aria-label="Delete Expense"
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS VIEW */
          <div className="p-3">
            <div className="row g-3">
              {filteredExpenses.length === 0 ? (
                <div className="col-12 text-center py-5 text-muted">
                  No expense records found for the selected filter.
                </div>
              ) : (
                filteredExpenses.map((exp) => {
                  const catMeta = getCategoryMeta(exp.category);
                  return (
                    <div key={exp.id} className="col-12 col-sm-6 col-lg-4">
                      <div className="card border rounded-3 p-3 bg-white h-100 shadow-2xs position-relative hover-lift">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 36, height: 36, background: catMeta.bg, color: catMeta.color }}
                            >
                              {catMeta.icon}
                            </div>
                            <div>
                              <span className="fw-bold d-block text-dark small">{exp.category}</span>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>{formatIndianDate(exp.date)}</small>
                            </div>
                          </div>

                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-sm btn-light rounded-circle p-1 border text-secondary"
                              onClick={() => handleEditClick(exp)}
                              title="Edit Expense"
                              aria-label="Edit Expense"
                            >
                              <MdEdit size={14} />
                            </button>
                            <button 
                              className="btn btn-sm btn-light rounded-circle p-1 border text-danger"
                              onClick={() => handleDeleteClick(exp.id)}
                              title="Delete Expense"
                              aria-label="Delete Expense"
                            >
                              <MdDelete size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="my-2">
                          <p className="text-muted small mb-1">{exp.notes || 'No description notes'}</p>
                          <h4 className="fw-bold text-dark mb-0">₹{exp.amount.toLocaleString('en-IN')}</h4>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showFormModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdAccountBalanceWallet className="text-primary" />
                  {editingId ? 'Edit Expense' : 'Add New Daily Expense'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowFormModal(false)}></button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="modal-body py-3">
                  {/* Amount */}
                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small mb-1">Amount (₹)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted fw-bold">₹</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control form-control-lg fw-bold" 
                        placeholder="0.00" 
                        value={formData.amount} 
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        required 
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small mb-1">Category</label>
                    <div className="row g-2">
                      {CATEGORIES.map(cat => (
                        <div className="col-4" key={cat.id}>
                          <div 
                            className={`p-2 rounded-3 border text-center cursor-pointer transition-all ${formData.category === cat.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-light hover-bg-white'}`}
                            onClick={() => setFormData({ ...formData, category: cat.id })}
                            style={{ cursor: 'pointer' }}
                          >
                            <div style={{ color: cat.color }}>{cat.icon}</div>
                            <span className="small fw-semibold d-block mt-1 text-truncate">{cat.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paid From Bank Account */}
                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small mb-1 d-flex align-items-center gap-1">
                      <MdAccountBalance size={16} className="text-primary" /> Paid From Bank Account
                    </label>
                    <select
                      className="form-select"
                      value={formData.bankAccountId}
                      onChange={e => setFormData({ ...formData, bankAccountId: e.target.value })}
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.accountNumber ? `..${b.accountNumber.slice(-4)}` : b.accountType}) - Bal: ₹{Number(b.currentBalance).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted" style={{ fontSize: '0.68rem' }}>
                      Automatically decreases the selected bank balance
                    </small>
                  </div>

                  {/* Date & Payment Method */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label text-muted fw-semibold small mb-0">Date</label>
                        {getLastEntryDate('expenses') && getLastEntryDate('expenses') !== getLocalDateString() && (
                          <span 
                            className="badge bg-light text-primary border cursor-pointer" 
                            style={{ fontSize: '0.65rem', cursor: 'pointer' }}
                            onClick={() => setFormData({ ...formData, date: getLastEntryDate('expenses') })}
                            title="Click to use Last Entry Date"
                          >
                            Last: {formatIndianDate(getLastEntryDate('expenses'))}
                          </span>
                        )}
                      </div>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.date} 
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required 
                      />
                      <div className="d-flex gap-1 mt-1">
                        <button 
                          type="button" 
                          className={`btn btn-xs py-0 px-1.5 rounded-pill ${formData.date === getLocalDateString() ? 'btn-primary' : 'btn-light border text-muted'}`}
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => setFormData({ ...formData, date: getLocalDateString() })}
                        >
                          Today
                        </button>
                        {getLastEntryDate('expenses') && getLastEntryDate('expenses') !== getLocalDateString() && (
                          <button 
                            type="button" 
                            className={`btn btn-xs py-0 px-1.5 rounded-pill ${formData.date === getLastEntryDate('expenses') ? 'btn-primary' : 'btn-light border text-muted'}`}
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => setFormData({ ...formData, date: getLastEntryDate('expenses') })}
                          >
                            Last Date ({formatIndianDate(getLastEntryDate('expenses'))})
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-muted fw-semibold small mb-1">Payment Method</label>
                      <select 
                        className="form-select"
                        value={formData.paymentMethod}
                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>


                  {/* Notes */}
                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small mb-1">Notes / Description (Optional)</label>
                    <textarea 
                      className="form-control" 
                      rows="2" 
                      placeholder="e.g. Lunch thali, Uber to office, Grocery shopping..."
                      value={formData.notes} 
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowFormModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="btn text-white rounded-pill px-4 fw-bold shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)', border: 'none' }}
                  >
                    {editingId ? 'Update Expense' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Daily Budget Modal */}
      {editingBudget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <span className="p-1.5 bg-primary bg-opacity-10 text-primary rounded-3">
                    <MdAccountBalanceWallet size={20} />
                  </span>
                  Set Daily Budget
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingBudget(false)}></button>
              </div>

              <div className="modal-body py-3">
                <p className="text-muted small mb-3">Set your target spending limit per day to stay on budget and receive alerts.</p>
                <label className="form-label text-muted fw-semibold small mb-1">Daily Limit (₹)</label>
                <div className="input-group mb-3">
                  <span className="input-group-text bg-light text-muted fw-bold">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    step="50"
                    className="form-control form-control-lg fw-bold" 
                    placeholder="0"
                    value={tempBudget}
                    onChange={e => setTempBudget(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="d-flex gap-1.5 flex-wrap">
                  {[0, 500, 1000, 2000, 5000].map(amt => (
                    <button 
                      key={amt} 
                      type="button" 
                      className={`btn btn-sm flex-fill py-1 rounded-2 fw-semibold ${Number(tempBudget) === amt ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setTempBudget(amt)}
                    >
                      {amt === 0 ? 'No Limit' : `₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light rounded-pill px-3" onClick={() => setEditingBudget(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn text-white rounded-pill px-4 fw-bold shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)', border: 'none' }}
                  onClick={handleSaveBudget}
                >
                  Save Limit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyExpenses;
