import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MdPeople, MdAttachMoney, MdAccountBalanceWallet, MdAccountBalance,
  MdPayment, MdHourglassEmpty, MdWarning, MdEventAvailable,
  MdCheckCircle, MdSend, MdAddCircle, MdCalendarToday, MdReceiptLong, MdBarChart, MdArrowForward
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { bankStore } from '../utils/bankStore';
import { getLocalDateString, formatIndianDate } from '../utils/dateUtils';
import AnimatedNumber from '../components/AnimatedNumber';
import UserProfileCard from '../components/auth/UserProfileCard';

const Dashboard = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankSummary, setBankSummary] = useState({ totalBalance: 0, activeAccountsCount: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setCustomers(loanStore.getCustomers());
    setLoans(loanStore.getLoans());
    setPayments(loanStore.getPayments());
    setReminders(loanStore.getReminders());
    setBankAccounts(bankStore.getAccounts());
    setBankSummary(bankStore.getFinancialSummary());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('loanStoreUpdated', loadData);
    window.addEventListener('bankStoreUpdated', loadData);
    return () => {
      window.removeEventListener('loanStoreUpdated', loadData);
      window.removeEventListener('bankStoreUpdated', loadData);
    };
  }, []);

  const todayStr = getLocalDateString();
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // KPI Calculations
  const totalCustomers = customers.length;
  const totalActiveLoans = loans.filter(l => l.status === 'Active').length;
  const totalLoanAmount = loans.reduce((s, l) => s + Number(l.totalAmount || 0), 0);

  // Outstanding calculation = Total loan amount - Total paid payments amount
  const totalPaidAmount = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalLoanAmount - totalPaidAmount);

  // This Month Collection
  const thisMonthCollection = payments
    .filter(p => p.status === 'Paid' && p.paidDate && p.paidDate.startsWith(currentMonthStr))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const [custPendingSearch, setCustPendingSearch] = useState('');

  // Pending EMI Amount (Upcoming / Pending)
  const pendingEmiAmount = payments
    .filter(p => p.status === 'Upcoming' || p.status === 'Pending')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  // Overdue EMI Amount
  const overduePayments = payments.filter(p => p.status === 'Overdue' || (p.status !== 'Paid' && p.dueDate && p.dueDate < todayStr));
  const overdueEmiAmount = overduePayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Total Unpaid Pending Payments & Amount (Sabka Total Pending EMI)
  const unpaidPayments = payments.filter(p => p.status !== 'Paid');
  const totalPendingEmiAmount = unpaidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPendingEmiCount = unpaidPayments.length;

  // Customer-wise Pending EMI Breakdown ("Sabka Pending EMI Total")
  const customerPendingBreakdown = useMemo(() => {
    if (!customers || customers.length === 0) return [];

    return customers.map(cust => {
      const custActiveLoans = loans.filter(l => l.customerId === cust.id && l.status === 'Active');
      const custUnpaid = payments.filter(p => p.customerId === cust.id && p.status !== 'Paid');

      const overdueAmt = custUnpaid
        .filter(p => p.status === 'Overdue' || (p.dueDate && p.dueDate < todayStr))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      const upcomingAmt = custUnpaid
        .filter(p => p.status !== 'Overdue' && (!p.dueDate || p.dueDate >= todayStr))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      const totalPending = overdueAmt + upcomingAmt;
      const earliestDueDate = custUnpaid.length > 0
        ? custUnpaid.map(p => p.dueDate).filter(Boolean).sort()[0]
        : null;

      const firstLoanName = custActiveLoans[0]?.loanName || custUnpaid[0]?.loanName || 'Loan EMI';

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        activeLoansCount: custActiveLoans.length,
        pendingCount: custUnpaid.length,
        overdueAmt,
        upcomingAmt,
        totalPending,
        earliestDueDate,
        firstLoanName
      };
    })
    .filter(c => c.totalPending > 0 || c.activeLoansCount > 0)
    .sort((a, b) => b.totalPending - a.totalPending);
  }, [customers, loans, payments, todayStr]);

  const filteredCustomerBreakdown = useMemo(() => {
    if (!custPendingSearch) return customerPendingBreakdown;
    const q = custPendingSearch.toLowerCase();
    return customerPendingBreakdown.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [customerPendingBreakdown, custPendingSearch]);

  // Upcoming EMI Due Today
  const dueTodayPayments = payments.filter(p => p.dueDate === todayStr && p.status !== 'Paid');
  const dueTodayCount = dueTodayPayments.length;

  // Upcoming EMI list (due in next 15 days)
  const upcomingList = payments
    .filter(p => p.status === 'Upcoming' || (p.dueDate && p.dueDate >= todayStr))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 5);

  // Recent Paid Payments Table
  const recentPayments = payments.slice(0, 6);

  // Quick Action Handler for Mark Paid
  const handleQuickMarkPaid = (payId) => {
    loanStore.markPaymentAsPaid(payId);
    alert('✓ Marked EMI as PAID successfully!');
  };

  const handleSendReminder = (customerName, amount, phone, dueDate, loanName) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const message = `Namaskar ${customerName} ji,\n\nAapka EMI *${loanName}* ki EMI ka bhugtan abhi baki hai.\n\n📅 Due Date: ${dueDate || 'N/A'}\n💰 Payable Amount: ₹${Number(amount).toLocaleString('en-IN')}\n\nKripya jald se jald bhugtan karein. Dhanyavaad! 🙏\n\n- RC Accountant`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Loan Balance by Loan Type Data
  const loanTypes = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card'];
  const loanTypeBreakdown = loanTypes.map((type) => {
    const list = loans.filter((l) => l.type === type);
    const amount = list.reduce((s, l) => s + Number(l.totalAmount || 0), 0);
    return { type, count: list.length, amount };
  });

  // Dynamic Monthly Analytics from real payments
  const monthlyAnalyticsData = React.useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${monthNum}`;
      const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

      const collected = (payments || [])
        .filter((p) => p && p.status === 'Paid' && p.paidDate && p.paidDate.startsWith(yearMonth))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      months.push({
        month: monthLabel,
        yearMonth,
        amount: collected,
        active: i === 0,
      });
    }

    const maxAmt = Math.max(...months.map((m) => m.amount), 0);

    return months.map((m) => {
      let height = '6px';
      if (maxAmt > 0 && m.amount > 0) {
        height = `${Math.max(15, Math.round((m.amount / maxAmt) * 90))}%`;
      }
      return {
        ...m,
        height,
      };
    });
  }, [payments]);

  return (
    <div className="container-fluid py-4 px-3 px-md-4 bg-light page-transition" style={{ minHeight: '100vh' }}>
      
      {/* Authenticated User Status & Profile Banner */}
      <UserProfileCard />

      {/* Quick Action Header Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Financial Overview Dashboard</h4>
          <p className="text-muted small mb-0">Real-time loan portfolio monitoring and EMI collection metrics</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button 
            className="btn btn-outline-warning btn-sm rounded-3 d-flex align-items-center gap-1.5 px-3 py-2 fw-semibold text-dark hover-lift" 
            onClick={() => window.dispatchEvent(new CustomEvent('openRecordPaymentModal'))}
            title="Record EMI / Advance Payment"
          >
            <MdPayment size={18} /> Record Transaction
          </button>
          <button className="btn btn-primary btn-sm rounded-3 d-flex align-items-center gap-1.5 px-3 py-2 fw-bold shadow-sm hover-lift" onClick={() => navigate('/calendar')}>
            <MdCalendarToday size={18} /> Calendar
          </button>
        </div>
      </div>

      {/* Central Bank Liquidity Banner */}
      <div className="card border-0 shadow-sm rounded-4 p-3.5 mb-4 bg-white border-start border-4 border-primary">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 p-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <MdAccountBalance size={26} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Total Bank & Cash Liquidity
                </span>
                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small fw-bold">
                  Central Engine
                </span>
              </div>
              <h3 className={`fw-bold mb-0 ${bankSummary.totalBalance >= 0 ? 'text-dark' : 'text-danger'}`}>
                ₹<AnimatedNumber value={bankSummary.totalBalance} />
              </h3>
            </div>
          </div>

          {/* Bank Accounts Mini Badges & Action */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {bankAccounts.slice(0, 3).map(b => (
              <div 
                key={b.id} 
                className="badge bg-light text-dark border px-2.5 py-1.5 rounded-3 d-flex align-items-center gap-1.5 cursor-pointer hover-lift"
                onClick={() => navigate('/bank-accounts')}
                style={{ cursor: 'pointer' }}
                title="View in Bank Accounts"
              >
                <span className="rounded-circle d-inline-block" style={{ width: '8px', height: '8px', backgroundColor: b.color || '#0d6efd' }}></span>
                <span className="fw-bold">{b.bankName}</span>
                <span className="text-muted font-monospace">₹{Number(b.currentBalance).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <button 
              className="btn btn-sm btn-primary rounded-3 px-3 py-1.5 fw-bold d-flex align-items-center gap-1 shadow-2xs"
              onClick={() => navigate('/bank-accounts')}
            >
              Manage Banks <MdArrowForward size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Card 0: Total Customers */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 hover-lift transition-all" 
            onClick={() => navigate('/customers')}
            style={{ cursor: 'pointer' }}
            title="Click to manage Customers"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Customers</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '60px', height: '28px' }}></div> : <AnimatedNumber value={totalCustomers} />}
                </h3>
                <small className="text-success fw-semibold">Active Borrowers</small>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-2.5">
                <MdPeople size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 1: Total Active Loans */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 hover-lift transition-all" 
            onClick={() => navigate('/loans')}
            style={{ cursor: 'pointer' }}
            title="Click to manage Loans"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Active Loans</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '60px', height: '28px' }}></div> : <AnimatedNumber value={totalActiveLoans} />}
                </h3>
                <small className="text-info fw-semibold">{loans.length} Total Registered</small>
              </div>
              <div className="bg-info bg-opacity-10 text-info rounded-3 p-2.5">
                <MdAccountBalance size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Loan Amount */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 hover-lift transition-all" 
            onClick={() => navigate('/loans')}
            style={{ cursor: 'pointer' }}
            title="Click to view Loan Portfolio"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Loan Portfolio</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '90px', height: '28px' }}></div> : <AnimatedNumber value={totalLoanAmount} prefix="₹" isCurrency={true} />}
                </h3>
                <small className="text-primary fw-semibold">Total Disbursed</small>
              </div>
              <div className="bg-success bg-opacity-10 text-success rounded-3 p-2.5">
                <MdAttachMoney size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Outstanding Balance */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 hover-lift transition-all" 
            onClick={() => navigate('/loans')}
            style={{ cursor: 'pointer' }}
            title="Click to view Outstanding Loan balances"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Outstanding Balance</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '100px', height: '28px' }}></div> : <AnimatedNumber value={totalOutstandingBalance} prefix="₹" isCurrency={true} />}
                </h3>
                <small className="text-danger fw-semibold">Principal Remaining</small>
              </div>
              <div className="bg-secondary bg-opacity-10 text-secondary rounded-3 p-2.5">
                <MdAccountBalanceWallet size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second KPI Mini Row */}
      <div className="row g-3 mb-4">
        {/* Total Pending EMI (Sabka Total) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 hover-lift transition-all"
            onClick={() => navigate('/emi-payments')}
            style={{ cursor: 'pointer' }}
            title="Click to view all pending EMI installments"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Pending EMI</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '90px', height: '28px' }}></div> : <AnimatedNumber value={totalPendingEmiAmount} isCurrency />}
                </h3>
                <small className="text-warning fw-bold">{totalPendingEmiCount} Pending Installment{totalPendingEmiCount !== 1 ? 's' : ''}</small>
              </div>
              <div className="bg-warning bg-opacity-15 text-dark rounded-3 p-2.5">
                <MdHourglassEmpty size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* This Month's Collection */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>This Month Collection</small>
                <h3 className="fw-bold text-dark my-1">
                  {loading ? <div className="skeleton" style={{ width: '80px', height: '28px' }}></div> : <AnimatedNumber value={thisMonthCollection} isCurrency />}
                </h3>
                <small className="text-success fw-semibold">Current Calendar Month</small>
              </div>
              <div className="bg-success bg-opacity-10 text-success rounded-3 p-2.5">
                <MdCheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Overdue EMI Amount</small>
                <h3 className="fw-bold text-danger my-1">
                  {loading ? <div className="skeleton" style={{ width: '80px', height: '28px' }}></div> : <AnimatedNumber value={overdueEmiAmount} isCurrency />}
                </h3>
                <small className="text-danger fw-semibold">{overduePayments.length} Installments Overdue</small>
              </div>
              <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-2.5">
                <MdWarning size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Due Today</small>
                <h3 className="fw-bold text-primary my-1">
                  {loading ? <div className="skeleton" style={{ width: '40px', height: '28px' }}></div> : <AnimatedNumber value={dueTodayCount} />}
                </h3>
                <small className="text-primary fw-semibold">Requires Attention Today</small>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-2.5">
                <MdEventAvailable size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Customer-Wise Pending EMI Breakdown ("Sabka Pending EMI Total") ── */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h5 className="fw-bold text-dark mb-0">Sabka Pending EMI Total Summary</h5>
              <span className="badge bg-warning text-dark font-monospace px-2.5 py-1 rounded-pill fw-bold">
                Total: ₹{totalPendingEmiAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted small mb-0">Borrower-wise list of total pending EMI amounts and overdue balances</p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ maxWidth: '240px' }}>
              <input
                type="text"
                className="form-control rounded-start-3"
                placeholder="Search borrower name/phone..."
                value={custPendingSearch}
                onChange={(e) => setCustPendingSearch(e.target.value)}
              />
              {custPendingSearch && (
                <button className="btn btn-outline-secondary" onClick={() => setCustPendingSearch('')}>✕</button>
              )}
            </div>
            <button className="btn btn-sm btn-outline-primary rounded-3 fw-bold" onClick={() => navigate('/emi-payments')}>
              Full EMI Ledger
            </button>
          </div>
        </div>

        {filteredCustomerBreakdown.length === 0 ? (
          <div className="text-center py-4 text-muted bg-light rounded-3">
            <MdCheckCircle size={36} className="text-success opacity-50 mb-2" />
            <p className="small mb-0">No pending EMI accounts found matching your criteria!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light text-muted small">
                <tr>
                  <th className="py-2.5">Borrower Name</th>
                  <th>Phone</th>
                  <th>Active Loans</th>
                  <th>Overdue EMI</th>
                  <th>Upcoming EMI</th>
                  <th className="text-end">Total Pending EMI</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerBreakdown.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div className="fw-bold text-dark">{cust.name}</div>
                      <small className="text-muted font-monospace">{cust.id}</small>
                    </td>
                    <td className="text-secondary small font-monospace">{cust.phone || '-'}</td>
                    <td>
                      <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-20 rounded-pill px-2.5 py-1">
                        {cust.activeLoansCount} Loan{cust.activeLoansCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      {cust.overdueAmt > 0 ? (
                        <span className="fw-bold text-danger">₹{cust.overdueAmt.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-muted small">₹0</span>
                      )}
                    </td>
                    <td>
                      <span className="fw-semibold text-warning">₹{cust.upcomingAmt.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="text-end">
                      <span className="fw-bold text-primary font-monospace" style={{ fontSize: '1.05rem' }}>
                        ₹{cust.totalPending.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-1.5">
                        <button
                          className="btn btn-success btn-sm rounded-pill px-2.5 py-1 fw-bold d-flex align-items-center gap-1 shadow-2xs"
                          style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                          title="WhatsApp Reminder Bhejo"
                          onClick={() => handleSendReminder(cust.name, cust.totalPending, cust.phone, formatIndianDate(cust.earliestDueDate), cust.firstLoanName)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.054 23.447a.5.5 0 0 0 .492.553.5.5 0 0 0 .151-.024l5.805-1.938A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.97 0-3.81-.572-5.362-1.558l-.383-.24-3.985 1.33 1.222-3.874-.265-.399A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                          </svg>
                          WhatsApp
                        </button>

                        <button
                          className="btn btn-outline-primary btn-sm rounded-pill px-2.5 py-1 fw-bold"
                          title="View EMI Ledger"
                          onClick={() => navigate('/emi-payments', { state: { customerFilter: cust.id } })}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="row g-4 mb-4">
        {/* EMI Collection Breakdown Card */}
        <div className="col-12 col-lg-7 col-xl-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-0">Monthly Collection Analytics</h5>
                <small className="text-muted">EMI payment collections trend over recent months</small>
              </div>
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1.5 fw-semibold">Live Real-time</span>
            </div>

            {/* Visual Bar Graph - 100% Real Live Dynamic Data */}
            <div className="d-flex align-items-end justify-content-between gap-2 mt-4 pt-3" style={{ height: '220px' }}>
              {monthlyAnalyticsData.map((bar, idx) => (
                <div key={idx} className="d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end">
                  <span className="small fw-bold text-muted mb-1 font-monospace" style={{ fontSize: '0.72rem' }}>
                    {bar.amount > 0 ? (bar.amount >= 1000 ? `₹${(bar.amount / 1000).toFixed(bar.amount % 1000 === 0 ? 0 : 1)}k` : `₹${bar.amount}`) : '₹0'}
                  </span>
                  <div 
                    className={`w-100 rounded-top-3 transition-all ${bar.amount > 0 ? (bar.active ? 'bg-primary shadow' : 'bg-primary bg-opacity-40') : 'bg-secondary bg-opacity-15'}`}
                    style={{ height: bar.height, transition: 'all 0.3s ease', minHeight: '6px' }}
                    title={`${bar.month}: ₹${bar.amount.toLocaleString('en-IN')}`}
                  ></div>
                  <span className={`small mt-2 ${bar.active ? 'fw-bold text-primary' : 'fw-semibold text-secondary'}`}>{bar.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Balance Chart by Loan Type */}
        <div className="col-12 col-lg-5 col-xl-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold text-dark mb-1">Loan Capital by Category</h5>
            <p className="text-muted small mb-3">Portfolio distribution across loan types</p>

            <div className="d-flex flex-column gap-3 mt-2">
              {loanTypeBreakdown.map((item, idx) => {
                const percentage = totalLoanAmount > 0 ? Math.round((item.amount / totalLoanAmount) * 100) : 0;
                const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger'];
                return (
                  <div key={idx}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold text-dark small">{item.type} ({item.count})</span>
                      <span className="fw-bold small text-secondary">₹{item.amount.toLocaleString('en-IN')} ({percentage}%)</span>
                    </div>
                    <div className="progress rounded-pill" style={{ height: '8px' }}>
                      <div className={`progress-bar ${colors[idx % colors.length]}`} role="progressbar" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tables & Alerts Section */}
      <div className="row g-4 mb-4">
        {/* Overdue EMI Alert List */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-danger bg-opacity-10 text-danger rounded-circle p-2">
                  <MdWarning size={20} />
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0">Overdue EMI Action Alerts</h6>
                  <small className="text-muted">Requires immediate payment reminder dispatch</small>
                </div>
              </div>
              <span className="badge bg-danger text-white rounded-pill px-2.5 py-1">{overduePayments.length} Overdue</span>
            </div>

            {overduePayments.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <MdCheckCircle size={36} className="text-success opacity-50 mb-2" />
                <p className="small mb-0">Great news! No overdue EMI payments at the moment.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {overduePayments.slice(0, 4).map((pay) => (
                  <div key={pay.id} className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <div className="fw-bold text-dark small">{pay.customerName}</div>
                      <small className="text-muted d-block">{pay.loanName} • Due: <span className="text-danger fw-bold">{formatIndianDate(pay.dueDate)}</span></small>
                      <small className="text-danger fw-bold">Overdue Amount: ₹{Number(pay.amount).toLocaleString('en-IN')}</small>
                    </div>

                    <button 
                      className="btn btn-success btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1 shadow-sm"
                      style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                      onClick={() => {
                        const cust = customers.find(c => c.id === pay.customerId);
                        handleSendReminder(pay.customerName, pay.amount, cust?.phone, formatIndianDate(pay.dueDate), pay.loanName);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '2px'}}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.054 23.447a.5.5 0 0 0 .492.553.5.5 0 0 0 .151-.024l5.805-1.938A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.97 0-3.81-.572-5.362-1.558l-.383-.24-3.985 1.33 1.222-3.874-.265-.399A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      WhatsApp Bhejo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming EMI List */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-warning bg-opacity-10 text-dark rounded-circle p-2">
                  <MdHourglassEmpty size={20} />
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0">Upcoming EMI Due Schedule</h6>
                  <small className="text-muted">Next installments due for collection</small>
                </div>
              </div>
              <button className="btn btn-sm btn-link text-primary fw-bold text-decoration-none" onClick={() => navigate('/emi-payments')}>
                View All <MdArrowForward />
              </button>
            </div>

            {upcomingList.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <p className="small mb-0">No upcoming EMI schedules found.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {upcomingList.map((pay) => (
                  <div key={pay.id} className="p-3 bg-light rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2 border">
                    <div>
                      <div className="fw-bold text-dark small">{pay.customerName}</div>
                      <small className="text-muted d-block">{pay.loanName} • Due: <span className="fw-semibold text-warning">{formatIndianDate(pay.dueDate)}</span></small>

                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className="fw-bold text-success">₹{Number(pay.amount).toLocaleString('en-IN')}</span>
                      <button 
                        className="btn btn-success btn-sm rounded-pill px-3 py-1 fw-bold shadow-2xs"
                        onClick={() => handleQuickMarkPaid(pay.id)}
                      >
                        ✓ Mark Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent EMI Payment Table */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold text-dark mb-0">Recent EMI Payment Transactions</h5>
            <small className="text-muted">Itemized list of recently recorded collections</small>
          </div>
          <button className="btn btn-sm btn-outline-primary rounded-3 fw-bold" onClick={() => navigate('/emi-payments')}>
            Full EMI Ledger
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-muted small">
              <tr>
                <th className="py-2.5">Customer Name</th>
                <th>Loan Name</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th className="text-end">EMI Amount</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((pay) => (
                <tr key={pay.id}>
                  <td className="fw-bold text-dark">{pay.customerName}</td>
                  <td className="text-secondary small">{pay.loanName}</td>
                  <td className="text-muted small">{pay.paidDate || pay.dueDate || '-'}</td>
                  <td>
                    <span className="badge bg-light text-dark border px-2.5 py-1">{pay.paymentMethod || 'UPI'}</span>
                  </td>
                  <td className="text-end fw-bold text-success">₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                  <td className="text-center">
                    <span className={`badge rounded-pill px-3 py-1.5 ${
                      pay.status === 'Paid' ? 'bg-success bg-opacity-10 text-success' :
                      pay.status === 'Overdue' ? 'bg-danger bg-opacity-10 text-danger' :
                      'bg-warning bg-opacity-10 text-dark'
                    }`}>
                      {pay.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Navigation Buttons Bottom Grid */}
      <div className="row g-3">
        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/customers')}>
            <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-2.5 mb-2 d-inline-block">
              <MdPeople size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">Customers</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Manage Profiles</small>
          </button>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/loans')}>
            <div className="bg-success bg-opacity-10 text-success rounded-3 p-2.5 mb-2 d-inline-block">
              <MdAccountBalance size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">Loans</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Loan Contracts</small>
          </button>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/emi-payments')}>
            <div className="bg-warning bg-opacity-10 text-dark rounded-3 p-2.5 mb-2 d-inline-block">
              <MdPayment size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">EMI Payments</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Collection Ledger</small>
          </button>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/calendar')}>
            <div className="bg-info bg-opacity-10 text-info rounded-3 p-2.5 mb-2 d-inline-block">
              <MdCalendarToday size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">Calendar</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Schedule & Dues</small>
          </button>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/statements')}>
            <div className="bg-secondary bg-opacity-10 text-secondary rounded-3 p-2.5 mb-2 d-inline-block">
              <MdReceiptLong size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">Statements</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>PDF / Excel Print</small>
          </button>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <button className="btn btn-white border shadow-sm rounded-4 p-3 w-100 text-start hover-lift transition-all" onClick={() => navigate('/reports')}>
            <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-2.5 mb-2 d-inline-block">
              <MdBarChart size={22} />
            </div>
            <h6 className="fw-bold text-dark mb-0">Reports</h6>
            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Analytics & CSV</small>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
