import React, { useState, useEffect, useMemo } from 'react';
import { 
  MdPersonAdd, MdSearch, MdEdit, MdDelete, MdPhone, 
  MdCompareArrows, MdArrowUpward, MdArrowDownward, 
  MdHistory, MdSend, MdReceiptLong, MdFilterList,
  MdCheckCircle, MdWarning, MdVisibility, MdAddCircle,
  MdViewList, MdViewModule
} from 'react-icons/md';
import { udhaarStore } from '../utils/udhaarStore';
import { bankStore } from '../utils/bankStore';
import { formatIndianDate, getLocalDateString } from '../utils/dateUtils';
import AnimatedNumber from '../components/AnimatedNumber';

const UdhaarAccount = () => {
  const [persons, setPersons] = useState([]);
  const [summary, setSummary] = useState({
    totalGiven: 0,
    totalReceived: 0,
    netPending: 0,
    totalReceivable: 0,
    totalPayable: 0,
    totalPersons: 0,
    activeAccounts: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Receivable', 'Payable', 'Settled'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rc_view_udhaar') || (window.innerWidth >= 768 ? 'cards' : 'cards');
  });

  // Modals state
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [personForm, setPersonForm] = useState({ name: '', phone: '', notes: '' });

  const [showTxModal, setShowTxModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedLedgerPerson, setSelectedLedgerPerson] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'person' | 'tx', id: '' }

  const [txForm, setTxForm] = useState({
    personId: '',
    type: 'Debit', // 'Debit' (You Gave) or 'Credit' (You Got)
    amount: '',
    bankAccountId: '',
    date: getLocalDateString(),
    note: ''
  });

  const loadData = () => {
    const list = udhaarStore.getPersons();
    setPersons(list);
    setSummary(udhaarStore.getDashboardSummary());

    if (selectedLedgerPerson) {
      const refreshed = udhaarStore.getPersonById(selectedLedgerPerson.id);
      setSelectedLedgerPerson(refreshed);
      setLedgerTransactions(udhaarStore.getTransactions(selectedLedgerPerson.id));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('udhaarStoreUpdated', loadData);
    return () => window.removeEventListener('udhaarStoreUpdated', loadData);
  }, [selectedLedgerPerson?.id]);

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rc_view_udhaar', mode);
  };

  // Filtered persons
  const filteredPersons = useMemo(() => {
    return persons.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.phone && p.phone.includes(searchQuery));
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [persons, searchQuery, statusFilter]);

  // Open Add / Edit Person Modal
  const openPersonModal = (person = null) => {
    if (person) {
      setEditingPerson(person);
      setPersonForm({ name: person.name, phone: person.phone || '', notes: person.notes || '' });
    } else {
      setEditingPerson(null);
      setPersonForm({ name: '', phone: '', notes: '' });
    }
    setShowPersonModal(true);
  };

  const handleSavePerson = (e) => {
    e.preventDefault();
    if (!personForm.name.trim()) return;

    udhaarStore.savePerson({
      ...(editingPerson ? { id: editingPerson.id } : {}),
      name: personForm.name.trim(),
      phone: personForm.phone.trim(),
      notes: personForm.notes.trim()
    });

    setShowPersonModal(false);
  };

  // Open Add Transaction Modal
  const openTxModal = (personId = '', defaultType = 'Debit') => {
    const defBankId = bankStore.getDefaultAccount()?.id || bankAccounts[0]?.id || '';
    setTxForm({
      personId: personId || (persons[0]?.id || ''),
      type: defaultType,
      amount: '',
      bankAccountId: defBankId,
      date: getLocalDateString(),
      note: ''
    });
    setShowTxModal(true);
  };

  const handleSaveTx = (e) => {
    e.preventDefault();
    if (!txForm.personId || !Number(txForm.amount)) return;

    udhaarStore.addTransaction({
      personId: txForm.personId,
      type: txForm.type,
      amount: Number(txForm.amount),
      bankAccountId: txForm.bankAccountId || null,
      date: txForm.date || getLocalDateString(),
      note: txForm.note.trim()
    });

    setShowTxModal(false);
  };

  // Open Ledger Modal
  const openLedgerModal = (person) => {
    setSelectedLedgerPerson(person);
    setLedgerTransactions(udhaarStore.getTransactions(person.id));
  };

  // Delete Handlers
  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'person') {
      udhaarStore.deletePerson(deleteConfirm.id);
      if (selectedLedgerPerson?.id === deleteConfirm.id) {
        setSelectedLedgerPerson(null);
      }
    } else if (deleteConfirm.type === 'tx') {
      udhaarStore.deleteTransaction(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  // WhatsApp Share Ledger
  const handleShareWhatsApp = (person) => {
    const cleanPhone = (person.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let balanceMsg = '';
    if (person.netBalance > 0) {
      balanceMsg = `*₹${person.netBalance.toLocaleString('en-IN')} Baki Hai (Lena Hai)*`;
    } else if (person.netBalance < 0) {
      balanceMsg = `*₹${Math.abs(person.netBalance).toLocaleString('en-IN')} Baki Hai (Dena Hai)*`;
    } else {
      balanceMsg = `*Hisab Barabar (Settled - ₹0)*`;
    }

    const text = `Namaskar ${person.name} ji,\n\nAapka Udhaar / Hisab-Kitab Statement:\n-----------------------------\n` +
      `🔺 Total Diya (Debit): ₹${person.totalDebit.toLocaleString('en-IN')}\n` +
      `🔻 Total Wapas Mila (Credit): ₹${person.totalCredit.toLocaleString('en-IN')}\n` +
      `💰 Current Status: ${balanceMsg}\n-----------------------------\n` +
      `Kripya check kar lijiye. Dhanyawaad! 🙏`;

    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-4 animate-fadeIn">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <MdCompareArrows className="text-primary" size={28} /> Udhaar Account
            </h3>
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill small fw-semibold">
              Khatabook
            </span>
          </div>
          <p className="text-muted small mb-0">
            Personal peer-to-peer lending, debit/credit ledger, automatic remaining balance & hisab-kitab
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-md-auto">
          <button
            className="btn btn-outline-primary rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
            onClick={() => openPersonModal()}
          >
            <MdPersonAdd size={18} /> Add Person
          </button>
          <button
            className="btn btn-primary rounded-3 px-3.5 py-2 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => openTxModal()}
            disabled={persons.length === 0}
          >
            <MdAddCircle size={18} /> New Transaction
          </button>
        </div>
      </div>

      {/* Dashboard KPI Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Total Given (Debit) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Total Given (Diya)
              </span>
              <div className="rounded-3 p-2 bg-danger bg-opacity-10 text-danger">
                <MdArrowUpward size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-danger mb-1">
              ₹<AnimatedNumber value={summary.totalGiven} />
            </h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              Total Debited across all accounts
            </small>
          </div>
        </div>

        {/* Total Received (Credit) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Total Received (Liya)
              </span>
              <div className="rounded-3 p-2 bg-success bg-opacity-10 text-success">
                <MdArrowDownward size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-success mb-1">
              ₹<AnimatedNumber value={summary.totalReceived} />
            </h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              Total Credited / Wapas mila
            </small>
          </div>
        </div>

        {/* Total Pending / Net Balance */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Net Pending Balance
              </span>
              <div className={`rounded-3 p-2 ${summary.netPending >= 0 ? 'bg-primary bg-opacity-10 text-primary' : 'bg-warning bg-opacity-10 text-warning'}`}>
                <MdCompareArrows size={20} />
              </div>
            </div>
            <h3 className={`fw-bold mb-1 ${summary.netPending >= 0 ? 'text-primary' : 'text-warning'}`}>
              ₹<AnimatedNumber value={Math.abs(summary.netPending)} />
            </h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {summary.netPending >= 0 ? 'Net Receivable (Lena Hai)' : 'Net Payable (Dena Hai)'}
            </small>
          </div>
        </div>

        {/* Active Khatas */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Active Accounts
              </span>
              <div className="rounded-3 p-2 bg-info bg-opacity-10 text-info">
                <MdReceiptLong size={20} />
              </div>
            </div>
            <h3 className="fw-bold text-dark mb-1">
              <AnimatedNumber value={summary.activeAccounts} /> / {summary.totalPersons}
            </h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              Persons with pending balances
            </small>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4">
        <div className="row g-3 align-items-center justify-content-between">
          <div className="col-12 col-md-5 col-lg-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <MdSearch size={18} />
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0 ps-0"
                placeholder="Search person by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-light border" type="button" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-7 col-lg-8 d-flex flex-wrap align-items-center justify-content-md-end gap-2">
            <div className="btn-group btn-group-sm bg-light p-1 rounded-3 border" role="group">
              {[
                { id: 'All', label: 'All Accounts' },
                { id: 'Receivable', label: 'Lena Hai (Receivable)' },
                { id: 'Payable', label: 'Dena Hai (Payable)' },
                { id: 'Settled', label: 'Settled (Barabar)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn btn-sm rounded-2 fw-semibold px-2.5 py-1 ${statusFilter === tab.id ? 'btn-white bg-white text-primary shadow-2xs' : 'text-muted border-0'}`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="btn-group btn-group-sm bg-light p-1 rounded-3 border">
              <button
                type="button"
                className={`btn btn-sm rounded-2 ${viewMode === 'cards' ? 'bg-white text-primary shadow-2xs fw-bold' : 'text-muted border-0'}`}
                onClick={() => handleSetViewMode('cards')}
                title="Grid Cards View"
              >
                <MdViewModule size={18} />
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-2 ${viewMode === 'table' ? 'bg-white text-primary shadow-2xs fw-bold' : 'text-muted border-0'}`}
                onClick={() => handleSetViewMode('table')}
                title="Table View"
              >
                <MdViewList size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persons View */}
      {filteredPersons.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 bg-white text-center">
          <div className="text-muted mb-3 opacity-50">
            <MdCompareArrows size={48} />
          </div>
          <h5 className="fw-bold text-dark mb-1">No Udhaar Accounts Found</h5>
          <p className="text-muted small mb-4">
            {searchQuery || statusFilter !== 'All' 
              ? 'Try adjusting your search query or status filter.' 
              : 'Add your first contact/person to track personal lending and udhaar hisab-kitab.'}
          </p>
          <div>
            <button className="btn btn-primary rounded-3 px-4 fw-bold shadow-sm" onClick={() => openPersonModal()}>
              <MdPersonAdd size={18} className="me-1" /> Add First Person
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="row g-3">
          {filteredPersons.map(person => {
            const isReceivable = person.netBalance > 0;
            const isPayable = person.netBalance < 0;
            const isSettled = person.netBalance === 0;

            const badgeBg = isReceivable 
              ? 'bg-success bg-opacity-10 text-success border-success' 
              : isPayable 
              ? 'bg-danger bg-opacity-10 text-danger border-danger' 
              : 'bg-secondary bg-opacity-10 text-secondary border-secondary';

            const statusLabel = isReceivable ? 'Lena Hai' : isPayable ? 'Dena Hai' : 'Settled';

            return (
              <div key={person.id} className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column transition-all hover-shadow">
                  {/* Card Top: Person Info */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-2xs flex-shrink-0"
                        style={{
                          width: 44,
                          height: 44,
                          fontSize: '1rem',
                          background: isReceivable 
                            ? 'linear-gradient(135deg, #10b981, #059669)' 
                            : isPayable 
                            ? 'linear-gradient(135deg, #f97316, #dc2626)' 
                            : 'linear-gradient(135deg, #64748b, #475569)'
                        }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h6 className="fw-bold text-dark mb-0 text-truncate">{person.name}</h6>
                        <small className="text-muted d-flex align-items-center gap-1 font-monospace" style={{ fontSize: '0.72rem' }}>
                          <MdPhone size={12} /> {person.phone || 'No mobile'}
                        </small>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-1">
                      <button
                        className="btn btn-sm btn-light rounded-circle p-1.5 text-muted"
                        title="Edit Person"
                        onClick={() => openPersonModal(person)}
                      >
                        <MdEdit size={15} />
                      </button>
                      <button
                        className="btn btn-sm btn-light rounded-circle p-1.5 text-danger"
                        title="Delete Person"
                        onClick={() => setDeleteConfirm({ type: 'person', id: person.id, name: person.name })}
                      >
                        <MdDelete size={15} />
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Stats Matrix */}
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="row text-center g-2 align-items-center">
                      <div className="col-4 border-end">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Total Debit (Diya)</small>
                        <strong className="text-danger small">₹{person.totalDebit.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="col-4 border-end">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Total Credit (Liya)</small>
                        <strong className="text-success small">₹{person.totalCredit.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="col-4">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Remaining</small>
                        <strong className={`small ${isReceivable ? 'text-primary' : isPayable ? 'text-danger' : 'text-secondary'}`}>
                          ₹{Math.abs(person.netBalance).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Status & Last Activity */}
                  <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                    <span className={`badge border px-2.5 py-1 rounded-pill small fw-bold ${badgeBg}`}>
                      {statusLabel} • ₹{Math.abs(person.netBalance).toLocaleString('en-IN')}
                    </span>
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {person.txCount} {person.txCount === 1 ? 'transaction' : 'transactions'}
                    </small>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="d-flex flex-wrap gap-2 mt-auto pt-2 border-top">
                    <button
                      className="btn btn-outline-danger btn-sm rounded-3 fw-bold py-1.5 d-flex align-items-center justify-content-center gap-1"
                      style={{ flex: '1 1 auto' }}
                      title="Maine Diya (Debit Entry)"
                      onClick={() => openTxModal(person.id, 'Debit')}
                    >
                      <MdArrowUpward size={14} /> Diya
                    </button>
                    <button
                      className="btn btn-outline-success btn-sm rounded-3 fw-bold py-1.5 d-flex align-items-center justify-content-center gap-1"
                      style={{ flex: '1 1 auto' }}
                      title="Maine Liya (Credit Entry)"
                      onClick={() => openTxModal(person.id, 'Credit')}
                    >
                      <MdArrowDownward size={14} /> Mila
                    </button>
                    <button
                      className="btn btn-primary btn-sm rounded-3 fw-bold py-1.5 d-flex align-items-center justify-content-center gap-1 shadow-2xs"
                      style={{ flex: '1.2 1 auto' }}
                      onClick={() => openLedgerModal(person)}
                    >
                      <MdHistory size={15} /> Ledger
                    </button>
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
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4 py-3">Person Name</th>
                  <th className="py-3">Mobile Number</th>
                  <th className="py-3">Total Debit (Diya)</th>
                  <th className="py-3">Total Credit (Liya)</th>
                  <th className="py-3">Remaining Balance</th>
                  <th className="py-3">Status</th>
                  <th className="text-end pe-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersons.map(person => {
                  const isReceivable = person.netBalance > 0;
                  const isPayable = person.netBalance < 0;

                  return (
                    <tr key={person.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2.5">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-2xs flex-shrink-0"
                            style={{ width: 34, height: 34, fontSize: '0.85rem', background: '#0d6efd' }}
                          >
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{person.name}</div>
                            <small className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>{person.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-muted font-monospace small">{person.phone || '-'}</span>
                      </td>
                      <td>
                        <strong className="text-danger small">₹{person.totalDebit.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>
                        <strong className="text-success small">₹{person.totalCredit.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>
                        <strong className={isReceivable ? 'text-primary' : isPayable ? 'text-danger' : 'text-secondary'}>
                          ₹{Math.abs(person.netBalance).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge border px-2.5 py-1 rounded-pill small fw-bold ${
                          isReceivable 
                            ? 'bg-success bg-opacity-10 text-success border-success' 
                            : isPayable 
                            ? 'bg-danger bg-opacity-10 text-danger border-danger' 
                            : 'bg-secondary bg-opacity-10 text-secondary border-secondary'
                        }`}>
                          {isReceivable ? 'Lena Hai' : isPayable ? 'Dena Hai' : 'Settled'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm rounded-3 px-2 py-1 fw-bold"
                            title="Maine Diya (Debit)"
                            onClick={() => openTxModal(person.id, 'Debit')}
                          >
                            + Diya
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm rounded-3 px-2 py-1 fw-bold"
                            title="Maine Liya (Credit)"
                            onClick={() => openTxModal(person.id, 'Credit')}
                          >
                            + Mila
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-3 px-2 py-1 fw-semibold d-flex align-items-center gap-1"
                            title="View Ledger"
                            onClick={() => openLedgerModal(person)}
                          >
                            <MdHistory size={14} /> Ledger
                          </button>
                          <button
                            type="button"
                            className="btn btn-light btn-sm rounded-3 p-1.5 text-muted"
                            title="Edit"
                            onClick={() => openPersonModal(person)}
                          >
                            <MdEdit size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-light btn-sm rounded-3 p-1.5 text-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm({ type: 'person', id: person.id, name: person.name })}
                          >
                            <MdDelete size={15} />
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

      {/* MODAL 1: ADD / EDIT PERSON */}
      {showPersonModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdPersonAdd className="text-primary" /> {editingPerson ? 'Edit Person Account' : 'Add New Person Account'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowPersonModal(false)}></button>
              </div>

              <form onSubmit={handleSavePerson}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Person Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Amit Kumar"
                      value={personForm.name}
                      onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Mobile Number (Optional)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={personForm.phone}
                      onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>
                      Used for sending WhatsApp reminders and statements
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Notes / Relation (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Neighbor, Client, Colleague"
                      value={personForm.notes}
                      onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setShowPersonModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 fw-bold">
                    {editingPerson ? 'Update Account' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TRANSACTION (DEBIT / CREDIT) */}
      {showTxModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdCompareArrows className="text-primary" /> New Udhaar Transaction
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowTxModal(false)}></button>
              </div>

              <form onSubmit={handleSaveTx}>
                <div className="modal-body p-4">
                  {/* Select Person */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Select Person *</label>
                    <select
                      className="form-select fw-semibold"
                      value={txForm.personId}
                      onChange={(e) => setTxForm({ ...txForm, personId: e.target.value })}
                      required
                    >
                      {persons.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ''} — Bal: ₹{p.netBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Type Buttons */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted d-block">Transaction Type *</label>
                    <div className="row g-2">
                      <div className="col-6">
                        <button
                          type="button"
                          className={`btn w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-1.5 ${
                            txForm.type === 'Debit' 
                              ? 'btn-danger shadow-sm' 
                              : 'btn-outline-danger'
                          }`}
                          onClick={() => setTxForm({ ...txForm, type: 'Debit' })}
                        >
                          <MdArrowUpward size={18} /> Maine Diya (Debit)
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className={`btn w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-1.5 ${
                            txForm.type === 'Credit' 
                              ? 'btn-success shadow-sm' 
                              : 'btn-outline-success'
                          }`}
                          onClick={() => setTxForm({ ...txForm, type: 'Credit' })}
                        >
                          <MdArrowDownward size={18} /> Maine Liya (Credit)
                        </button>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-1 text-center" style={{ fontSize: '0.72rem' }}>
                      {txForm.type === 'Debit' ? 'Money given to person (You will receive)' : 'Money received from person (Part / Full payment)'}
                    </small>
                  </div>

                  {/* Amount & Date */}
                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label small fw-semibold text-muted">Amount (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control fw-bold"
                          placeholder="0"
                          min="1"
                          step="any"
                          value={txForm.amount}
                          onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="col-5">
                      <label className="form-label small fw-semibold text-muted">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={txForm.date}
                        onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">
                      {txForm.type === 'Debit' ? 'Given From Bank Account' : 'Received Into Bank Account'}
                    </label>
                    <select
                      className="form-select fw-semibold"
                      value={txForm.bankAccountId}
                      onChange={(e) => setTxForm({ ...txForm, bankAccountId: e.target.value })}
                    >
                      <option value="">-- None / Direct Cash --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.accountNumber ? `..${b.accountNumber.slice(-4)}` : b.accountType}) - Bal: ₹{Number(b.currentBalance).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>
                      {txForm.type === 'Debit' ? 'Decreases bank balance' : 'Increases bank balance'}
                    </small>
                  </div>

                  {/* Note / Remarks */}
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Note / Reason (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Cash, GPay, Food bill share, etc."
                      value={txForm.note}
                      onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-3 fw-semibold" onClick={() => setShowTxModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className={`btn rounded-3 px-4 fw-bold ${txForm.type === 'Debit' ? 'btn-danger' : 'btn-success'}`}
                  >
                    Save {txForm.type === 'Debit' ? 'Debit Entry' : 'Credit Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PERSON DETAILED LEDGER (PASSBOOK) */}
      {selectedLedgerPerson && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Ledger Modal Header */}
              <div className="modal-header border-0 bg-primary text-white py-3 px-4">
                <div className="d-flex align-items-center gap-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold bg-white text-primary border border-2 border-white shadow-sm"
                    style={{ width: 46, height: 46, fontSize: '1.1rem' }}
                  >
                    {selectedLedgerPerson.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">{selectedLedgerPerson.name} — Khata Ledger</h5>
                    <small className="opacity-90 font-monospace">
                      {selectedLedgerPerson.phone ? `📱 ${selectedLedgerPerson.phone} • ` : ''}ID: {selectedLedgerPerson.id}
                    </small>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedLedgerPerson(null)}></button>
              </div>

              <div className="modal-body p-4 bg-light">
                {/* Ledger Summary Box */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Total Debit (You Gave)</small>
                      <h4 className="fw-bold text-danger mb-0">₹{selectedLedgerPerson.totalDebit.toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Total Credit (You Received)</small>
                      <h4 className="fw-bold text-success mb-0">₹{selectedLedgerPerson.totalCredit.toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                      <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Remaining Balance</small>
                      <h4 className={`fw-bold mb-0 ${selectedLedgerPerson.netBalance > 0 ? 'text-primary' : selectedLedgerPerson.netBalance < 0 ? 'text-danger' : 'text-secondary'}`}>
                        ₹{Math.abs(selectedLedgerPerson.netBalance).toLocaleString('en-IN')}
                        <span className="fs-6 ms-1.5 fw-semibold text-muted">
                          ({selectedLedgerPerson.netBalance > 0 ? 'Lena Hai' : selectedLedgerPerson.netBalance < 0 ? 'Dena Hai' : 'Settled'})
                        </span>
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Quick Add Buttons in Ledger */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                    <MdHistory className="text-primary" /> Transaction Passbook History
                  </h6>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-danger rounded-3 px-3 fw-bold d-flex align-items-center gap-1"
                      onClick={() => openTxModal(selectedLedgerPerson.id, 'Debit')}
                    >
                      <MdArrowUpward size={14} /> + Diya (Debit)
                    </button>
                    <button
                      className="btn btn-sm btn-success rounded-3 px-3 fw-bold d-flex align-items-center gap-1"
                      onClick={() => openTxModal(selectedLedgerPerson.id, 'Credit')}
                    >
                      <MdArrowDownward size={14} /> + Mila (Credit)
                    </button>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
                  {ledgerTransactions.length === 0 ? (
                    <div className="p-4 text-center text-muted small">
                      No transactions recorded yet for this person. Click "+ Diya" or "+ Mila" above to add.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 small">
                        <thead className="bg-light text-muted">
                          <tr>
                            <th className="ps-3">Date</th>
                            <th>Type</th>
                            <th>Note / Details</th>
                            <th>Amount</th>
                            <th>Running Balance</th>
                            <th className="text-end pe-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerTransactions.map(tx => {
                            const isDebit = tx.type === 'Debit';
                            return (
                              <tr key={tx.id}>
                                <td className="ps-3 fw-medium text-muted">
                                  {formatIndianDate(tx.date)}
                                </td>
                                <td>
                                  <span className={`badge border px-2 py-0.5 rounded-pill ${isDebit ? 'bg-danger bg-opacity-10 text-danger border-danger' : 'bg-success bg-opacity-10 text-success border-success'}`}>
                                    {isDebit ? '🔺 Diya (Debit)' : '🔻 Mila (Credit)'}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-dark fw-medium">{tx.note || '-'}</span>
                                </td>
                                <td>
                                  <strong className={isDebit ? 'text-danger' : 'text-success'}>
                                    {isDebit ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                                  </strong>
                                </td>
                                <td>
                                  <span className={`fw-bold ${tx.runningBalance > 0 ? 'text-primary' : tx.runningBalance < 0 ? 'text-danger' : 'text-secondary'}`}>
                                    ₹{Math.abs(tx.runningBalance).toLocaleString('en-IN')}
                                    <small className="text-muted fw-normal ms-1">
                                      {tx.runningBalance > 0 ? '(Lena)' : tx.runningBalance < 0 ? '(Dena)' : '(Clear)'}
                                    </small>
                                  </span>
                                </td>
                                <td className="text-end pe-3">
                                  <button
                                    className="btn btn-sm btn-light rounded-circle p-1 text-danger"
                                    title="Delete Transaction"
                                    onClick={() => setDeleteConfirm({ type: 'tx', id: tx.id })}
                                  >
                                    <MdDelete size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Ledger Modal Footer */}
              <div className="modal-footer border-0 bg-light py-3 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-success rounded-3 px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => handleShareWhatsApp(selectedLedgerPerson)}
                >
                  <MdSend size={16} /> Share on WhatsApp
                </button>
                <button type="button" className="btn btn-secondary rounded-3 px-4 fw-semibold" onClick={() => setSelectedLedgerPerson(null)}>
                  Close Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1080 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 p-4 text-center">
              <div className="text-danger mb-2">
                <MdDelete size={40} />
              </div>
              <h6 className="fw-bold text-dark">
                {deleteConfirm.type === 'person' ? 'Delete Person Account?' : 'Delete Transaction?'}
              </h6>
              <p className="small text-muted mb-3">
                {deleteConfirm.type === 'person' 
                  ? `Deleting ${deleteConfirm.name || 'this person'} will also erase their complete transaction ledger!`
                  : 'This entry will be permanently removed and the remaining balance will be recalculated.'}
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light border btn-sm rounded-3 px-3 fw-semibold" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm rounded-3 px-3 fw-bold" onClick={handleDeleteConfirm}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UdhaarAccount;
