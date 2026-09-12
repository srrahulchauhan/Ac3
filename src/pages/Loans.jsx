import React, { useState, useEffect } from 'react';
import { 
  MdSearch, MdAccountBalance, MdAddCircle, MdEdit, MdDelete, 
  MdReceipt, MdCalendarToday, MdInfo, MdVisibility, MdFastForward, MdUpdate,
  MdSend, MdViewList, MdViewModule, MdHourglassEmpty
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { bankStore } from '../utils/bankStore';
import { getLocalDateString, addMonthsToDate, formatIndianDate, getLastEntryDate, setLastEntryDate } from '../utils/dateUtils';
import SendStatementModal from '../components/SendStatementModal';


const LOAN_TYPES = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card', 'Other Loan'];

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rc_view_loans') || (window.innerWidth >= 768 ? 'table' : 'cards');
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rc_view_loans', mode);
  };

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [commModal, setCommModal] = useState({ open: false, customerId: null, loanId: null, templateKey: 'loan_statement' });

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    customerId: '',
    loanName: '',
    type: 'Home Loan',
    totalAmount: '',
    emiAmount: '',
    startDate: getLastEntryDate('loan', getLocalDateString()),
    tenureMonths: 12,
    dueDate: addMonthsToDate(getLocalDateString(), 1),
    status: 'Active',
    bankAccountId: '',
    disburseViaBank: true,
    notes: '',
  });

  const loadData = () => {
    setLoans(loanStore.getLoans());
    setCustomers(loanStore.getCustomers());
    setPayments(loanStore.getPayments());
    setBankAccounts(bankStore.getAccounts());
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

  const handleQuickStatusChange = (loanId, newStatus) => {
    loanStore.updateLoanStatus(loanId, newStatus);
    loadData();
  };

  const openAddModal = () => {
    setEditingLoan(null);
    const lastLoanDate = getLastEntryDate('loan', getLocalDateString());
    setFormData({
      id: 'LOAN-' + Math.floor(1000 + Math.random() * 9000),
      customerId: customers.length > 0 ? customers[0].id : '',
      loanName: '',
      type: 'Home Loan',
      totalAmount: '',
      emiAmount: '',
      startDate: lastLoanDate,
      tenureMonths: 12,
      dueDate: addMonthsToDate(lastLoanDate, 1),
      status: 'Active',
      bankAccountId: bankAccounts[0]?.id || '',
      disburseViaBank: true,
      notes: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (loan) => {
    setEditingLoan(loan);
    setFormData({ ...loan, status: loan.status || 'Active' });
    setShowAddModal(true);
  };

  const handleAdvanceMonth = () => {
    setFormData((prev) => ({
      ...prev,
      dueDate: addMonthsToDate(prev.dueDate || getLocalDateString(), 1)
    }));
  };


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (['totalAmount', 'tenureMonths'].includes(name)) {
        const p = Number(name === 'totalAmount' ? value : prev.totalAmount) || 0;
        const n = Number(name === 'tenureMonths' ? value : prev.tenureMonths) || 1;

        const autoEmi = loanStore.calculateEmi(p, n);
        if (autoEmi > 0) updated.emiAmount = autoEmi.toString();
      }
      if (name === 'startDate') {
        updated.dueDate = addMonthsToDate(value, 1);
      }
      return updated;
    });
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.loanName?.trim()) {
      return;
    }

    const selectedCust = customers.find((c) => c.id === formData.customerId);
    const custName = selectedCust ? selectedCust.name : (formData.customerName || (customers[0]?.name || 'Borrower'));
    const finalCustId = formData.customerId || (selectedCust?.id || (customers[0]?.id || 'CUST-001'));

    const totalAmt = formData.totalAmount !== '' && formData.totalAmount !== undefined ? Number(formData.totalAmount) : 0;
    const calculatedEmi = formData.emiAmount !== '' && formData.emiAmount !== undefined
      ? Number(formData.emiAmount)
      : (loanStore.calculateEmi(totalAmt, formData.tenureMonths) || 0);

    setLastEntryDate('loan', formData.startDate || getLocalDateString());

    const newLoan = {
      ...formData,
      customerId: finalCustId,
      customerName: custName,
      status: formData.status || 'Active',
      totalAmount: totalAmt,
      emiAmount: calculatedEmi,
      tenureMonths: Number(formData.tenureMonths || 12),
    };

    loanStore.saveLoan(newLoan);

    setShowAddModal(false);
    setEditingLoan(null);
    loadData();
  };

  const handleDelete = (id) => {
    loanStore.deleteLoan(id);
    setDeleteConfirmId(null);
    if (selectedLoanDetails && selectedLoanDetails.id === id) {
      setSelectedLoanDetails(null);
    }
    loadData();
  };

  // Filter Loans
  const filteredLoans = (loans || []).filter((l) => {
    if (!l) return false;
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (l.loanName || '').toLowerCase().includes(q) ||
      (l.customerName || '').toLowerCase().includes(q) ||
      (l.id || '').toLowerCase().includes(q);

    const matchesType = !typeFilter || l.type === typeFilter;
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="container-fluid py-4 px-3 px-md-4 bg-light page-transition" style={{ minHeight: '100vh' }}>
      
      {/* Header & Actions */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Loan Management System</h4>
          <p className="text-muted small mb-0">Create loans, view payment progress bars, and monitor EMI schedules</p>
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

          <button className="btn btn-success rounded-3 px-3 py-2 fw-bold shadow-sm d-flex align-items-center gap-1.5" onClick={openAddModal}>
            <MdAddCircle size={18} /> Create New Loan
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-6">
            <div className="input-group bg-light rounded-3 border">
              <span className="input-group-text bg-transparent border-0 pe-1">
                <MdSearch size={20} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control bg-transparent border-0 box-shadow-none"
                placeholder="Search by loan name, borrower customer name, loan ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <select className="form-select bg-light border" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">-- All Loan Types --</option>
              {LOAN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <select className="form-select bg-light border" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">-- All Statuses --</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Permanently Closed">Permanent Close</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans Content: Table or Cards View */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted font-monospace small">
                <tr>
                  <th className="ps-4">LOAN &amp; BORROWER</th>
                  <th>LOAN TYPE</th>
                  <th>TOTAL AMOUNT</th>
                  <th>MONTHLY EMI</th>
                  <th style={{ minWidth: '110px' }}>PROGRESS</th>
                  <th>OUTSTANDING</th>
                  <th>NEXT DUE</th>
                  <th style={{ minWidth: '120px' }}>STATUS</th>
                  <th className="text-end pe-4" style={{ minWidth: '160px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <p className="mb-0 fw-semibold">No loan accounts found matching your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => {
                    const loanPayments = payments.filter((p) => p.loanId === loan.id && p.status === 'Paid');
                    const paidEmis = loanPayments.length;
                    const tenure = Number(loan.tenureMonths) || 12;
                    const remainingEmis = Math.max(0, tenure - paidEmis);
                    const totalPaidAmt = loanPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                    const outstanding = Math.max(0, Number(loan.totalAmount) - totalPaidAmt);
                    const progressPercent = Math.min(100, Math.round((paidEmis / tenure) * 100));

                    return (
                      <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{loan.loanName}</div>
                          <small className="text-muted d-block">{loan.customerName} • <span className="font-monospace text-primary">{loan.id}</span></small>
                        </td>

                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary border px-2 py-1 rounded-2 fw-semibold">
                            {loan.type}
                          </span>
                        </td>

                        <td>
                          <div className="fw-bold text-dark">₹{Number(loan.totalAmount).toLocaleString('en-IN')}</div>
                        </td>

                        <td>
                          <div className="fw-bold text-success">₹{Number(loan.emiAmount).toLocaleString('en-IN')}/mo</div>
                          <small className="text-muted">{tenure} Months</small>
                        </td>

                        <td style={{ minWidth: 130 }}>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: 6 }}>
                              <div className="progress-bar bg-success" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <small className="fw-bold text-dark font-monospace">{progressPercent}%</small>
                          </div>
                          <small className="text-muted" style={{ fontSize: '0.68rem' }}>{paidEmis}/{tenure} EMIs</small>
                        </td>

                        <td>
                          <div className={`fw-bold ${outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                            ₹{outstanding.toLocaleString('en-IN')}
                          </div>
                        </td>

                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1 rounded-2 font-monospace">
                            {formatIndianDate(loan.dueDate)}
                          </span>
                        </td>

                        <td style={{ minWidth: '120px' }}>
                          {loan.status === 'Closed' ? (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Closed
                            </span>
                          ) : loan.status === 'Permanently Closed' ? (
                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Permanent Close
                            </span>
                          ) : (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 rounded-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Active
                            </span>
                          )}
                        </td>

                        <td className="text-end pe-4" style={{ minWidth: '160px' }}>
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm rounded-2 px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem', height: '28px' }}
                              onClick={() => setCommModal({ open: true, customerId: loan.customerId, loanId: loan.id, templateKey: 'loan_statement' })}
                              title="Send Statement via WhatsApp / Gmail"
                            >
                              <MdSend size={14} /> Send
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm rounded-2 d-inline-flex align-items-center justify-content-center"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              onClick={() => setSelectedLoanDetails({ ...loan, paidEmis, tenure, remainingEmis, outstanding, progressPercent, schedule: loanStore.generateEmiSchedule(loan) })}
                              title="Details & Schedule"
                            >
                              <MdVisibility size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm rounded-2 d-inline-flex align-items-center justify-content-center"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              onClick={() => openEditModal(loan)}
                              title="Edit Loan"
                            >
                              <MdEdit size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm rounded-2 d-inline-flex align-items-center justify-content-center"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              onClick={() => setDeleteConfirmId(loan.id)}
                              title="Delete Loan"
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
          {filteredLoans.length === 0 ? (
            <div className="col-12 text-center py-5 bg-white rounded-4 shadow-sm border text-muted">
              <MdHourglassEmpty size={44} className="mb-2 opacity-50" />
              <h6 className="fw-bold text-dark">No Loan Records Found</h6>
              <p className="small mb-0">Try changing your search term or filter options.</p>
            </div>
          ) : (
            filteredLoans.map((loan) => {
              const loanPayments = payments.filter((p) => p.loanId === loan.id && p.status === 'Paid');
              const paidEmis = loanPayments.length;
              const tenure = Number(loan.tenureMonths) || 12;
              const remainingEmis = Math.max(0, tenure - paidEmis);

              const totalPaidAmt = loanPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
              const outstanding = Math.max(0, Number(loan.totalAmount) - totalPaidAmt);
              const progressPercent = Math.min(100, Math.round((paidEmis / tenure) * 100));

              return (
                <div key={loan.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 hover-lift transition-all d-flex flex-column justify-content-between">
                    
                    <div>
                      {/* Card Header: Type Badge & Action Buttons */}
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold font-monospace" style={{ fontSize: '0.72rem' }}>
                          {loan.id} • {loan.type}
                        </span>
                        
                        <div className="d-flex align-items-center gap-1.5">
                          <button 
                            type="button"
                            className="btn btn-sm btn-light rounded-circle text-secondary border d-flex align-items-center justify-content-center" 
                            style={{ width: '28px', height: '28px', padding: 0 }}
                            title="Edit Loan" 
                            onClick={() => openEditModal(loan)}
                          >
                            <MdEdit size={14} />
                          </button>
                          <button 
                            type="button"
                            className="btn btn-sm btn-light rounded-circle text-danger border d-flex align-items-center justify-content-center" 
                            style={{ width: '28px', height: '28px', padding: 0 }}
                            title="Delete Loan" 
                            onClick={() => setDeleteConfirmId(loan.id)}
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Loan Title & Status Badge */}
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                        <div className="overflow-hidden">
                          <h6 className="fw-bold text-dark mb-0 text-truncate">{loan.loanName}</h6>
                          <small className="text-muted fw-semibold d-block text-truncate">Borrower: {loan.customerName}</small>
                        </div>
                        <div className="flex-shrink-0">
                          {loan.status === 'Closed' ? (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                              Closed
                            </span>
                          ) : loan.status === 'Permanently Closed' ? (
                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                              Permanent Close
                            </span>
                          ) : (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0.5 rounded-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Numbers */}
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <div className="row text-center g-2">
                        <div className="col-6 border-end">
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Total Principal</small>
                          <strong className="text-dark">₹{Number(loan.totalAmount).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Monthly EMI</small>
                          <strong className="text-success">₹{Number(loan.emiAmount).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center small mb-1">
                        <span className="text-muted fw-semibold" style={{ fontSize: '0.75rem' }}>Repayment Progress</span>
                        <strong className="text-dark font-monospace">{progressPercent}%</strong>
                      </div>
                      <div className="progress rounded-pill bg-light border" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-success rounded-pill"
                          role="progressbar"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between small text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                        <span>Paid: {paidEmis} EMIs</span>
                        <span>Remaining: {remainingEmis} EMIs</span>
                      </div>
                    </div>

                    {/* Outstanding & Next Due Date */}
                    <div className="d-flex justify-content-between align-items-center small mb-3 border-top pt-2">
                      <div>
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Outstanding</small>
                        <strong className="text-danger fw-bold">₹{outstanding.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="text-end">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Next Due Date</small>
                        <strong className="text-dark">{formatIndianDate(loan.dueDate)}</strong>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-auto">
                      <button
                        className="btn btn-outline-success btn-sm rounded-3 fw-bold py-2 d-flex align-items-center justify-content-center gap-1"
                        style={{ flex: '0 0 auto' }}
                        title="Send Statement via WhatsApp / Gmail"
                        onClick={() => setCommModal({ open: true, customerId: loan.customerId, loanId: loan.id, templateKey: 'loan_statement' })}
                      >
                        <MdSend size={15} /> Send
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm rounded-3 flex-grow-1 fw-bold py-2 d-flex align-items-center justify-content-center gap-1"
                        onClick={() => setSelectedLoanDetails({ ...loan, paidEmis, tenure, remainingEmis, outstanding, progressPercent, schedule: loanStore.generateEmiSchedule(loan) })}
                      >
                        <MdVisibility size={16} /> Details &amp; Schedule
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create / Edit Loan Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdAccountBalance className="text-success" /> {editingLoan ? 'Edit Loan Account' : 'Create New EMI Loan Account'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Select Borrower / Customer</label>
                      <select className="form-select fw-semibold" name="customerId" value={formData.customerId || ''} onChange={handleFormChange}>
                        <option value="">-- Select Registered Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.id})
                          </option>
                        ))}
                        {formData.customerId && !customers.some(c => c.id === formData.customerId) && (
                          <option value={formData.customerId}>
                            {formData.customerName || formData.customerId}
                          </option>
                        )}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Loan Account Name *</label>
                      <input type="text" className="form-control" name="loanName" placeholder="e.g. HDFC Home Loan" value={formData.loanName} onChange={handleFormChange} required />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Loan Type</label>
                      <select className="form-select" name="type" value={formData.type} onChange={handleFormChange}>
                        {LOAN_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Loan Status *</label>
                      <select className="form-select" name="status" value={formData.status || 'Active'} onChange={handleFormChange} required>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Permanently Closed">Permanent Close</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Total Loan Amount (₹) *</label>
                      <input type="number" className="form-control fw-bold" name="totalAmount" placeholder="500000" value={formData.totalAmount} onChange={handleFormChange} required />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tenure (Months) *</label>
                      <input type="number" className="form-control" name="tenureMonths" value={formData.tenureMonths} onChange={handleFormChange} required />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Monthly EMI Amount (₹) *</label>
                      <input type="number" className="form-control fw-bold text-success" name="emiAmount" value={formData.emiAmount} onChange={handleFormChange} required />
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold text-muted mb-0">Start Date</label>
                        {getLastEntryDate('loan') && getLastEntryDate('loan') !== getLocalDateString() && (
                          <span
                            className="badge bg-light text-primary border"
                            style={{ fontSize: '0.62rem', cursor: 'pointer' }}
                            onClick={() => {
                              const lastD = getLastEntryDate('loan');
                              setFormData({ ...formData, startDate: lastD, dueDate: addMonthsToDate(lastD, 1) });
                            }}
                            title="Click to use Last Loan Start Date"
                          >
                            Last: {formatIndianDate(getLastEntryDate('loan'))}
                          </span>
                        )}
                      </div>
                      <input type="date" className="form-control" name="startDate" value={formData.startDate} onChange={handleFormChange} required />
                      <div className="d-flex gap-1 mt-1">
                        <button 
                          type="button" 
                          className={`btn btn-xs py-0 px-1.5 rounded-pill ${formData.startDate === getLocalDateString() ? 'btn-primary' : 'btn-light border text-muted'}`}
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => setFormData({ ...formData, startDate: getLocalDateString(), dueDate: addMonthsToDate(getLocalDateString(), 1) })}
                        >
                          Today
                        </button>
                        {getLastEntryDate('loan') && getLastEntryDate('loan') !== getLocalDateString() && (
                          <button 
                            type="button" 
                            className={`btn btn-xs py-0 px-1.5 rounded-pill ${formData.startDate === getLastEntryDate('loan') ? 'btn-primary' : 'btn-light border text-muted'}`}
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => {
                              const lastD = getLastEntryDate('loan');
                              setFormData({ ...formData, startDate: lastD, dueDate: addMonthsToDate(lastD, 1) });
                            }}
                          >
                            Last Date ({formatIndianDate(getLastEntryDate('loan'))})
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold text-muted mb-0">EMI Due Date</label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-bold text-primary small d-flex align-items-center gap-1"
                          onClick={handleAdvanceMonth}
                          title="Continue to Next Month EMI (+1 Month)"
                        >
                          <MdUpdate size={14} /> +1 Month
                        </button>
                      </div>
                      <div className="input-group">
                        <input type="date" className="form-control fw-bold" name="dueDate" value={formData.dueDate} onChange={handleFormChange} required />
                        <button 
                          type="button" 
                          className="btn btn-outline-primary fw-bold text-nowrap d-flex align-items-center gap-1 shadow-2xs" 
                          onClick={handleAdvanceMonth}
                          title="Advance EMI Due Date to Next Month (+1 Month)"
                        >
                          <MdFastForward size={18} /> +1 Mo
                        </button>
                      </div>
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>Click "+1 Mo" to auto-continue next month's EMI date</small>
                    </div>


                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                        <MdAccountBalance size={16} className="text-primary" /> Disbursement Bank Account (Optional)
                      </label>
                      <select
                        className="form-select"
                        name="bankAccountId"
                        value={formData.bankAccountId || ''}
                        onChange={handleFormChange}
                      >
                        <option value="">-- Do Not Disburse via Bank Account --</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.accountNumber ? `..${b.accountNumber.slice(-4)}` : b.accountType}) - Bal: ₹{Number(b.currentBalance).toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>
                        Selecting a bank account will automatically log a debit disbursement in that bank ledger
                      </small>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Loan Notes & Terms</label>
                      <textarea className="form-control" rows="2" name="notes" placeholder="Loan details..." value={formData.notes} onChange={handleFormChange}></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-3 px-4 fw-bold shadow-sm">Save Loan Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loan Details & EMI Schedule Breakdown Modal */}
      {selectedLoanDetails && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-success text-white py-3 px-4">
                <div>
                  <h5 className="modal-title fw-bold mb-0">{selectedLoanDetails.loanName}</h5>
                  <small className="opacity-90">Borrower: {selectedLoanDetails.customerName} • {selectedLoanDetails.type}</small>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedLoanDetails(null)}></button>
              </div>

              <div className="modal-body p-4 bg-light">
                {/* Summary Metrics Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Total Principal</small>
                      <h4 className="fw-bold text-dark mb-0">₹{Number(selectedLoanDetails.totalAmount).toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Monthly EMI</small>
                      <h4 className="fw-bold text-success mb-0">₹{Number(selectedLoanDetails.emiAmount).toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Progress</small>
                      <h4 className="fw-bold text-primary mb-0">{selectedLoanDetails.paidEmis} / {selectedLoanDetails.tenure} EMIs</h4>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Outstanding Balance</small>
                      <h4 className="fw-bold text-danger mb-0">₹{selectedLoanDetails.outstanding.toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                  <h6 className="fw-bold text-dark mb-3">Month-by-Month EMI Payment Schedule Breakdown</h6>
                  <div className="table-responsive" style={{ maxHeight: '350px' }}>
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="bg-light sticky-top">
                        <tr>
                          <th>Inst #</th>
                          <th>Due Date</th>
                          <th>EMI Amount</th>
                          <th>Remaining Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoanDetails.schedule.map((row) => (
                          <tr key={row.installmentNumber}>
                            <td className="fw-bold">{row.installmentNumber}</td>
                            <td className="fw-semibold text-primary">{formatIndianDate(row.dueDate)}</td>

                            <td className="fw-bold text-dark">₹{row.emiAmount.toLocaleString('en-IN')}</td>
                            <td className="fw-semibold">₹{row.remainingBalance.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge rounded-pill ${
                                row.status === 'Paid' ? 'bg-success bg-opacity-10 text-success' :
                                row.status === 'Upcoming' ? 'bg-warning bg-opacity-10 text-dark' :
                                'bg-secondary bg-opacity-10 text-secondary'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light py-3 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-success rounded-3 px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => setCommModal({ open: true, customerId: selectedLoanDetails.customerId, loanId: selectedLoanDetails.id, templateKey: 'loan_statement' })}
                  title="Send Statement via WhatsApp / Gmail"
                >
                  <MdSend size={16} /> Send
                </button>
                <button type="button" className="btn btn-secondary rounded-3 px-4 fw-semibold" onClick={() => setSelectedLoanDetails(null)}>Close Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Statement / Communication Modal */}
      {commModal.open && (
        <SendStatementModal
          isOpen={commModal.open}
          onClose={() => setCommModal({ open: false, customerId: null, loanId: null, templateKey: 'loan_statement' })}
          initialCustomerId={commModal.customerId}
          initialLoanId={commModal.loanId}
          initialTemplateKey={commModal.templateKey}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1080 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div className="text-danger mb-2">
                <MdDelete size={40} />
              </div>
              <h6 className="fw-bold text-dark">Confirm Delete Loan Account</h6>
              <p className="small text-muted mb-3">Deleting this loan will also erase associated payment logs!</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light border btn-sm rounded-3 px-3 fw-semibold" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm rounded-3 px-3 fw-bold" onClick={() => handleDelete(deleteConfirmId)}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
