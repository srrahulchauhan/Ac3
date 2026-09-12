import React, { useState, useEffect } from 'react';
import {
  MdClose, MdSend, MdEmail, MdContentCopy, MdDownload,
  MdPrint, MdCheckCircle, MdWarning, MdAccountBalance,
  MdPerson, MdPhone, MdCalendarToday, MdDescription,
  MdHistory, MdDoneAll, MdCheck, MdOpenInNew, MdGroup,
} from 'react-icons/md';
import { loanStore } from '../utils/loanStore';
import { formatIndianDate, formatIndianDateTime, getLocalDateString } from '../utils/dateUtils';

const fmtAmt = (a) => a != null ? '₹' + Number(a).toLocaleString('en-IN') : '₹0';

const TEMPLATE_ICONS = {
  monthly_reminder: '📅',
  due_today: '⏰',
  upcoming_reminder: '🔔',
  overdue_reminder: '🚨',
  payment_received: '💳',
  loan_statement: '📄',
  loan_closure: '🏆',
};

const SendStatementModal = ({
  isOpen,
  onClose,
  initialCustomerId = null,
  initialLoanId = null,
  initialTemplateKey = 'loan_statement',
  initialChannel = 'WhatsApp',
}) => {
  const [channel, setChannel] = useState(initialChannel || 'WhatsApp');
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [loanId, setLoanId] = useState(initialLoanId || '');
  const [templateKey, setTemplateKey] = useState(initialTemplateKey || 'loan_statement');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [includePdfAttachment, setIncludePdfAttachment] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('Sent');
  const [sendingState, setSendingState] = useState(null); // null | 'sending' | 'success'
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk' | 'history'
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkLog, setBulkLog] = useState([]);

  // Data
  const customers = loanStore.getCustomers();
  const loans = loanStore.getLoans();
  const payments = loanStore.getPayments();
  const settings = loanStore.getSettings();
  const templates = loanStore.getCommunicationTemplates();

  // Selected customer & loans
  const selectedCustomer = customers.find(c => c.id === customerId) || customers[0] || null;
  const customerLoans = loans.filter(l => l.customerId === (selectedCustomer?.id || customerId));
  const selectedLoan = customerLoans.find(l => l.id === loanId) || customerLoans[0] || loans[0] || null;

  // Initialize customer and loan when opened or props change
  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
    else if (customers.length && !customerId) setCustomerId(customers[0].id);
  }, [initialCustomerId, customers]);

  useEffect(() => {
    if (initialLoanId) setLoanId(initialLoanId);
    else if (customerLoans.length) setLoanId(customerLoans[0].id);
  }, [initialLoanId, customerId]);

  // Compute stats for replacement
  const loanPayments = payments.filter(p => p.loanId === selectedLoan?.id);
  const paidPayments = loanPayments.filter(p => p.status === 'Paid');
  const paidAmount = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAmount = Number(selectedLoan?.totalAmount || 0);
  const balance = Math.max(0, totalAmount - paidAmount);
  const upcomingPayment = loanPayments.find(p => p.status !== 'Paid' && p.dueDate) || null;
  const lastPayment = paidPayments[paidPayments.length - 1] || null;

  // Render Template with placeholders
  const fillPlaceholders = (text = '') => {
    if (!text) return '';
    return text
      .replace(/{customerName}/g, selectedCustomer?.name || 'Valued Customer')
      .replace(/{loanName}/g, selectedLoan?.loanName || 'Loan Account')
      .replace(/{amount}/g, fmtAmt(upcomingPayment?.amount || selectedLoan?.emiAmount || 0))
      .replace(/{dueDate}/g, formatIndianDate(upcomingPayment?.dueDate || selectedLoan?.dueDate || getLocalDateString()))
      .replace(/{paidDate}/g, formatIndianDate(lastPayment?.paidDate || getLocalDateString()))
      .replace(/{principal}/g, fmtAmt(selectedLoan?.totalAmount || 0))
      .replace(/{paidAmount}/g, fmtAmt(paidAmount))
      .replace(/{balance}/g, fmtAmt(balance))
      .replace(/{companyName}/g, settings?.companyName || 'R Accountant')
      .replace(/{tenure}/g, `${selectedLoan?.tenureMonths || 12} Months`);
  };

  // Update subject & message on template or selection change
  useEffect(() => {
    const tmpl = templates[templateKey] || templates.loan_statement;
    if (tmpl) {
      setSubject(fillPlaceholders(tmpl.subject));
      let bodyText = fillPlaceholders(tmpl.body);
      if (personalNote.trim()) {
        bodyText += `\n\n📌 Note: ${personalNote.trim()}`;
      }
      setMessage(bodyText);
    }
  }, [templateKey, customerId, loanId, personalNote]);

  if (!isOpen) return null;

  // Clean WhatsApp number
  const rawPhone = selectedCustomer?.phone || '';
  const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
  const waNumber = cleanDigits.startsWith('91') ? cleanDigits : `91${cleanDigits}`;
  const customerEmail = selectedCustomer?.email || '';

  // Log communication event
  const logCommunication = (channelUsed, statusToLog = 'Sent') => {
    loanStore.addCommunication({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      channel: channelUsed,
      type: templateKey,
      typeName: templates[templateKey]?.name || 'Statement / Notification',
      recipient: channelUsed === 'WhatsApp' ? (rawPhone || waNumber) : customerEmail,
      subject: channelUsed === 'Gmail' ? subject : `[WhatsApp] ${templates[templateKey]?.name}`,
      message: message,
      status: statusToLog,
      hasAttachment: includePdfAttachment,
    });
  };

  // Actions
  const handleSendWhatsApp = () => {
    setSendingState('sending');
    let waText = message;
    if (includePdfAttachment) {
      waText += `\n\n📎 Official Statement & Details: Generated by ${settings?.companyName || 'R Accountant'} Portal.`;
    }
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank');
    logCommunication('WhatsApp', deliveryStatus);
    setTimeout(() => {
      setSendingState('success');
      setTimeout(() => setSendingState(null), 3000);
    }, 800);
  };

  const handleSendGmail = () => {
    setSendingState('sending');
    let emailBody = message;
    if (includePdfAttachment) {
      emailBody += `\n\n[Attachment: PDF Statement for ${selectedLoan?.loanName || 'Account'}]`;
    }
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customerEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const win = window.open(gmailUrl, '_blank');
    if (!win) {
      window.location.href = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    }
    logCommunication('Gmail', deliveryStatus);
    setTimeout(() => {
      setSendingState('success');
      setTimeout(() => setSendingState(null), 3000);
    }, 800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const content = `=====================================================
${(settings?.companyName || 'R ACCOUNTANT').toUpperCase()} - OFFICIAL LOAN STATEMENT
Managed by: ${settings?.ownerName || 'Accountant'}
=====================================================
Date Generated: ${formatIndianDateTime(new Date())}
Customer Name : ${selectedCustomer?.name}
Phone Number  : ${selectedCustomer?.phone}
Email Address : ${selectedCustomer?.email}
Address       : ${selectedCustomer?.address || 'N/A'}
PAN / Aadhaar : ${selectedCustomer?.panAadhaar || 'N/A'}

-----------------------------------------------------
LOAN ACCOUNT DETAILS
-----------------------------------------------------
Loan Name     : ${selectedLoan?.loanName}
Loan Type     : ${selectedLoan?.type}
Principal Amt : ${fmtAmt(selectedLoan?.totalAmount)}
Monthly EMI   : ${fmtAmt(selectedLoan?.emiAmount)}
Tenure        : ${selectedLoan?.tenureMonths} Months
Start Date    : ${formatIndianDate(selectedLoan?.startDate)}
Total Paid    : ${fmtAmt(paidAmount)}
Balance Due   : ${fmtAmt(balance)}
Loan Status   : ${selectedLoan?.status}

-----------------------------------------------------
MESSAGE CONTENT
-----------------------------------------------------
${message}

=====================================================
© 2026 ${settings?.companyName || 'R Accountant'}. Managed by ${settings?.ownerName || 'Accountant'}.
=====================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Statement_${(selectedCustomer?.name || 'Customer').replace(/\s+/g, '_')}_${getLocalDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Customer communication history
  const customerHistory = loanStore.getCommunications(selectedCustomer?.id);

  // Bulk send action
  const handleBulkSend = (targetChannel) => {
    const overdueCustomers = customers.filter(c => {
      const custPayments = payments.filter(p => p.customerId === c.id && p.status !== 'Paid' && p.dueDate && p.dueDate <= getLocalDateString());
      return custPayments.length > 0;
    });
    const targets = bulkSelectedIds.length > 0
      ? customers.filter(c => bulkSelectedIds.includes(c.id))
      : overdueCustomers;

    if (!targets.length) {
      alert('No eligible customers selected for bulk notification.');
      return;
    }

    if (window.confirm(`Send ${targets.length} reminders via ${targetChannel}?`)) {
      targets.forEach((c) => {
        const custLoan = loans.find(l => l.customerId === c.id);
        const tmpl = templates.overdue_reminder || templates.monthly_reminder;
        const msg = tmpl.body
          .replace(/{customerName}/g, c.name)
          .replace(/{loanName}/g, custLoan?.loanName || 'Loan Account')
          .replace(/{amount}/g, fmtAmt(custLoan?.emiAmount || 0))
          .replace(/{dueDate}/g, formatIndianDate(getLocalDateString()))
          .replace(/{companyName}/g, settings?.companyName || 'R Accountant');

        loanStore.addCommunication({
          customerId: c.id,
          customerName: c.name,
          channel: targetChannel,
          type: 'overdue_reminder',
          typeName: 'Bulk EMI Alert',
          recipient: targetChannel === 'WhatsApp' ? c.phone : c.email,
          subject: `EMI Reminder - ${custLoan?.loanName || 'R Accountant'}`,
          message: msg,
          status: 'Sent',
          hasAttachment: true,
        });
      });
      alert(`✓ Successfully logged ${targets.length} ${targetChannel} reminders!`);
      setActiveTab('history');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1065,
      backgroundColor: 'rgba(15, 23, 42, 0.68)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalZoom 0.22s ease-out',
      }}>
        <style>{`
          @keyframes modalZoom { from { opacity:0; transform: scale(0.95); } to { opacity:1; transform: scale(1); } }
          .comm-tab-btn { border: none; background: transparent; padding: 10px 18px; font-weight: 700; font-size: 13px; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.15s; }
          .comm-tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; }
          .comm-tab-btn:hover:not(.active) { color: #111827; background: #f9fafb; }
        `}</style>

        {/* ── Modal Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          padding: '16px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 12, width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {channel === 'WhatsApp' ? <MdSend size={22} color="#4ade80" /> : <MdEmail size={22} color="#93c5fd" />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>
                Send Statement &amp; Communications
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
                Instant WhatsApp &amp; Gmail delivery with live preview &amp; history tracking
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                color: '#fff', borderRadius: 10, width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #e5e7eb',
          background: '#f8fafc', padding: '0 16px',
        }}>
          <button
            className={`comm-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            💬 Direct Send ({channel})
          </button>
          <button
            className={`comm-tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            <MdGroup size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            Bulk Reminder ({customers.length})
          </button>
          <button
            className={`comm-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <MdHistory size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            Customer History ({customerHistory.length})
          </button>
        </div>

        {/* ── Main Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* TAB 1: Direct Send */}
          {activeTab === 'single' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: 20 }}>
              
              {/* Left Column: Form & Configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Channel Selector */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                    Select Communication Channel
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setChannel('WhatsApp')}
                      style={{
                        padding: '10px 14px', borderRadius: 12,
                        border: channel === 'WhatsApp' ? '2px solid #25d366' : '1px solid #e5e7eb',
                        background: channel === 'WhatsApp' ? '#f0fdf4' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                        fontWeight: 700, fontSize: 13,
                        color: channel === 'WhatsApp' ? '#166534' : '#6b7280',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>💬</span>
                      <div style={{ textAlign: 'left' }}>
                        <div>WhatsApp</div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>Direct chat message</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('Gmail')}
                      style={{
                        padding: '10px 14px', borderRadius: 12,
                        border: channel === 'Gmail' ? '2px solid #ea4335' : '1px solid #e5e7eb',
                        background: channel === 'Gmail' ? '#fef2f2' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                        fontWeight: 700, fontSize: 13,
                        color: channel === 'Gmail' ? '#991b1b' : '#6b7280',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>✉️</span>
                      <div style={{ textAlign: 'left' }}>
                        <div>Gmail / Email</div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>Formatted email statement</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Customer & Loan Selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }}>
                      Customer
                    </label>
                    <select
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12.5, fontWeight: 600 }}
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }}>
                      Loan Account
                    </label>
                    <select
                      value={loanId}
                      onChange={e => setLoanId(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12.5, fontWeight: 600 }}
                    >
                      {customerLoans.length > 0 ? (
                        customerLoans.map(l => (
                          <option key={l.id} value={l.id}>{l.loanName} ({fmtAmt(l.totalAmount)})</option>
                        ))
                      ) : (
                        <option value="">All Loans / Summary</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Recipient Details & Opt-In Indicator */}
                <div style={{
                  background: '#f9fafb', borderRadius: 10, padding: '10px 12px',
                  border: '1px solid #e5e7eb', fontSize: 11.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ color: '#111827', fontWeight: 700 }}>
                      👤 {selectedCustomer?.name}
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      📞 {selectedCustomer?.phone || 'No phone number added'} • ✉️ {selectedCustomer?.email || 'No email registered'}
                    </div>
                  </div>
                  <div>
                    <span style={{
                      background: '#dcfce7', color: '#166534',
                      padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                    }}>
                      ✓ Opted In
                    </span>
                  </div>
                </div>

                {/* Template Selector */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }}>
                    Select Message Template
                  </label>
                  <select
                    value={templateKey}
                    onChange={e => setTemplateKey(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12.5, fontWeight: 700 }}
                  >
                    {Object.keys(templates).map(k => (
                      <option key={k} value={k}>
                        {TEMPLATE_ICONS[k] || '📌'} {templates[k].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject (for Email) */}
                {channel === 'Gmail' && (
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }}>
                      Email Subject
                    </label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12.5 }}
                    />
                  </div>
                )}

                {/* Personalized Note */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#4b5563', marginBottom: 4, display: 'block' }}>
                    Personal Note / Custom Add-on (Optional)
                  </label>
                  <input
                    value={personalNote}
                    onChange={e => setPersonalNote(e.target.value)}
                    placeholder="e.g. Please confirm after payment via PhonePe."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12 }}
                  />
                </div>

                {/* Attachment & Delivery Status options */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includePdfAttachment}
                      onChange={e => setIncludePdfAttachment(e.target.checked)}
                    />
                    Include PDF Statement link / details
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Status:</span>
                    <select
                      value={deliveryStatus}
                      onChange={e => setDeliveryStatus(e.target.value)}
                      style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 11, fontWeight: 700 }}
                    >
                      <option value="Sent">Sent</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Read">Read</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: Live Preview & Quick Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Preview Box */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      👁️ Live Message Preview
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        background: 'none', border: '1px solid #d1d5db',
                        borderRadius: 6, padding: '3px 8px', fontSize: 11,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        color: copied ? '#10b981' : '#4b5563',
                        fontWeight: 600,
                      }}
                    >
                      {copied ? <MdCheck size={13} /> : <MdContentCopy size={13} />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>

                  <div style={{
                    background: channel === 'WhatsApp' ? '#f0fdf4' : '#faf5ff',
                    border: channel === 'WhatsApp' ? '1px solid #bbf7d0' : '1px solid #e9d5ff',
                    borderRadius: 12,
                    padding: '12px 14px',
                    minHeight: '200px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: '#1f2937',
                    whiteSpace: 'pre-wrap',
                    fontFamily: channel === 'WhatsApp' ? 'system-ui, sans-serif' : 'inherit',
                  }}>
                    {channel === 'Gmail' && (
                      <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px dashed #d8b4fe', fontWeight: 700, color: '#6b21a8' }}>
                        Subject: {subject}
                      </div>
                    )}
                    {message}
                    {includePdfAttachment && (
                      <div style={{
                        marginTop: 12, padding: '6px 10px',
                        background: 'rgba(255,255,255,0.7)',
                        border: '1px dashed #cbd5e1', borderRadius: 8,
                        fontSize: 11, color: '#475569',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <MdDescription size={15} color="#6366f1" />
                        <span>Attachment: <strong>{selectedLoan?.loanName || 'Loan'}_Statement.pdf</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    style={{
                      padding: '8px 10px', borderRadius: 10,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      fontSize: 12, fontWeight: 700, color: '#334155',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <MdDownload size={15} /> Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    style={{
                      padding: '8px 10px', borderRadius: 10,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      fontSize: 12, fontWeight: 700, color: '#334155',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <MdPrint size={15} /> Print Statement
                  </button>
                </div>

                {/* Primary Action Button */}
                <div style={{ marginTop: 4 }}>
                  {channel === 'WhatsApp' ? (
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 12,
                        border: 'none', background: '#25d366', color: '#ffffff',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 20px rgba(37,211,102,0.3)',
                        transition: 'transform 0.15s, filter 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                      <MdSend size={18} />
                      {sendingState === 'sending' ? 'Opening WhatsApp…' : sendingState === 'success' ? '✓ Message Sent!' : `Send to ${selectedCustomer?.name || 'Customer'} via WhatsApp`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendGmail}
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 12,
                        border: 'none', background: '#ea4335', color: '#ffffff',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 20px rgba(234,67,53,0.3)',
                        transition: 'transform 0.15s, filter 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                      <MdEmail size={18} />
                      {sendingState === 'sending' ? 'Opening Gmail…' : sendingState === 'success' ? '✓ Email Logged!' : `Send to ${selectedCustomer?.email || 'Customer'} via Gmail`}
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Bulk Reminders */}
          {activeTab === 'bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e40af', fontSize: 13 }}>
                    ⚡ Bulk EMI Payment Reminders
                  </div>
                  <div style={{ fontSize: 11.5, color: '#3b82f6', marginTop: 2 }}>
                    Quickly notify multiple customers with upcoming or overdue installments in one click.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleBulkSend('WhatsApp')}
                    style={{
                      background: '#25d366', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    💬 Bulk WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSend('Gmail')}
                    style={{
                      background: '#ea4335', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    ✉️ Bulk Gmail
                  </button>
                </div>
              </div>

              {/* Customer List */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', width: 36 }}>
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.length === customers.length}
                          onChange={e => {
                            if (e.target.checked) setBulkSelectedIds(customers.map(c => c.id));
                            else setBulkSelectedIds([]);
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px 12px' }}>Customer</th>
                      <th style={{ padding: '10px 12px' }}>Phone / WhatsApp</th>
                      <th style={{ padding: '10px 12px' }}>Email</th>
                      <th style={{ padding: '10px 12px' }}>Active Loans</th>
                      <th style={{ padding: '10px 12px' }}>Next Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => {
                      const custLoans = loans.filter(l => l.customerId === c.id);
                      const nextPay = payments.find(p => p.customerId === c.id && p.status !== 'Paid' && p.dueDate);
                      const isSelected = bulkSelectedIds.includes(c.id);

                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0fdf4' : '#fff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) setBulkSelectedIds(prev => [...prev, c.id]);
                                else setBulkSelectedIds(prev => prev.filter(id => id !== c.id));
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>{c.name}</td>
                          <td style={{ padding: '10px 12px', color: '#4b5563' }}>{c.phone || '-'}</td>
                          <td style={{ padding: '10px 12px', color: '#4b5563' }}>{c.email || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{custLoans.length} Loans</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: nextPay ? '#f59e0b' : '#10b981' }}>
                            {nextPay ? `${fmtAmt(nextPay.amount)} (${formatIndianDate(nextPay.dueDate)})` : 'All Paid'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Customer History */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  📜 Communication Log for {selectedCustomer?.name}
                </span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  Total {customerHistory.length} sent messages
                </span>
              </div>

              {customerHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <MdHistory size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>No communication history yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Messages sent via WhatsApp or Gmail will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customerHistory.map(comm => (
                    <div
                      key={comm.id}
                      style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 12, padding: '12px 14px',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>
                          {comm.channel === 'WhatsApp' ? '💬' : '✉️'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 12.5, color: '#111827' }}>
                              {comm.typeName}
                            </span>
                            <span style={{
                              fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
                              background: comm.channel === 'WhatsApp' ? '#dcfce7' : '#fee2e2',
                              color: comm.channel === 'WhatsApp' ? '#166534' : '#991b1b',
                            }}>
                              {comm.channel}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#4b5563', marginTop: 2 }}>
                            {comm.recipient}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                            "{comm.message?.substring(0, 100)}…"
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          background: comm.status === 'Delivered' ? '#dcfce7' : comm.status === 'Read' ? '#e0e7ff' : '#f3f4f6',
                          color: comm.status === 'Delivered' ? '#166534' : comm.status === 'Read' ? '#3730a3' : '#374151',
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800,
                        }}>
                          {comm.status}
                        </span>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                          {formatIndianDateTime(comm.sentAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid #e5e7eb',
          background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            🔒 RC Accountant Secure Communication Gateway
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e5e7eb', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              color: '#374151', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default SendStatementModal;
