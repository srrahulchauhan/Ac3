import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MdSearch, MdPayment, MdCheckCircle, MdWarning, MdHourglassEmpty, 
  MdDelete, MdAddCircle, MdNotifications, MdFastForward,
  MdViewList, MdViewModule, MdFilterList, MdRefresh, MdCalendarToday,
  MdPhone, MdAccountBalance, MdCheck
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { bankStore } from '../utils/bankStore';
import { getLocalDateString, formatIndianDate, addMonthsToDate } from '../utils/dateUtils';

const fmtAmt = (a) => a != null ? '₹' + Number(a).toLocaleString('en-IN') : '₹0';

const EmiPayments = () => {
  const location = useLocation();

  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.status || '');
  const [methodFilter, setMethodFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rc_view_emi') || (window.innerWidth >= 768 ? 'table' : 'cards');
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rc_view_emi', mode);
  };

  // Mark Paid Modal state
  const [markingPayment, setMarkingPayment] = useState(null);
  const [paidDetails, setPaidDetails] = useState({
    paidDate: getLocalDateString(),
    paymentMethod: 'UPI',
    paymentType: 'Regular',
    amount: '',
    advanceMonths: 1,
    nextDueDate: addMonthsToDate(getLocalDateString(), 1),
    notes: 'Payment received',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadData = () => {
    setPayments(loanStore.getPayments());
    setLoans(loanStore.getLoans());
    setCustomers(loanStore.getCustomers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('loanStoreUpdated', loadData);
    return () => {
      window.removeEventListener('loanStoreUpdated', loadData);
    };
  }, []);

  const [bankAccounts, setBankAccounts] = useState([]);

  const loadBankAccounts = () => {
    setBankAccounts(bankStore.getAccounts());
  };

  useEffect(() => {
    loadBankAccounts();
    window.addEventListener('bankStoreUpdated', loadBankAccounts);
    return () => window.removeEventListener('bankStoreUpdated', loadBankAccounts);
  }, []);

  const openMarkPaidModal = (pay) => {
    const defaultBankId = pay.bankAccountId || bankStore.getDefaultAccount()?.id || bankAccounts[0]?.id || '';
    setMarkingPayment(pay);
    setPaidDetails({
      paidDate: getLocalDateString(),
      paymentMethod: pay.paymentMethod || 'UPI',
      bankAccountId: defaultBankId,
      paymentType: 'Regular',
      amount: pay.amount,
      advanceMonths: 1,
      nextDueDate: addMonthsToDate(pay.dueDate || getLocalDateString(), 1),
      notes: pay.notes || 'Payment received',
    });
  };

  const handleConfirmPaid = (e) => {
    e.preventDefault();
    if (!markingPayment) return;

    const amt = Number(paidDetails.amount || markingPayment.amount);

    loanStore.markPaymentAsPaid(markingPayment.id, {
      ...paidDetails,
      amount: amt,
    });

    setMarkingPayment(null);
  };

  const handleDeletePayment = (id) => {
    loanStore.deletePayment(id);
    setDeleteConfirmId(null);
  };

  const todayStr = getLocalDateString();

  // Filter payments
  const filteredPayments = payments
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.loanName || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q);

      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesMethod = !methodFilter || p.paymentMethod === methodFilter;
      const matchesCust = !customerFilter || p.customerId === customerFilter;

      return matchesSearch && matchesStatus && matchesMethod && matchesCust;
    })
    .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  const overdueCount = payments.filter((p) => p.status === 'Overdue' || (p.status !== 'Paid' && p.dueDate && p.dueDate < todayStr)).length;
  const upcomingCount = payments.filter((p) => p.status === 'Upcoming' || (p.status !== 'Paid' && p.dueDate && p.dueDate >= todayStr)).length;
  const paidCount = payments.filter((p) => p.status === 'Paid').length;
  const totalCollected = payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="container-fluid py-4 px-3 px-md-4 bg-light page-transition" style={{ minHeight: '100vh', paddingBottom: '140px' }}>
      
      {/* ── Page Header ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.4rem' }}>💳</span> EMI Payments Ledger &amp; Collections
          </h4>
          <p className="text-muted small mb-0">Record installment payments, send WhatsApp/Gmail statements, and track recovery</p>
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
            type="button"
            className="btn btn-warning rounded-3 px-3 py-2 fw-bold text-dark d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => window.dispatchEvent(new CustomEvent('openRecordPaymentModal'))}
            title="Record New EMI / Advance Payment"
          >
            <MdPayment size={17} /> Record Payment
          </button>
        </div>
      </div>

      <style>{`
        @keyframes overdueBeacon {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes upcomingBell {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15%      { transform: rotate(-14deg) scale(1.08); }
          30%      { transform: rotate(14deg) scale(1.08); }
          45%      { transform: rotate(-8deg) scale(1.04); }
          60%      { transform: rotate(8deg) scale(1.04); }
          75%      { transform: rotate(0deg) scale(1); }
        }
        .dynamic-kpi-card {
          position: relative;
          background: rgba(255, 255, 255, 0.75) !important;
          backdrop-filter: blur(18px) saturate(190%);
          -webkit-backdrop-filter: blur(18px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.8) !important;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dynamic-kpi-card:hover {
          transform: translateY(-4px) scale(1.015);
          background: rgba(255, 255, 255, 0.92) !important;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1), 0 0 0 1.5px rgba(255, 255, 255, 0.9);
        }
        .dynamic-kpi-card.active-paid {
          background: rgba(240, 253, 244, 0.9) !important;
          border: 1.5px solid rgba(16, 185, 129, 0.65) !important;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.2) !important;
        }
        .dynamic-kpi-card.active-upcoming {
          background: rgba(254, 249, 195, 0.9) !important;
          border: 1.5px solid rgba(245, 158, 11, 0.65) !important;
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.2) !important;
        }
        .dynamic-kpi-card.active-overdue {
          background: rgba(254, 242, 242, 0.9) !important;
          border: 1.5px solid rgba(239, 68, 68, 0.65) !important;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.2) !important;
        }
        .dynamic-kpi-card.active-all {
          background: rgba(238, 242, 255, 0.9) !important;
          border: 1.5px solid rgba(99, 102, 241, 0.65) !important;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>

      {/* ── Status KPI Cards (Rich React Icons + Best Animations) ── */}
      <div className="row g-3 mb-4">
        {/* 1. Paid Collections */}
        <div className="col-6 col-md-3">
          <div 
            className={`p-3 rounded-4 text-center dynamic-kpi-card ${statusFilter === 'Paid' ? 'active-paid' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Paid' ? '' : 'Paid')}
            title="Click to filter Paid collections"
          >
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-1.5 rounded-circle text-success"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)',
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              <MdCheckCircle size={24} />
            </div>
            <small className="text-muted d-block font-monospace text-uppercase fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>Paid Collections</small>
            <h4 className="fw-bold text-success my-1">{paidCount}</h4>
            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{fmtAmt(totalCollected)} collected</div>
          </div>
        </div>

        {/* 2. Upcoming Dues */}
        <div className="col-6 col-md-3">
          <div 
            className={`p-3 rounded-4 text-center dynamic-kpi-card ${statusFilter === 'Upcoming' ? 'active-upcoming' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Upcoming' ? '' : 'Upcoming')}
            title="Click to filter Upcoming dues"
          >
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-1.5 rounded-circle text-warning"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.08) 100%)',
                border: '1px solid rgba(245,158,11,0.3)',
                animation: upcomingCount > 0 ? 'upcomingBell 2.5s ease-in-out infinite' : 'none',
              }}
            >
              <MdNotifications size={24} />
            </div>
            <small className="text-muted d-block font-monospace text-uppercase fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>Upcoming Dues</small>
            <h4 className="fw-bold text-warning my-1">{upcomingCount}</h4>
            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>On schedule</div>
          </div>
        </div>

        {/* 3. Overdue Accounts */}
        <div className="col-6 col-md-3">
          <div 
            className={`p-3 rounded-4 text-center dynamic-kpi-card ${statusFilter === 'Overdue' ? 'active-overdue' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Overdue' ? '' : 'Overdue')}
            title="Click to filter Overdue accounts"
          >
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-1.5 rounded-circle text-danger"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.1) 100%)',
                border: '1px solid rgba(239,68,68,0.35)',
                animation: overdueCount > 0 ? 'overdueBeacon 1.5s ease-out infinite' : 'none',
              }}
            >
              <MdWarning size={24} />
            </div>
            <small className="text-muted d-block font-monospace text-uppercase fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>Overdue Accounts</small>
            <h4 className="fw-bold text-danger my-1">{overdueCount}</h4>
            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Action required</div>
          </div>
        </div>

        {/* 4. All Transactions */}
        <div className="col-6 col-md-3">
          <div 
            className={`p-3 rounded-4 text-center dynamic-kpi-card ${!statusFilter ? 'active-all' : ''}`}
            onClick={() => setStatusFilter('')}
            title="Click to view all records"
          >
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-1.5 rounded-circle text-primary"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(67,56,202,0.08) 100%)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <MdAccountBalance size={24} />
            </div>
            <small className="text-muted d-block font-monospace text-uppercase fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>All Transactions</small>
            <h4 className="fw-bold text-primary my-1">{payments.length}</h4>
            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Full record ledger</div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-3">
            <div className="input-group bg-light rounded-3 border">
              <span className="input-group-text bg-transparent border-0 pe-1">
                <MdSearch size={20} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control bg-transparent border-0 ps-1"
                placeholder="Search borrower, loan, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-link text-muted pe-3" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select className="form-select bg-light rounded-3 border fw-semibold" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="">-- All Borrowers --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <select className="form-select bg-light border" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">-- All Payment Statuses --</option>
              <option value="Paid">Paid</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select className="form-select bg-light rounded-3 border fw-semibold" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="">All Methods</option>
              <option value="UPI">UPI / PhonePe</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash</option>
              <option value="Advance Payment">Advance Payment</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="col-6 col-md-2 d-flex justify-content-end">
            {(searchQuery || statusFilter || methodFilter || customerFilter) && (
              <button
                className="btn btn-outline-secondary rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1 w-100 justify-content-center"
                onClick={() => { setSearchQuery(''); setStatusFilter(''); setMethodFilter(''); setCustomerFilter(''); }}
              >
                <MdRefresh size={16} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── EMI Payments Content: Table or Cards View ── */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted font-monospace small">
                <tr>
                  <th className="ps-4">PAY ID &amp; DATE</th>
                  <th>BORROWER / CUSTOMER</th>
                  <th>LOAN ACCOUNT</th>
                  <th>DUE DATE</th>
                  <th>AMOUNT</th>
                  <th>METHOD</th>
                  <th>STATUS</th>
                  <th className="text-end pe-4" style={{ width: '150px', minWidth: '150px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <MdHourglassEmpty size={40} className="mb-2 opacity-50" />
                      <p className="mb-0 fw-semibold">No EMI payment records found matching your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const cust = customers.find((c) => c.id === pay.customerId);
                    const isPaid = pay.status === 'Paid';
                    const isOverdue = pay.status === 'Overdue' || (!isPaid && pay.dueDate && pay.dueDate < todayStr);

                    return (
                      <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td className="ps-4">
                          <div className="fw-bold font-monospace text-dark" style={{ fontSize: '0.85rem' }}>{pay.id}</div>
                          <small className="text-muted">{isPaid && pay.paidDate ? `Paid: ${formatIndianDate(pay.paidDate)}` : 'Pending settlement'}</small>
                        </td>

                        <td>
                          <div className="fw-bold text-dark">{pay.customerName || '—'}</div>
                          {cust?.phone && (
                            <small className="text-muted d-flex align-items-center gap-1 font-monospace">
                              <MdPhone size={12} /> {cust.phone}
                            </small>
                          )}
                        </td>

                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1 rounded-2 fw-semibold">
                            {pay.loanName || 'Loan Account'}
                          </span>
                        </td>

                        <td>
                          <div className={`fw-semibold ${isOverdue ? 'text-danger' : 'text-dark'}`}>
                            {formatIndianDate(pay.dueDate)}
                          </div>
                          {isOverdue && <small className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style={{ fontSize: '0.65rem' }}>Overdue</small>}
                        </td>

                        <td>
                          <div className="fw-bold text-dark fs-6">{fmtAmt(pay.amount)}</div>
                          <small className="text-muted">{pay.notes || 'Installment'}</small>
                        </td>

                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1 rounded-pill fw-semibold">
                            {pay.paymentMethod || 'UPI'}
                          </span>
                        </td>

                        <td>
                          {isPaid ? (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Overdue
                            </span>
                          ) : (
                            <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-30 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Upcoming
                            </span>
                          )}
                        </td>

                        <td className="text-end pe-4" style={{ width: '150px', minWidth: '150px' }}>
                          <div className="d-flex align-items-center justify-content-end" style={{ gap: '10px' }}>
                            {!isPaid ? (
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm rounded-2 fw-semibold px-2.5 py-1 d-inline-flex align-items-center"
                                style={{ fontSize: '0.75rem', height: '28px', gap: '6px' }}
                                onClick={() => openMarkPaidModal(pay)}
                                title="Mark as Paid"
                              >
                                <MdCheck size={14} /> <span>Paid</span>
                              </button>
                            ) : (
                              <div style={{ width: '68px' }}></div>
                            )}

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm rounded-2 d-inline-flex align-items-center justify-content-center"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              onClick={() => setDeleteConfirmId(pay.id)}
                              title="Delete Record"
                            >
                              <MdDelete size={14} />
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
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="row g-3 mb-4">
          {filteredPayments.length === 0 ? (
            <div className="col-12 text-center py-5 bg-white rounded-4 shadow-sm border text-muted">
              <MdHourglassEmpty size={44} className="mb-2 opacity-50" />
              <h6 className="fw-bold text-dark">No Payment Records Found</h6>
              <p className="small mb-0">Try changing your search term or filter options.</p>
            </div>
          ) : (
            filteredPayments.map((pay) => {
              const cust = customers.find((c) => c.id === pay.customerId);
              const isPaid = pay.status === 'Paid';
              const isOverdue = pay.status === 'Overdue' || (!isPaid && pay.dueDate && pay.dueDate < todayStr);

              return (
                <div key={pay.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white d-flex flex-column justify-content-between transition-all hover-lift">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="font-monospace text-muted small fw-bold">{pay.id}</span>
                        {isPaid ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>Paid</span>
                        ) : isOverdue ? (
                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>Overdue</span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-30 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>Upcoming</span>
                        )}
                      </div>

                      <h6 className="fw-bold text-dark mb-1">{pay.customerName || 'Borrower'}</h6>
                      <div className="small text-muted mb-2">{pay.loanName}</div>

                      <div className="p-2.5 bg-light rounded-3 border mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted small">Installment Amount</span>
                          <span className="fw-bold text-dark fs-6">{fmtAmt(pay.amount)}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-muted small">Due Date</span>
                          <span className={`fw-bold small ${isOverdue ? 'text-danger' : 'text-dark'}`}>{formatIndianDate(pay.dueDate)}</span>
                        </div>
                        {isPaid && pay.paidDate && (
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <span className="text-muted small">Paid On</span>
                            <span className="fw-semibold text-success small">{formatIndianDate(pay.paidDate)} ({pay.paymentMethod || 'UPI'})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 pt-2 border-top">
                      {!isPaid && (
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm rounded-2 flex-grow-1 fw-semibold py-1.5 d-flex align-items-center justify-content-center gap-1"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => openMarkPaidModal(pay)}
                        >
                          <MdCheck size={15} /> Mark Paid
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm rounded-2 d-inline-flex align-items-center justify-content-center"
                        style={{ width: isPaid ? '100%' : '32px', height: '32px', padding: 0 }}
                        onClick={() => setDeleteConfirmId(pay.id)}
                        title="Delete Record"
                      >
                        <MdDelete size={15} /> {isPaid ? <span className="ms-1 fw-semibold small">Delete</span> : null}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Mark Paid / Advance Payment Modal ── */}
      {markingPayment && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdCheckCircle className="text-success" /> Confirm EMI Payment Collection
                </h5>
                <button type="button" className="btn-close" onClick={() => setMarkingPayment(null)}></button>
              </div>

              <form onSubmit={handleConfirmPaid}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold text-dark fs-6">{markingPayment.customerName}</div>
                        <div className="small text-muted">{markingPayment.loanName} • Due: {formatIndianDate(markingPayment.dueDate)}</div>
                      </div>
                      <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace">
                        {paidDetails.paymentType === 'Advance' ? '⚡ Advance Mode' : 'Regular EMI'}
                      </span>
                    </div>
                    <div className="mt-2 fw-bold text-success fs-4">{fmtAmt(paidDetails.amount || markingPayment.amount)}</div>
                  </div>

                  {/* Payment Type Selection (Regular vs Advance) */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted d-block mb-1.5">Collection Type</label>
                    <div className="btn-group w-100 bg-light p-1 rounded-3 border">
                      <button
                        type="button"
                        className={`btn btn-sm rounded-2 fw-bold py-1.5 ${paidDetails.paymentType === 'Regular' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                        onClick={() => {
                          setPaidDetails({
                            ...paidDetails,
                            paymentType: 'Regular',
                            amount: markingPayment.amount,
                            paymentMethod: paidDetails.paymentMethod === 'Advance Payment' ? 'UPI' : paidDetails.paymentMethod,
                            nextDueDate: addMonthsToDate(markingPayment.dueDate || getLocalDateString(), 1),
                            notes: 'Installment due settlement',
                          });
                        }}
                      >
                        💳 Regular EMI
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm rounded-2 fw-bold py-1.5 ${paidDetails.paymentType === 'Advance' ? 'btn-warning text-dark shadow-sm' : 'btn-light text-muted'}`}
                        onClick={() => {
                          const advMo = 1;
                          setPaidDetails({
                            ...paidDetails,
                            paymentType: 'Advance',
                            advanceMonths: advMo,
                            amount: Number(markingPayment.amount) * advMo,
                            paymentMethod: 'Advance Payment',
                            nextDueDate: addMonthsToDate(markingPayment.dueDate || getLocalDateString(), advMo + 1),
                            notes: `Advance EMI payment for ${advMo} month(s)`,
                          });
                        }}
                      >
                        ⚡ Advance Payment
                      </button>
                    </div>
                  </div>

                  {/* Advance Payment Quick Multiplier Presets */}
                  {paidDetails.paymentType === 'Advance' && (
                    <div className="p-2.5 bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <small className="fw-bold text-dark">⚡ Advance Period Selector:</small>
                        <small className="text-muted font-monospace">{paidDetails.advanceMonths} Month(s) Advance</small>
                      </div>
                      <div className="d-flex gap-1.5 flex-wrap">
                        {[1, 2, 3, 6].map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`btn btn-xs btn-sm rounded-2 fw-bold px-2.5 py-1 ${
                              paidDetails.advanceMonths === m ? 'btn-warning text-dark shadow-2xs' : 'btn-white bg-white border text-dark'
                            }`}
                            onClick={() => {
                              setPaidDetails({
                                ...paidDetails,
                                advanceMonths: m,
                                amount: Number(markingPayment.amount) * m,
                                nextDueDate: addMonthsToDate(markingPayment.dueDate || getLocalDateString(), m + 1),
                                notes: `Advance EMI payment (${m} Months Advance)`,
                              });
                            }}
                          >
                            +{m} Mo ({fmtAmt(Number(markingPayment.amount) * m)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                        <MdAccountBalance size={16} className="text-primary" /> Receiving Bank Account *
                      </label>
                      <select
                        className="form-select fw-semibold"
                        value={paidDetails.bankAccountId || ''}
                        onChange={(e) => setPaidDetails({ ...paidDetails, bankAccountId: e.target.value })}
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.accountNumber ? `..${b.accountNumber.slice(-4)}` : b.accountType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Payment Method *</label>
                      <select
                        className="form-select fw-semibold"
                        value={paidDetails.paymentMethod}
                        onChange={(e) => setPaidDetails({ ...paidDetails, paymentMethod: e.target.value })}
                      >
                        <option value="UPI">UPI / PhonePe</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cash">Cash</option>
                        <option value="Advance Payment">⚡ Advance Payment</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Payment Date *</label>
                      <input
                        type="date"
                        className="form-control fw-bold"
                        value={paidDetails.paidDate}
                        onChange={(e) => setPaidDetails({ ...paidDetails, paidDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>


                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Next Due Date *</label>
                    <input
                      type="date"
                      className="form-control fw-bold"
                      value={paidDetails.nextDueDate}
                      onChange={(e) => setPaidDetails({ ...paidDetails, nextDueDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      value={paidDetails.notes}
                      onChange={(e) => setPaidDetails({ ...paidDetails, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setMarkingPayment(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-3 px-4 fw-bold shadow-sm">
                    ✓ Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 1080 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div className="text-danger mb-2">
                <MdDelete size={40} />
              </div>
              <h6 className="fw-bold text-dark">Confirm Delete Record</h6>
              <p className="small text-muted mb-3">Are you sure you want to delete this EMI payment record?</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light border btn-sm rounded-3 px-3 fw-semibold" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm rounded-3 px-3 fw-bold" onClick={() => handleDeletePayment(deleteConfirmId)}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmiPayments;
