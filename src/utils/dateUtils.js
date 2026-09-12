/**
 * Indian Date & Time Utilities for RC Accountant
 * Timezone: Asia/Kolkata (IST)
 * Formats:
 * - Date: DD MMM YYYY (e.g. 29 Aug 2026)
 * - Date & Time: DD MMM YYYY, hh:mm AM/PM (e.g. 29 Aug 2026, 10:30 AM)
 */

export const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const formatIndianDate = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  } catch (e) {
    return String(dateInput);
  }
};

export const formatIndianDateTime = (dateInput = new Date()) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const datePart = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });

    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });

    return `${datePart}, ${timePart}`;
  } catch (e) {
    return String(dateInput);
  }
};

export const addMonthsToDate = (dateStr, months) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  const numMonths = parseInt(months || 0, 10);
  const d = new Date(year, month + numMonths, day);
  
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return getLocalDateString(d);
};

export const calculateMonthsBetween = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return months > 0 ? months : 1;
};

/**
 * Remember and retrieve the last used entry date for any module
 * (e.g., 'expenses', 'udhaar', 'bank', 'emi', 'loan')
 */
export const getLastEntryDate = (moduleKey, fallback = getLocalDateString()) => {
  try {
    const saved = localStorage.getItem(`rc_last_entry_date_${moduleKey}`);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

export const setLastEntryDate = (moduleKey, dateStr) => {
  if (!dateStr || !moduleKey) return;
  try {
    localStorage.setItem(`rc_last_entry_date_${moduleKey}`, dateStr);
    // Also save as global last entry date
    localStorage.setItem('rc_last_entry_date_global', dateStr);
  } catch (e) {
    console.error('Error saving last entry date:', e);
  }
};
