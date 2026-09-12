import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  MdPrint, MdPictureAsPdf, MdFileUpload, MdFilterList, 
  MdReceiptLong, MdSearch, MdBusiness, MdSend, MdRefresh,
  MdPerson, MdAccountBalance, MdCheckCircle, MdWarning, MdHourglassEmpty,
  MdCalendarToday, MdArrowForward, MdDownload
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { bankStore } from '../utils/bankStore';
import { getLocalDateString, formatIndianDate, addMonthsToDate } from '../utils/dateUtils';
import SendStatementModal from '../components/SendStatementModal';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const fmtAmt = (a) => a != null ? '₹' + Number(a).toLocaleString('en-IN') : '₹0';

const Statements = () => {
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);

  // Filters State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Communication Modal State
  const [commModal, setCommModal] = useState({ 
    open: false, 
    customerId: null, 
    loanId: null, 
    templateKey: 'loan_statement' 
  });

  // Mark Paid Modal state directly from statement
  const [markingPayment, setMarkingPayment] = useState(null);
  const [paidDetails, setPaidDetails] = useState({
    paidDate: getLocalDateString(),
    paymentMethod: 'UPI',
    bankAccountId: '',
    amount: '',
    notes: 'Payment received against statement',
  });

  const statementPrintRef = useRef(null);

  const loadData = () => {
    const custs = loanStore.getCustomers();
    const lns = loanStore.getLoans();
    const pays = loanStore.getPayments();
    const stt = loanStore.getSettings();
    const banks = bankStore.getAccounts();

    setCustomers(custs);
    setLoans(lns);
    setPayments(pays);
    setSettings(stt);
    setBankAccounts(banks);

    // Auto-select first customer if none selected and customers exist
    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
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

  // Handle Customer Selection Change
  const handleCustomerChange = (custId) => {
    setSelectedCustomerId(custId);
    setSelectedLoanId(''); // Reset loan selection to "All Loans" for new customer
  };

  // Quick Date Range Filter Handlers
  const handleQuickDateFilter = (rangeType) => {
    const today = new Date();
    const todayStr = getLocalDateString();
    
    if (rangeType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (rangeType === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (rangeType === '30days') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (rangeType === 'fy') {
      // Current Indian Financial Year (April 1 to March 31)
      const curYear = today.getFullYear();
      const startYear = today.getMonth() >= 3 ? curYear : curYear - 1;
      setStartDate(`${startYear}-04-01`);
      setEndDate(`${startYear + 1}-03-31`);
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setSearchQuery('');
  };

  // Selected Entities
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const customerLoans = loans.filter((l) => l.customerId === selectedCustomerId);
  const activeLoan = selectedLoanId ? customerLoans.find((l) => l.id === selectedLoanId) : null;

  // Build Comprehensive Itemized Statement Ledger
  const getStatementLedger = () => {
    const todayStr = getLocalDateString();

    // CASE 1: Specific Customer + Specific Loan Selected -> Build Full Loan Schedule & Match Payments
    if (activeCustomer && activeLoan) {
      const fullSchedule = loanStore.generateEmiSchedule(activeLoan);
      const loanPayments = payments.filter((p) => p.loanId === activeLoan.id);

      return fullSchedule.map((item, idx) => {
        // Match with actual paid payment record if exists
        const matchedPay = loanPayments.find(
          (p) => (p.status === 'Paid' && p.dueDate === item.dueDate) ||
                 (p.installmentNumber && Number(p.installmentNumber) === item.installmentNumber)
        ) || loanPayments[idx];

        const isPaid = matchedPay && matchedPay.status === 'Paid';
        const isOverdue = !isPaid && item.dueDate < todayStr;
        const currentStatus = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Upcoming';

        return {
          id: matchedPay?.id || `SCHED-${activeLoan.id}-${item.installmentNumber}`,
          installmentNo: item.installmentNumber,
          loanId: activeLoan.id,
          loanName: activeLoan.loanName,
          customerId: activeCustomer.id,
          customerName: activeCustomer.name,
          dueDate: item.dueDate,
          paidDate: matchedPay?.paidDate || (isPaid ? item.dueDate : ''),
          amount: matchedPay?.amount || item.emiAmount,
          paymentMethod: matchedPay?.paymentMethod || 'UPI',
          status: currentStatus,
          balance: item.remainingBalance,
          notes: matchedPay?.notes || (isPaid ? 'Paid' : `Installment ${item.installmentNumber} of ${activeLoan.tenureMonths}`),
          canMarkPaid: !isPaid,
        };
      });
    }

    // CASE 2: Specific Customer + All Loans -> Merge all customer payments & schedules
    if (activeCustomer) {
      if (customerLoans.length === 0) {
        return [];
      }

      let allRows = [];
      customerLoans.forEach((loan) => {
        const sched = loanStore.generateEmiSchedule(loan);
        const lPays = payments.filter((p) => p.loanId === loan.id);

        sched.forEach((item, idx) => {
          const matchedPay = lPays.find(
            (p) => (p.status === 'Paid' && p.dueDate === item.dueDate) ||
                   (p.installmentNumber && Number(p.installmentNumber) === item.installmentNumber)
          ) || lPays[idx];

          const isPaid = matchedPay && matchedPay.status === 'Paid';
          const isOverdue = !isPaid && item.dueDate < todayStr;
          const currentStatus = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Upcoming';

          allRows.push({
            id: matchedPay?.id || `SCHED-${loan.id}-${item.installmentNumber}`,
            installmentNo: item.installmentNumber,
            loanId: loan.id,
            loanName: loan.loanName,
            customerId: activeCustomer.id,
            customerName: activeCustomer.name,
            dueDate: item.dueDate,
            paidDate: matchedPay?.paidDate || (isPaid ? item.dueDate : ''),
            amount: matchedPay?.amount || item.emiAmount,
            paymentMethod: matchedPay?.paymentMethod || 'UPI',
            status: currentStatus,
            balance: item.remainingBalance,
            notes: matchedPay?.notes || `${loan.loanName} - EMI #${item.installmentNumber}`,
            canMarkPaid: !isPaid,
          });
        });
      });

      return allRows.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }

    // CASE 3: No Customer Selected -> Return all recorded payments across database
    return payments.map((p, idx) => ({
      id: p.id || `PAY-${idx}`,
      installmentNo: idx + 1,
      loanId: p.loanId,
      loanName: p.loanName,
      customerId: p.customerId,
      customerName: p.customerName,
      dueDate: p.dueDate,
      paidDate: p.paidDate || '',
      amount: Number(p.amount || 0),
      paymentMethod: p.paymentMethod || 'UPI',
      status: p.status,
      balance: '-',
      notes: p.notes || '',
      canMarkPaid: p.status !== 'Paid',
    }));
  };

  const rawLedger = getStatementLedger();

  // Apply User Search & Date/Status Filters to Ledger
  const statementLedger = rawLedger.filter((item) => {
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = 
        (item.loanName || '').toLowerCase().includes(q) ||
        (item.customerName || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        String(item.amount).includes(q);
    }

    let matchesStatus = !statusFilter || item.status === statusFilter;
    
    let matchesDate = true;
    const targetDate = item.paidDate || item.dueDate;
    if (startDate && targetDate && targetDate < startDate) matchesDate = false;
    if (endDate && targetDate && targetDate > endDate) matchesDate = false;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate High-Precision Metrics
  let totalLoanCapital = 0;
  let totalMonthlyEmi = 0;
  let totalPaidAmount = 0;
  let totalTenureMonths = 0;

  if (activeCustomer && activeLoan) {
    totalLoanCapital = Number(activeLoan.totalAmount || 0);
    totalMonthlyEmi = Number(activeLoan.emiAmount || 0);
    totalTenureMonths = Number(activeLoan.tenureMonths || 12);
  } else if (activeCustomer) {
    totalLoanCapital = customerLoans.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
    totalMonthlyEmi = customerLoans.reduce((sum, l) => sum + Number(l.emiAmount || 0), 0);
    totalTenureMonths = customerLoans.reduce((sum, l) => sum + Number(l.tenureMonths || 12), 0);
  } else {
    totalLoanCapital = loans.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
    totalMonthlyEmi = loans.reduce((sum, l) => sum + Number(l.emiAmount || 0), 0);
  }

  const paidRows = rawLedger.filter((r) => r.status === 'Paid');
  totalPaidAmount = paidRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const outstandingBalance = Math.max(0, totalLoanCapital - totalPaidAmount);

  const totalPaidEmis = paidRows.length;
  const totalEmisCount = rawLedger.length;
  const remainingEmis = Math.max(0, totalEmisCount - totalPaidEmis);

  // Next Upcoming Due Date & Amount
  const nextUpcoming = rawLedger.find((r) => r.status !== 'Paid' && r.dueDate);

  // Mark As Paid Actions
  const handleOpenMarkPaid = (item) => {
    const defaultBank = bankAccounts[0]?.id || '';
    setMarkingPayment(item);
    setPaidDetails({
      paidDate: getLocalDateString(),
      paymentMethod: item.paymentMethod || 'UPI',
      bankAccountId: defaultBank,
      amount: item.amount,
      notes: `Settled via Statement for ${item.loanName}`,
    });
  };

  const handleConfirmMarkPaid = (e) => {
    e.preventDefault();
    if (!markingPayment) return;

    // Check if real payment record exists or add new payment record
    const existing = payments.find((p) => p.id === markingPayment.id);
    if (existing) {
      loanStore.markPaymentAsPaid(existing.id, {
        paidDate: paidDetails.paidDate,
        paymentMethod: paidDetails.paymentMethod,
        bankAccountId: paidDetails.bankAccountId,
        amount: Number(paidDetails.amount),
        notes: paidDetails.notes,
      });
    } else {
      loanStore.addPaymentRecord({
        loanId: markingPayment.loanId,
        customerId: markingPayment.customerId,
        customerName: markingPayment.customerName,
        loanName: markingPayment.loanName,
        amount: Number(paidDetails.amount),
        paidDate: paidDetails.paidDate,
        dueDate: markingPayment.dueDate,
        paymentMethod: paidDetails.paymentMethod,
        bankAccountId: paidDetails.bankAccountId,
        notes: paidDetails.notes,
        status: 'Paid',
      });
    }

    setMarkingPayment(null);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export PDF using jsPDF + autoTable
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const custName = activeCustomer?.name || 'Customer';
    const loanTitle = activeLoan?.loanName || (customerLoans.length > 0 ? 'Consolidated Loans' : 'All Accounts');

    // Header Company Letterhead
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 110, 253);
    doc.text(settings.companyName || 'R Accountant', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 100, 115);
    doc.text(`Managed by: ${settings.ownerName || 'Accountant'} • ${settings.companyTagline || 'Smart Loan, EMI & Account Management'}`, 14, 24);
    doc.text(`Email: ${settings.email || 'support@raccountant.com'} | Phone: ${settings.phone || '+91 98765 43210'} | GST: ${settings.gstNumber || 'N/A'}`, 14, 29);
    if (settings.address) {
      doc.text(`Address: ${settings.address}`, 14, 34);
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 38, 196, 38);

    // Statement Header & Metadata
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STATEMENT OF ACCOUNT', 14, 46);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Date Generated: ${formatIndianDate(getLocalDateString())}`, 140, 46);
    doc.text(`Ref ID: STMT-${activeCustomer?.id || 'ALL'}-${getLocalDateString().replace(/-/g, '')}`, 140, 50);

    // Borrower & Loan Information Blocks
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    // Left Column: Borrower
    doc.setFont('helvetica', 'bold');
    doc.text('BORROWER DETAILS:', 14, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${activeCustomer?.name || 'All Customers Summary'}`, 14, 61);
    doc.text(`Customer ID: ${activeCustomer?.id || '-'}`, 14, 66);
    doc.text(`Mobile: ${activeCustomer?.phone || '-'}`, 14, 71);
    doc.text(`Email: ${activeCustomer?.email || '-'}`, 14, 76);

    // Right Column: Loan Summary
    doc.setFont('helvetica', 'bold');
    doc.text('LOAN SUMMARY:', 110, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Account: ${loanTitle}`, 110, 61);
    doc.text(`Total Capital: Rs. ${totalLoanCapital.toLocaleString('en-IN')}`, 110, 66);
    doc.text(`Total Paid: Rs. ${totalPaidAmount.toLocaleString('en-IN')}`, 110, 71);
    doc.text(`Outstanding Balance: Rs. ${outstandingBalance.toLocaleString('en-IN')}`, 110, 76);

    // Payment Ledger Table
    const tableRows = statementLedger.map((row) => [
      row.installmentNo,
      row.loanName || '-',
      formatIndianDate(row.dueDate),
      row.paidDate ? formatIndianDate(row.paidDate) : '-',
      `Rs. ${Number(row.amount).toLocaleString('en-IN')}`,
      row.paymentMethod || 'UPI',
      row.status,
      row.balance !== '-' ? `Rs. ${Number(row.balance).toLocaleString('en-IN')}` : '-'
    ]);

    autoTable(doc, {
      startY: 82,
      head: [['#', 'Loan Name', 'Due Date', 'Paid Date', 'EMI Amount', 'Method', 'Status', 'Balance']],
      body: tableRows,
      theme: 'striped',
      headStyles: { 
        fillColor: [13, 110, 253],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const finalY = (doc).lastAutoTable?.finalY || 200;

    // Footer note
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      settings.invoiceFooterMessage || 'This is a computer-generated account statement and does not require a physical signature.',
      14,
      Math.min(finalY + 12, 280)
    );
    doc.text(`Authorized by: ${settings.ownerName || 'Accountant'} (${settings.companyName || 'R Accountant'})`, 14, Math.min(finalY + 17, 285));

    doc.save(`Statement_${custName.replace(/\s+/g, '_')}_${getLocalDateString()}.pdf`);
  };

  // Export Excel using XLSX
  const handleExportExcel = () => {
    const custName = activeCustomer?.name || 'Customer';
    const data = statementLedger.map((row) => ({
      'Installment #': row.installmentNo,
      'Customer ID': row.customerId || activeCustomer?.id || '-',
      'Customer Name': row.customerName || activeCustomer?.name || '-',
      'Loan Account': row.loanName,
      'Due Date': row.dueDate || '-',
      'Paid Date': row.paidDate || '-',
      'EMI Amount (₹)': Number(row.amount || 0),
      'Payment Method': row.paymentMethod || 'UPI',
      'Payment Status': row.status,
      'Remaining Balance (₹)': row.balance !== '-' ? Number(row.balance) : '-',
      'Notes': row.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement_Ledger');
    XLSX.writeFile(workbook, `Loan_Statement_${custName.replace(/\s+/g, '_')}_${getLocalDateString()}.xlsx`);
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4 bg-light page-transition" style={{ minHeight: '100vh' }}>
      
      {/* Top Header Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 print-hide">
        <div>
          <h4 className="fw-bold text-dark mb-1">Customer &amp; Loan Account Statements</h4>
          <p className="text-muted small mb-0">
            Generate, print, and export itemized financial statements &amp; loan balance summaries
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-primary rounded-3 px-3 py-2 fw-bold d-flex align-items-center gap-1.5 shadow-sm hover-lift"
            onClick={() => setCommModal({ 
              open: true, 
              customerId: activeCustomer?.id || null, 
              loanId: activeLoan?.id || null, 
              templateKey: 'loan_statement' 
            })}
            title="Send WhatsApp / Gmail Statement"
          >
            <MdSend size={18} /> Send
          </button>
          
          <button 
            className="btn btn-outline-secondary rounded-3 px-3 py-2 fw-bold d-flex align-items-center gap-1.5 hover-lift" 
            onClick={handlePrint}
            title="Print Official Statement Letterhead"
          >
            <MdPrint size={18} /> Print
          </button>
          
          <button 
            className="btn btn-outline-danger rounded-3 px-3 py-2 fw-bold d-flex align-items-center gap-1.5 hover-lift" 
            onClick={handleExportPDF}
            title="Download PDF Statement"
          >
            <MdPictureAsPdf size={18} /> PDF
          </button>
          
          <button 
            className="btn btn-outline-success rounded-3 px-3 py-2 fw-bold d-flex align-items-center gap-1.5 hover-lift" 
            onClick={handleExportExcel}
            title="Export Excel Worksheet"
          >
            <MdFileUpload size={18} /> Excel
          </button>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3.5 bg-white mb-4 print-hide">
        <div className="row g-3 align-items-end">
          
          {/* Customer Profile Selector */}
          <div className="col-12 col-md-3">
            <label className="form-label small fw-bold text-secondary mb-1">
              Select Customer Profile *
            </label>
            <select 
              className="form-select fw-bold border-primary-subtle" 
              value={selectedCustomerId} 
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Loan Account Filter */}
          <div className="col-12 col-md-3">
            <label className="form-label small fw-bold text-secondary mb-1">
              Filter by Loan Account
            </label>
            <select 
              className="form-select fw-semibold" 
              value={selectedLoanId} 
              onChange={(e) => setSelectedLoanId(e.target.value)}
              disabled={!selectedCustomerId || customerLoans.length === 0}
            >
              <option value="">-- All Customer Loans ({customerLoans.length}) --</option>
              {customerLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanName} ({fmtAmt(l.totalAmount)})
                </option>
              ))}
            </select>
          </div>

          {/* From Date Filter */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-secondary mb-1">
              From Date
            </label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          {/* To Date Filter */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-secondary mb-1">
              To Date
            </label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-secondary mb-1">
              Payment Status
            </label>
            <select 
              className="form-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

        </div>

        {/* Quick Date Chips & Search Filter */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top">
          <div className="d-flex align-items-center gap-1.5 flex-wrap">
            <span className="text-muted small fw-semibold me-1">Quick Date:</span>
            <button 
              type="button" 
              className={`btn btn-sm rounded-pill px-2.5 py-1 ${!startDate && !endDate ? 'btn-primary' : 'btn-light border text-dark'}`}
              onClick={() => handleQuickDateFilter('all')}
            >
              All Time
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-light border text-dark rounded-pill px-2.5 py-1"
              onClick={() => handleQuickDateFilter('month')}
            >
              This Month
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-light border text-dark rounded-pill px-2.5 py-1"
              onClick={() => handleQuickDateFilter('30days')}
            >
              Last 30 Days
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-light border text-dark rounded-pill px-2.5 py-1"
              onClick={() => handleQuickDateFilter('fy')}
            >
              This Financial Year
            </button>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ maxWidth: 220 }}>
              <span className="input-group-text bg-light border-end-0"><MdSearch size={16} /></span>
              <input 
                type="text" 
                className="form-control bg-light border-start-0" 
                placeholder="Search ledger..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {(startDate || endDate || statusFilter || searchQuery) && (
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary rounded-pill px-2.5" 
                onClick={handleResetFilters}
              >
                <MdRefresh size={14} className="me-1" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No Customers / Empty State Alert */}
      {customers.length === 0 && (
        <div className="card border-0 shadow-sm rounded-4 p-5 bg-white text-center mb-4 print-hide">
          <div className="bg-primary bg-opacity-10 text-primary rounded-circle mx-auto p-3 mb-3" style={{ width: 64, height: 64 }}>
            <MdPerson size={32} />
          </div>
          <h5 className="fw-bold text-dark">No Customers Registered Yet</h5>
          <p className="text-muted small mx-auto" style={{ maxWidth: 450 }}>
            Create your first customer profile and assign a loan to generate live financial statements, payment ledgers, and download invoices.
          </p>
          <div className="mt-2">
            <Link to="/customers" className="btn btn-primary rounded-3 px-4 py-2 fw-bold">
              + Add New Customer
            </Link>
          </div>
        </div>
      )}

      {/* Customer Has No Loans Alert */}
      {selectedCustomerId && activeCustomer && customerLoans.length === 0 && (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white text-center mb-4 print-hide">
          <div className="bg-warning bg-opacity-10 text-warning rounded-circle mx-auto p-3 mb-2" style={{ width: 56, height: 56 }}>
            <MdAccountBalance size={28} />
          </div>
          <h6 className="fw-bold text-dark mb-1">No Loans Found for {activeCustomer.name}</h6>
          <p className="text-muted small mb-3">
            This customer does not currently have any active or closed loans recorded.
          </p>
          <div>
            <Link to="/loans" className="btn btn-outline-primary rounded-3 px-3 py-1.5 fw-bold btn-sm">
              + Create Loan for {activeCustomer.name}
            </Link>
          </div>
        </div>
      )}

      {/* Professional Statement Letterhead Document Layout */}
      <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white" ref={statementPrintRef} id="printable-statement">
        
        {/* Letterhead Header */}
        <div className="d-flex justify-content-between align-items-start border-bottom pb-4 mb-4">
          <div>
            <div className="d-flex align-items-center gap-3 mb-1">
              {settings.companyLogo ? (
                <img 
                  src={settings.companyLogo} 
                  alt="Logo" 
                  className="rounded-3 border p-1 shadow-2xs" 
                  style={{ width: 48, height: 48, objectFit: 'contain' }} 
                />
              ) : (
                <div className="bg-primary text-white rounded-3 p-2 fw-bold d-flex align-items-center justify-content-center shadow-sm" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                  RA
                </div>
              )}
              <div>
                <h4 className="fw-bold text-primary mb-0">{settings.companyName || 'R Accountant'}</h4>
                <div className="text-dark small fw-semibold">Managed by: {settings.ownerName || 'Accountant'}</div>
              </div>
            </div>
            <div className="text-muted small mt-1">{settings.companyTagline || 'Smart Loan, EMI & Account Management'}</div>
            {settings.address && <div className="text-muted small">{settings.address}</div>}
            <div className="text-muted small mt-0.5">
              {settings.phone && `Phone: ${settings.phone} • `}
              {settings.email && `Email: ${settings.email} • `}
              {settings.gstNumber && `GST: ${settings.gstNumber}`}
            </div>
          </div>

          <div className="text-end">
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-3 py-1.5 rounded-pill fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
              Official Statement
            </span>
            <h5 className="fw-bold text-dark mt-2 mb-1">STATEMENT OF ACCOUNT</h5>
            <div className="text-muted small">Date: {formatIndianDate(getLocalDateString())}</div>
            <div className="text-primary font-monospace fw-bold small mt-1">
              REF: STMT-{activeCustomer?.id || 'ALL'}-{getLocalDateString().replace(/-/g, '')}
            </div>
          </div>
        </div>

        {/* Customer & Loan Profile Summary Cards */}
        <div className="row g-3 mb-4">
          
          {/* Borrower Details */}
          <div className="col-12 col-md-6">
            <div className="p-3.5 bg-light rounded-3 border h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <h6 className="fw-bold text-primary mb-0">BORROWER DETAILS</h6>
                {activeCustomer && (
                  <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">
                    Active Profile
                  </span>
                )}
              </div>
              <div className="small text-dark d-flex flex-column gap-1.5">
                <div><strong>Customer Name:</strong> {activeCustomer?.name || 'All Customers (Consolidated Overview)'}</div>
                <div><strong>Customer ID:</strong> {activeCustomer?.id || '-'}</div>
                <div><strong>Mobile Phone:</strong> {activeCustomer?.phone || '-'}</div>
                <div><strong>Email:</strong> {activeCustomer?.email || '-'}</div>
                <div><strong>PAN / Aadhaar:</strong> {activeCustomer?.panAadhaar || '-'}</div>
                <div><strong>Address:</strong> {activeCustomer?.address || '-'}</div>
              </div>
            </div>
          </div>

          {/* Loan Account Summary */}
          <div className="col-12 col-md-6">
            <div className="p-3.5 bg-light rounded-3 border h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <h6 className="fw-bold text-success mb-0">LOAN ACCOUNT SUMMARY</h6>
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle">
                  {activeLoan ? activeLoan.type || 'Loan' : `${customerLoans.length} Loans Linked`}
                </span>
              </div>
              <div className="small text-dark d-flex flex-column gap-1.5">
                <div>
                  <strong>Loan Title:</strong> {activeLoan ? activeLoan.loanName : customerLoans.length > 0 ? `Consolidated (${customerLoans.length} Active Accounts)` : 'All Loan Accounts'}
                </div>
                <div>
                  <strong>Monthly EMI:</strong> {fmtAmt(totalMonthlyEmi)} {activeLoan ? `(${activeLoan.tenureMonths} Months)` : ''}
                </div>
                <div>
                  <strong>Start Date:</strong> {activeLoan?.startDate ? formatIndianDate(activeLoan.startDate) : '-'}
                </div>
                <div>
                  <strong>Next Due Date:</strong> {nextUpcoming?.dueDate ? formatIndianDate(nextUpcoming.dueDate) : 'All Up To Date'}
                </div>
                <div>
                  <strong>Account Status:</strong> <span className="fw-bold text-success">{activeLoan?.status || (customerLoans.length > 0 ? 'Active' : '-')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Financial Metrics Summary Banner */}
        <div className="row g-3 text-center mb-4">
          <div className="col-6 col-md-3">
            <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-20 h-100">
              <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Total Principal Capital</small>
              <h5 className="fw-bold text-primary mb-0 mt-1">{fmtAmt(totalLoanCapital)}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-20 h-100">
              <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Total Amount Paid</small>
              <h5 className="fw-bold text-success mb-0 mt-1">{fmtAmt(totalPaidAmount)}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-20 h-100">
              <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Outstanding Balance</small>
              <h5 className="fw-bold text-danger mb-0 mt-1">{fmtAmt(outstandingBalance)}</h5>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 bg-warning bg-opacity-10 rounded-3 border border-warning border-opacity-20 h-100">
              <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>Paid / Total EMIs</small>
              <h5 className="fw-bold text-dark mb-0 mt-1">{totalPaidEmis} / {totalEmisCount}</h5>
            </div>
          </div>
        </div>

        {/* Itemized Payment Schedule & Ledger */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-dark mb-0">Itemized EMI Payment &amp; Collection Ledger</h6>
          <span className="badge bg-light text-secondary border">
            {statementLedger.length} Records Shown
          </span>
        </div>

        <div className="table-responsive mb-4">
          <table className="table table-bordered table-hover align-middle mb-0 small">
            <thead className="bg-light text-secondary">
              <tr>
                <th className="text-center" style={{ width: '45px' }}>#</th>
                <th>Loan Account</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th className="text-end">EMI Amount</th>
                <th>Payment Mode</th>
                <th className="text-center">Status</th>
                <th className="text-end">Remaining Balance</th>
                <th className="text-center print-hide" style={{ width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {statementLedger.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <MdHourglassEmpty size={32} className="opacity-50 mb-2 d-block mx-auto" />
                    No payment records match the selected statement filters.
                  </td>
                </tr>
              ) : (
                statementLedger.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="text-center fw-bold text-secondary">{row.installmentNo || idx + 1}</td>
                    <td className="fw-semibold text-dark">{row.loanName}</td>
                    <td className="fw-semibold text-dark">{formatIndianDate(row.dueDate)}</td>
                    <td className="text-muted">{row.paidDate ? formatIndianDate(row.paidDate) : '-'}</td>
                    <td className="text-end fw-bold text-dark">{fmtAmt(row.amount)}</td>
                    <td>{row.paymentMethod || 'UPI'}</td>
                    <td className="text-center">
                      <span className={`badge rounded-pill px-2.5 py-1 ${
                        row.status === 'Paid' ? 'bg-success text-white' :
                        row.status === 'Overdue' ? 'bg-danger text-white' :
                        'bg-warning text-dark'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="text-end fw-semibold text-secondary">
                      {row.balance !== '-' ? fmtAmt(row.balance) : '-'}
                    </td>
                    <td className="text-center print-hide">
                      {row.canMarkPaid ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-success rounded-pill px-2 py-0.5 fw-bold"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => handleOpenMarkPaid(row)}
                          title="Mark this EMI as Paid"
                        >
                          <MdCheckCircle size={13} className="me-0.5" /> Collect
                        </button>
                      ) : (
                        <span className="text-success fw-semibold small" style={{ fontSize: '0.72rem' }}>
                          ✓ Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {statementLedger.length > 0 && (
              <tfoot className="bg-light fw-bold">
                <tr>
                  <td colSpan="4" className="text-end">Total Page Ledger Sum:</td>
                  <td className="text-end text-primary">
                    {fmtAmt(statementLedger.reduce((sum, r) => sum + Number(r.amount || 0), 0))}
                  </td>
                  <td colSpan="4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Statement Footer */}
        <div className="border-top pt-3 text-muted small d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>
            {settings.invoiceFooterMessage || 'This is a computer-generated account statement and does not require a physical signature.'}
          </span>
          <span className="fw-bold text-dark">
            © 2026 {settings.companyName || 'R Accountant'}. Managed by {settings.ownerName || 'Accountant'}.
          </span>
        </div>
      </div>

      {/* Send Statement / Communication Modal */}
      {commModal.open && (
        <SendStatementModal
          isOpen={commModal.open}
          onClose={() => setCommModal({ open: false, customerId: null, loanId: null, templateKey: 'loan_statement' })}
          initialCustomerId={commModal.customerId || activeCustomer?.id || null}
          initialLoanId={commModal.loanId || activeLoan?.id || null}
          initialTemplateKey={commModal.templateKey}
        />
      )}

      {/* Quick Collect / Mark Paid Modal */}
      {markingPayment && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-success text-white py-3 px-4">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <MdCheckCircle size={22} /> Collect &amp; Mark Payment
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setMarkingPayment(null)}
                ></button>
              </div>

              <form onSubmit={handleConfirmMarkPaid}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border small text-dark mb-3">
                    <div><strong>Customer:</strong> {markingPayment.customerName}</div>
                    <div><strong>Loan:</strong> {markingPayment.loanName}</div>
                    <div><strong>Due Date:</strong> {formatIndianDate(markingPayment.dueDate)}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Paid Date</label>
                    <input
                      type="date"
                      className="form-control fw-semibold"
                      value={paidDetails.paidDate}
                      onChange={(e) => setPaidDetails({ ...paidDetails, paidDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Collected Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control fw-bold fs-5 text-success"
                      value={paidDetails.amount}
                      onChange={(e) => setPaidDetails({ ...paidDetails, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-secondary">Payment Method</label>
                      <select
                        className="form-select"
                        value={paidDetails.paymentMethod}
                        onChange={(e) => setPaidDetails({ ...paidDetails, paymentMethod: e.target.value })}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-bold text-secondary">Bank Account</label>
                      <select
                        className="form-select"
                        value={paidDetails.bankAccountId}
                        onChange={(e) => setPaidDetails({ ...paidDetails, bankAccountId: e.target.value })}
                      >
                        <option value="">-- No Bank Sync --</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold text-secondary">Notes / Remark</label>
                    <input
                      type="text"
                      className="form-control"
                      value={paidDetails.notes}
                      onChange={(e) => setPaidDetails({ ...paidDetails, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light px-4 py-3">
                  <button 
                    type="button" 
                    className="btn btn-light rounded-3 px-3 fw-bold" 
                    onClick={() => setMarkingPayment(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success rounded-3 px-4 fw-bold shadow-sm"
                  >
                    Confirm &amp; Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Statements;
