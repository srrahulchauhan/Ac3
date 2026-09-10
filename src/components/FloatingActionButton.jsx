import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MdAdd, MdPersonAdd, MdAccountBalance, MdPayment, MdFileUpload,
  MdBarChart, MdCalendarToday, MdDownload, MdReceiptLong, MdMoneyOff, MdClose,
  MdAccountBalanceWallet, MdHandshake, MdRestaurant, MdDirectionsCar, MdReceipt,
  MdLocalHospital, MdShoppingBag, MdMoreHoriz
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { bankStore } from '../utils/bankStore';
import { getLocalDateString, addMonthsToDate } from '../utils/dateUtils';

const LOAN_TYPES = [
  'Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card', 'Other Loan'
];

const EXPENSE_CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: <MdRestaurant size={18} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'Travel', label: 'Travel & Fuel', icon: <MdDirectionsCar size={18} />, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'Bills', label: 'Bills & Utilities', icon: <MdReceipt size={18} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'Shopping', label: 'Shopping', icon: <MdShoppingBag size={18} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  { id: 'Health', label: 'Health & Medical', icon: <MdLocalHospital size={18} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  { id: 'Other', label: 'Other Expenses', icon: <MdMoreHoriz size={18} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
];

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Data lists for dropdowns
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'Food',
    date: getLocalDateString(),
    bankAccountId: '',
    paymentMethod: 'UPI',
    notes: ''
  });

  // Customer Form State
  const [custForm, setCustForm] = useState({
    id: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
    name: '',
    phone: '',
    email: '',
    address: '',
    panAadhaar: '',
    dob: '',
    employment: '',
    monthlyIncome: '',
    profilePhoto: ''
  });

  // Loan Form State
  const [loanForm, setLoanForm] = useState({
    loanName: '',
    customerId: '',
    type: 'Home Loan',
    totalAmount: '',
    emiAmount: '',
    startDate: getLocalDateString(),
    tenureMonths: 12,
    dueDate: addMonthsToDate(getLocalDateString(), 1),
    bankAccountId: '',
    notes: ''
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    loanId: '',
    amount: '',
    bankAccountId: '',
    paymentType: 'Regular',
    advanceMonths: 1,
    paidDate: getLocalDateString(),
    paymentMethod: 'UPI',
    notes: ''
  });

  // Sync selectors data from loanStore and bankStore
  const loadSelectorData = () => {
    const custs = loanStore.getCustomers();
    const lns = loanStore.getLoans();
    const banks = bankStore.getAccounts();
    setCustomers(custs);
    setLoans(lns);
    setBankAccounts(banks);
    const defBankId = bankStore.getDefaultAccount()?.id || (banks[0]?.id || '');
    if (!paymentForm.bankAccountId && defBankId) {
      setPaymentForm(prev => ({ ...prev, bankAccountId: defBankId }));
    }
    if (!expenseForm.bankAccountId && defBankId) {
      setExpenseForm(prev => ({ ...prev, bankAccountId: defBankId }));
    }
  };

  useEffect(() => {
    if (isOpen || activeModal) {
      loadSelectorData();
    }
  }, [isOpen, activeModal]);

  // Global listener to trigger modal from Dashboard or any page
  useEffect(() => {
    const handleOpenPayment = () => {
      loadSelectorData();
      setIsOpen(false);
      setActiveModal('payment');
    };
    window.addEventListener('openRecordPaymentModal', handleOpenPayment);
    return () => window.removeEventListener('openRecordPaymentModal', handleOpenPayment);
  }, []);

  const handleLoanFormChange = (e) => {
    const { name, value } = e.target;
    setLoanForm(prev => {
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustForm(prev => ({ ...prev, profilePhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Save Customer
  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!custForm.name?.trim()) return;

    loanStore.addCustomer(custForm);
    setCustForm({ name: '', phone: '', email: '', address: '', panAadhar: '' });
    setActiveModal(null);
    setIsOpen(false);
  };

  // 2. Save Loan
  const handleSaveLoan = (e) => {
    e.preventDefault();
    if (!loanForm.loanName?.trim()) {
      return;
    }

    const selectedCust = customers.find(c => c.id === loanForm.customerId);
    const finalCustId = loanForm.customerId || (selectedCust?.id || (customers[0]?.id || 'CUST-001'));
    const finalCustName = selectedCust ? selectedCust.name : (customers[0]?.name || 'Borrower');
    const totalAmt = loanForm.totalAmount !== '' && loanForm.totalAmount !== undefined ? Number(loanForm.totalAmount) : 0;
    const calculatedEmi = loanForm.emiAmount !== '' && loanForm.emiAmount !== undefined
      ? Number(loanForm.emiAmount)
      : (loanStore.calculateEmi(totalAmt, loanForm.tenureMonths) || 0);

    loanStore.saveLoan({
      ...loanForm,
      customerId: finalCustId,
      customerName: finalCustName,
      totalAmount: totalAmt,
      tenureMonths: Number(loanForm.tenureMonths || 12),
      emiAmount: calculatedEmi,
    });

    setLoanForm({
      customerId: '',
      loanName: '',
      totalAmount: '',
      tenureMonths: '12',
      emiAmount: '',
      startDate: getLocalDateString(),
      dueDate: addMonthsToDate(getLocalDateString(), 1),
      notes: ''
    });
    setActiveModal(null);
    setIsOpen(false);
  };

  // 3. Save EMI Payment
  const handleSavePayment = (e) => {
    e.preventDefault();
    if (!paymentForm.loanId) return;

    const selectedLoan = loans.find(l => l.id === paymentForm.loanId);
    if (!selectedLoan) return;

    const isAdvance = paymentForm.paymentType === 'Advance';
    const finalAmount = Number(paymentForm.amount || selectedLoan.emiAmount);
    const advMonths = isAdvance ? Number(paymentForm.advanceMonths || 1) : 1;
    const nextDueDate = addMonthsToDate(selectedLoan.dueDate || getLocalDateString(), isAdvance ? advMonths + 1 : 1);

    // Find if there is an upcoming payment record or create new
    const existingPayments = loanStore.getPayments().filter(p => p.loanId === selectedLoan.id && p.status !== 'Paid');
    const targetBankId = paymentForm.bankAccountId || bankStore.getDefaultAccount()?.id || bankAccounts[0]?.id || null;

    if (existingPayments.length > 0) {
      loanStore.markPaymentAsPaid(existingPayments[0].id, {
        paidDate: paymentForm.paidDate,
        amount: finalAmount,
        bankAccountId: targetBankId,
        paymentMethod: isAdvance ? 'Advance Payment' : paymentForm.paymentMethod,
        nextDueDate: nextDueDate,
        notes: paymentForm.notes || (isAdvance ? `Advance EMI payment for ${advMonths} month(s)` : 'Direct EMI Payment')
      });
    } else {
      const newPayId = 'PAY-' + Math.floor(1000 + Math.random() * 9000);
      loanStore.addPaymentRecord({
        id: newPayId,
        loanId: selectedLoan.id,
        customerId: selectedLoan.customerId,
        customerName: selectedLoan.customerName,
        loanName: selectedLoan.loanName,
        amount: finalAmount,
        bankAccountId: targetBankId,
        paidDate: paymentForm.paidDate,
        dueDate: selectedLoan.dueDate,
        paymentMethod: isAdvance ? 'Advance Payment' : paymentForm.paymentMethod,
        notes: paymentForm.notes || (isAdvance ? `Advance EMI payment for ${advMonths} month(s)` : 'Direct EMI Payment'),
        status: 'Paid'
      });
      if (targetBankId) {
        bankStore.syncModuleTransaction('EMI_PAYMENT', newPayId, {
          bankAccountId: targetBankId,
          type: 'Credit',
          amount: finalAmount,
          date: paymentForm.paidDate,
          category: 'EMI Collection',
          description: `EMI Collection: ${selectedLoan.customerName} (${selectedLoan.loanName})`,
          paymentMethod: paymentForm.paymentMethod
        });
      }
    }

    setActiveModal(null);
    setIsOpen(false);
  };

  // 4. Save Daily Expense
  const handleSaveExpense = (e) => {
    e.preventDefault();
    const val = Number(expenseForm.amount);
    if (!val || val <= 0) return;

    const selectedBankId = expenseForm.bankAccountId || bankStore.getDefaultAccount()?.id || (bankAccounts[0]?.id || null);
    const newExpId = Date.now().toString();
    const newExp = {
      id: newExpId,
      amount: val,
      category: expenseForm.category || 'Food',
      date: expenseForm.date || getLocalDateString(),
      bankAccountId: selectedBankId,
      paymentMethod: expenseForm.paymentMethod || 'UPI',
      notes: expenseForm.notes || ''
    };

    try {
      const existing = JSON.parse(localStorage.getItem('daily_expenses_tracker') || '[]');
      localStorage.setItem('daily_expenses_tracker', JSON.stringify([newExp, ...existing]));
      window.dispatchEvent(new Event('expensesUpdated'));
    } catch (err) {
      console.error(err);
    }

    if (selectedBankId) {
      bankStore.syncModuleTransaction('EXPENSE', newExpId, {
        bankAccountId: selectedBankId,
        type: 'Debit',
        amount: val,
        date: expenseForm.date || getLocalDateString(),
        category: `Expense - ${expenseForm.category || 'Other'}`,
        description: expenseForm.notes || `${expenseForm.category || 'Daily'} Expense`,
        paymentMethod: expenseForm.paymentMethod || 'UPI',
        notes: expenseForm.notes || ''
      });
    }

    setExpenseForm({
      amount: '',
      category: 'Food',
      date: getLocalDateString(),
      bankAccountId: '',
      paymentMethod: 'UPI',
      notes: ''
    });
    setActiveModal(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Circular Black '+' Button */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          zIndex: 1060 
        }}
      >
      <style>{`
        @keyframes fabRipple1 {
          0%   { transform: scale(1);   opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fabRipple2 {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes fabRipple3 {
          0%   { transform: scale(1);   opacity: 0.25; }
          100% { transform: scale(3.1); opacity: 0; }
        }
        @keyframes fabGlow {
          0%, 100% { box-shadow: 0 12px 28px rgba(15,23,42,0.45), 0 0 0 0 rgba(99,102,241,0.5); }
          50%       { box-shadow: 0 16px 36px rgba(15,23,42,0.6), 0 0 20px 6px rgba(99,102,241,0.35); }
        }
      `}</style>

      <div style={{ position: 'relative', width: '58px', height: '58px' }}>
        {/* Ripple rings - only show when closed */}
        {!isOpen && (
          <>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              backgroundColor: 'rgba(99,102,241,0.45)',
              animation: 'fabRipple1 2s ease-out infinite',
            }} />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              backgroundColor: 'rgba(99,102,241,0.3)',
              animation: 'fabRipple2 2s ease-out infinite 0.4s',
            }} />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              backgroundColor: 'rgba(99,102,241,0.18)',
              animation: 'fabRipple3 2s ease-out infinite 0.8s',
            }} />
          </>
        )}

        <button
          type="button"
          className="btn rounded-circle d-flex align-items-center justify-content-center p-0"
          style={{
            position: 'relative',
            width: '58px',
            height: '58px',
            backgroundColor: '#0f172a',
            border: '2px solid rgba(255,255,255,0.25)',
            color: '#ffffff',
            animation: !isOpen ? 'fabGlow 2.5s ease-in-out infinite' : 'none',
            transform: isOpen ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'pointer',
            zIndex: 1,
          }}
          onClick={() => setIsOpen(!isOpen)}
          title="New Entry Quick Options"
        >
          <MdAdd size={32} />
        </button>
      </div>
      </div>

      {/* ── Centered Full-Screen Quick Action Overlay ── */}
      {isOpen && !activeModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1055,
              backgroundColor: 'rgba(10,14,30,0.65)',
              backdropFilter: 'blur(6px)',
              animation: 'fabFadeIn 0.2s ease',
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1056,
            width: 'min(92vw, 560px)',
            animation: 'fabSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <style>{`
              @keyframes fabFadeIn   { from { opacity:0 } to { opacity:1 } }
              @keyframes fabSlideUp  { from { opacity:0; transform:translate(-50%,-44%) scale(0.94) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
            `}</style>

            <div style={{
              background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
              borderRadius: '24px',
              padding: '24px 20px 20px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
              color: '#fff',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', marginBottom:'2px' }}>RC Accountant</div>
                  <div style={{ fontSize:'1.15rem', fontWeight:800, color:'#fff' }}>Quick Actions</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', flexShrink:0 }}
                >
                  <MdClose size={20} />
                </button>
              </div>

              {/* Grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(135px, 1fr))', gap:'10px' }}>

                {[
                  { label:'Add Expense',    sub:'Record daily spending',   icon:<MdAccountBalanceWallet size={22}/>, color:'#0ea5e9', bg:'rgba(14,165,233,0.18)', action:() => { setIsOpen(false); setActiveModal('expense'); } },
                  { label:'Add Customer',   sub:'New borrower profile',    icon:<MdPersonAdd size={22}/>,            color:'#6366f1', bg:'rgba(99,102,241,0.18)', action:() => { setIsOpen(false); setActiveModal('customer'); } },
                  { label:'Add Loan',       sub:'Setup EMI loan account',   icon:<MdAccountBalance size={22}/>,      color:'#10b981', bg:'rgba(16,185,129,0.18)', action:() => { setIsOpen(false); setActiveModal('loan'); } },
                  { label:'Record Payment', sub:'Mark EMI as paid',         icon:<MdPayment size={22}/>,             color:'#f59e0b', bg:'rgba(245,158,11,0.18)', action:() => { setIsOpen(false); setActiveModal('payment'); } },
                  { label:'Bank Accounts',  sub:'Passbook & ATM cards',    icon:<MdAccountBalance size={22}/>,      color:'#06b6d4', bg:'rgba(6,182,212,0.18)',  action:() => { setIsOpen(false); navigate('/bank-accounts'); } },
                  { label:'Daily Expenses', sub:'Overview & Budget',       icon:<MdReceipt size={22}/>,              color:'#38bdf8', bg:'rgba(56,189,248,0.18)',  action:() => { setIsOpen(false); navigate('/daily-expenses'); } },
                  { label:'Udhaar Khata',   sub:'Given / Taken ledger',    icon:<MdHandshake size={22}/>,           color:'#f43f5e', bg:'rgba(244,63,94,0.18)',  action:() => { setIsOpen(false); navigate('/udhaar'); } },
                  { label:'EMI Payments',   sub:'View payment ledger',      icon:<MdReceiptLong size={22}/>,         color:'#3b82f6', bg:'rgba(59,130,246,0.18)', action:() => { setIsOpen(false); navigate('/emi-payments'); } },
                  { label:'Reports',        sub:'Analytics & insights',     icon:<MdBarChart size={22}/>,            color:'#8b5cf6', bg:'rgba(139,92,246,0.18)', action:() => { setIsOpen(false); navigate('/reports'); } },
                  { label:'Calendar',       sub:'EMI due schedule',         icon:<MdCalendarToday size={22}/>,       color:'#ec4899', bg:'rgba(236,72,153,0.18)', action:() => { setIsOpen(false); navigate('/calendar'); } },
                  { label:'Statements',     sub:'Account PDF reports',      icon:<MdFileUpload size={22}/>,          color:'#14b8a6', bg:'rgba(20,184,166,0.18)', action:() => { setIsOpen(false); navigate('/statements'); } },
                  { label:'Export Backup',  sub:'Download JSON data',       icon:<MdDownload size={22}/>,            color:'#f97316', bg:'rgba(249,115,22,0.18)', action:() => { setIsOpen(false); loanStore.exportBackup(); } },
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    style={{
                      background: item.bg,
                      border: `1px solid ${item.color}33`,
                      borderRadius: '16px',
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'transform 0.15s ease, background 0.15s ease',
                      animationDelay: `${i * 0.03}s`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ width:'38px', height:'38px', borderRadius:'12px', background:`${item.color}28`, display:'flex', alignItems:'center', justifyContent:'center', color:item.color, marginBottom:'8px' }}>
                      {item.icon}
                    </div>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#f1f5f9', marginBottom:'2px', lineHeight:1.2 }}>{item.label}</div>
                    <div style={{ fontSize:'0.66rem', color:'rgba(255,255,255,0.45)', lineHeight:1.2 }}>{item.sub}</div>
                  </button>
                ))}

              </div>
            </div>
          </div>
        </>
      )}

      {/* 1. Modal: Add New Customer */}
      {activeModal === 'customer' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdPersonAdd className="text-primary" /> Add New Customer Profile
                </h5>
                <button type="button" className="btn-close" onClick={() => setActiveModal(null)}></button>
              </div>

              <form onSubmit={handleSaveCustomer}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 text-center mb-2">
                      <div className="d-inline-block position-relative">
                        {custForm.profilePhoto ? (
                          <img src={custForm.profilePhoto} alt="Preview" className="rounded-circle border border-3 border-primary shadow-sm" style={{ width: 75, height: 75, objectFit: 'cover' }} />
                        ) : (
                          <div className="rounded-circle bg-primary bg-opacity-10 border border-primary border-opacity-25 d-flex align-items-center justify-content-center mx-auto text-primary" style={{ width: 75, height: 75, fontSize: '2rem' }}>
                            👤
                          </div>
                        )}
                        <label htmlFor="fabPhotoUpload" className="btn btn-sm btn-primary rounded-circle position-absolute bottom-0 end-0 p-1 shadow" style={{ width: 28, height: 28, cursor: 'pointer' }} title="Upload Photo">
                          <MdFileUpload size={16} />
                        </label>
                        <input id="fabPhotoUpload" type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload} />
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Customer ID</label>
                      <input type="text" className="form-control font-monospace fw-bold bg-light" value={custForm.id} readOnly />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Full Name *</label>
                      <input type="text" className="form-control" placeholder="Customer Full Name" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} required />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Mobile Number</label>
                      <input type="text" className="form-control" placeholder="+91 98765 43210" value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Email Address</label>
                      <input type="email" className="form-control" placeholder="name@example.com" value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">PAN / Aadhaar Number</label>
                      <input type="text" className="form-control font-monospace text-uppercase" placeholder="ABCDE1234F" value={custForm.panAadhaar} onChange={e => setCustForm({ ...custForm, panAadhaar: e.target.value })} />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Date of Birth</label>
                      <input type="date" className="form-control" value={custForm.dob} onChange={e => setCustForm({ ...custForm, dob: e.target.value })} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Occupation / Business</label>
                      <input type="text" className="form-control" placeholder="Business Owner / Engineer" value={custForm.employment} onChange={e => setCustForm({ ...custForm, employment: e.target.value })} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Monthly Income (₹)</label>
                      <input type="number" className="form-control fw-bold text-success" placeholder="85000" value={custForm.monthlyIncome} onChange={e => setCustForm({ ...custForm, monthlyIncome: e.target.value })} />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Residential Address</label>
                      <textarea className="form-control" rows="2" placeholder="Full residential street address, city, state..." value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })}></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 fw-bold shadow-sm">Save Customer Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Add New Loan */}
      {activeModal === 'loan' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdAccountBalance className="text-success" /> Add New EMI Loan Account
                </h5>
                <button type="button" className="btn-close" onClick={() => setActiveModal(null)}></button>
              </div>

              <form onSubmit={handleSaveLoan}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Select Borrower / Customer *</label>
                      <select className="form-select fw-semibold" name="customerId" value={loanForm.customerId} onChange={handleLoanFormChange} required>
                        <option value="">-- Choose Customer --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Loan Account Name *</label>
                      <input type="text" className="form-control" name="loanName" placeholder="e.g. HDFC Home Loan" value={loanForm.loanName} onChange={handleLoanFormChange} required />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Loan Type</label>
                      <select className="form-select" name="type" value={loanForm.type} onChange={handleLoanFormChange}>
                        {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">Total Loan Amount (₹) *</label>
                      <input type="number" className="form-control fw-bold" name="totalAmount" placeholder="500000" value={loanForm.totalAmount} onChange={handleLoanFormChange} required />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tenure (Months) *</label>
                      <input type="number" className="form-control" name="tenureMonths" value={loanForm.tenureMonths} onChange={handleLoanFormChange} required />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Monthly EMI Amount (₹) *</label>
                      <input type="number" className="form-control fw-bold text-success" name="emiAmount" value={loanForm.emiAmount} onChange={handleLoanFormChange} required />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold text-muted">Start Date</label>
                      <input type="date" className="form-control" name="startDate" value={loanForm.startDate} onChange={handleLoanFormChange} required />
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold text-muted mb-0">First EMI Due Date</label>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-pill px-2 py-0"
                            style={{ fontSize: '0.7rem', fontWeight: 700 }}
                            title="Set due date to +1 Month from Start Date"
                            onClick={() => setLoanForm(prev => ({ ...prev, dueDate: addMonthsToDate(prev.startDate || getLocalDateString(), 1) }))}
                          >
                            📅 +1 Month
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill px-2 py-0"
                            style={{ fontSize: '0.7rem', fontWeight: 700 }}
                            title="Keep same date as Start Date"
                            onClick={() => setLoanForm(prev => ({ ...prev, dueDate: prev.startDate || getLocalDateString() }))}
                          >
                            Same Date
                          </button>
                        </div>
                      </div>
                      <input type="date" className="form-control" name="dueDate" value={loanForm.dueDate} onChange={handleLoanFormChange} required />
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.68rem' }}>"+1 Month" ya "Same Date" click karke jaldi set karein</small>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted">Loan Notes & Terms</label>
                      <textarea className="form-control" rows="2" name="notes" placeholder="Additional loan notes or reference..." value={loanForm.notes} onChange={handleLoanFormChange}></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-3 px-4 fw-bold shadow-sm">Save Loan Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Add EMI Payment */}
      {activeModal === 'payment' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <MdPayment className="text-warning" /> Record EMI Payment
                </h5>
                <button type="button" className="btn-close" onClick={() => setActiveModal(null)}></button>
              </div>

              <form onSubmit={handleSavePayment}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Select Loan Account *</label>
                    <select 
                      className="form-select fw-bold" 
                      value={paymentForm.loanId} 
                      onChange={e => {
                        const selectedId = e.target.value;
                        const l = loans.find(x => x.id === selectedId);
                        setPaymentForm({ 
                          ...paymentForm, 
                          loanId: selectedId, 
                          amount: l ? l.emiAmount : '',
                        });
                      }}
                      required
                    >
                      <option value="">-- Choose Loan Account --</option>
                      {loans.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.loanName} ({l.customerName}) - ₹{Number(l.emiAmount).toLocaleString('en-IN')}/mo
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Type Selection */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted d-block mb-1">Collection Type</label>
                    <div className="btn-group w-100 bg-light p-1 rounded-3 border">
                      <button
                        type="button"
                        className={`btn btn-sm rounded-2 fw-bold ${paymentForm.paymentType === 'Regular' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                        onClick={() => {
                          const l = loans.find(x => x.id === paymentForm.loanId);
                          setPaymentForm({
                            ...paymentForm,
                            paymentType: 'Regular',
                            amount: l ? l.emiAmount : paymentForm.amount,
                            paymentMethod: 'UPI',
                            notes: 'Direct EMI Payment',
                          });
                        }}
                      >
                        💳 Regular EMI
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm rounded-2 fw-bold ${paymentForm.paymentType === 'Advance' ? 'btn-warning text-dark shadow-sm' : 'btn-light text-muted'}`}
                        onClick={() => {
                          const l = loans.find(x => x.id === paymentForm.loanId);
                          const baseAmt = l ? Number(l.emiAmount) : 0;
                          setPaymentForm({
                            ...paymentForm,
                            paymentType: 'Advance',
                            advanceMonths: 1,
                            amount: baseAmt > 0 ? baseAmt : paymentForm.amount,
                            paymentMethod: 'Advance Payment',
                            notes: 'Advance EMI payment for 1 month',
                          });
                        }}
                      >
                        ⚡ Advance Payment
                      </button>
                    </div>
                  </div>

                  {/* Advance Multiplier Pills */}
                  {paymentForm.paymentType === 'Advance' && (
                    <div className="p-2.5 bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="fw-bold text-dark">⚡ Advance Period:</small>
                        <small className="text-muted font-monospace">{paymentForm.advanceMonths} Mo</small>
                      </div>
                      <div className="d-flex gap-1.5 flex-wrap">
                        {[1, 2, 3, 6].map(m => {
                          const l = loans.find(x => x.id === paymentForm.loanId);
                          const calcAmt = l ? Number(l.emiAmount) * m : 0;
                          return (
                            <button
                              key={m}
                              type="button"
                              className={`btn btn-sm rounded-2 fw-bold px-2 py-1 ${
                                paymentForm.advanceMonths === m ? 'btn-warning text-dark shadow-2xs' : 'btn-white bg-white border text-dark'
                              }`}
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  advanceMonths: m,
                                  amount: calcAmt > 0 ? calcAmt : paymentForm.amount,
                                  notes: `Advance EMI payment for ${m} month(s)`,
                                });
                              }}
                            >
                              +{m} Mo {calcAmt > 0 ? `(₹${calcAmt.toLocaleString('en-IN')})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted">EMI Amount Paid (₹) *</label>
                      <input type="number" className="form-control fw-bold text-success" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                        <MdAccountBalance size={16} className="text-primary" /> Receiving Bank Account
                      </label>
                      <select
                        className="form-select fw-semibold"
                        value={paymentForm.bankAccountId}
                        onChange={e => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                      >
                        <option value="">-- Default Bank Account --</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.accountNumber ? `..${b.accountNumber.slice(-4)}` : b.accountType}) - Bal: ₹{Number(b.currentBalance).toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Payment Date</label>
                      <input type="date" className="form-control" value={paymentForm.paidDate} onChange={e => setPaymentForm({ ...paymentForm, paidDate: e.target.value })} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Payment Method</label>
                      <select className="form-select fw-semibold" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                        <option value="UPI">UPI / PhonePe / GPay</option>
                        <option value="Net Banking">Net Banking / NEFT</option>
                        <option value="Cash">Cash</option>
                        <option value="Advance Payment">⚡ Advance Payment</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>


                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Transaction Notes / Reference</label>
                    <input type="text" className="form-control" placeholder="Transaction ID or Cheque No." value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-warning rounded-3 px-4 fw-bold shadow-sm text-dark">
                    ✓ Confirm EMI Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Add Daily Expense Modal ── */}
      {activeModal === 'expense' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 rounded-3 text-white" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)' }}>
                    <MdAccountBalanceWallet size={20} />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Add Daily Expense</h5>
                    <small className="text-muted">Record daily personal or business expenditure</small>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setActiveModal(null)}></button>
              </div>

              <form onSubmit={handleSaveExpense}>
                <div className="modal-body p-4">
                  {/* Expense Amount */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Expense Amount (₹) *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-bold text-muted">₹</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control form-control-lg fw-bold text-primary" 
                        placeholder="0.00" 
                        value={expenseForm.amount} 
                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        required 
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Category *</label>
                    <div className="row g-2">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <div className="col-4" key={cat.id}>
                          <div 
                            className={`p-2 rounded-3 border text-center cursor-pointer transition-all ${expenseForm.category === cat.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-light'}`}
                            onClick={() => setExpenseForm({ ...expenseForm, category: cat.id })}
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
                    <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                      <MdAccountBalance size={16} className="text-primary" /> Paid From Bank Account
                    </label>
                    <select
                      className="form-select fw-semibold"
                      value={expenseForm.bankAccountId}
                      onChange={e => setExpenseForm({ ...expenseForm, bankAccountId: e.target.value })}
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
                      <label className="form-label small fw-semibold text-muted">Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={expenseForm.date} 
                        onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Payment Method</label>
                      <select 
                        className="form-select"
                        value={expenseForm.paymentMethod}
                        onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                      >
                        <option value="UPI">UPI / PhonePe / GPay</option>
                        <option value="Cash">Cash</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-1">
                    <label className="form-label small fw-semibold text-muted">Notes / Description (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Lunch thali, Uber to office, Groceries..." 
                      value={expenseForm.notes} 
                      onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light py-3 px-4">
                  <button type="button" className="btn btn-light border rounded-3 px-4 fw-semibold" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="btn text-white rounded-3 px-4 fw-bold shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)', border: 'none' }}
                  >
                    ✓ Save Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingActionButton;

