'use strict';

const STORAGE_KEY = 'greenscapeTransactions';
const packagePrices = {
  'Basic Consultation': 2500,
  'Professional Design': 5000,
  'Premium Design': 7500,
  'Garden Starter Pack': 3000,
  'Flower Paradise Pack': 4000,
  'Green Oasis Pack': 5500
};
const form = document.getElementById('transactionForm');
const packageSelect = document.getElementById('packageSelect');
const receiptSection = document.getElementById('confirmation');
const feedback = document.getElementById('formFeedback');
const searchInput = document.getElementById('recordSearch');
const statusFilter = document.getElementById('statusFilter');
const tbody = document.getElementById('recordsTableBody');
const emptyState = document.getElementById('emptyState');
const recordCount = document.getElementById('recordCount');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');


// Populate package dropdown and set date minimum to today.
Object.entries(packagePrices).forEach(([name, price]) => {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = `${name} — ${formatCurrency(price)}`;
  packageSelect.append(option);
});
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
document.getElementById('preferredDate').min = today.toISOString().slice(0, 10);


function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}
function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(item => item && typeof item === 'object') : [];
  } catch (error) {
    console.warn('Could not read saved GreenScape records.', error);
    return [];
  }
}
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Could not save records.', error);
    alert('Your browser could not save this record. Storage may be full or unavailable.');
    return false;
  }
}
function makeReferenceId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const random = Math.floor(100 + Math.random() * 900);
  return `GS-${stamp}-${random}`;
}
function setError(field, message) {
  const errorNode = document.getElementById(`${field}Error`);
  if (errorNode) errorNode.textContent = message;
  const input = document.getElementById(field);
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
}
function clearErrors() {
  ['clientName', 'packageSelect', 'contactNumber', 'preferredDate', 'siteAddress', 'siteArea'].forEach(id => setError(id, ''));
}
function validateForm() {
  clearErrors();
  let valid = true;
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('contactNumber').value.trim();
  const date = document.getElementById('preferredDate').value;
  const address = document.getElementById('siteAddress').value.trim();
  const area = Number(document.getElementById('siteArea').value);
  const pkg = packageSelect.value;
  if (name.length < 2) { setError('clientName', 'Please enter your full name (at least 2 characters).'); valid = false; }
  if (!pkg || !(pkg in packagePrices)) { setError('packageSelect', 'Please choose a package.'); valid = false; }
  if (!/^09\d{9}$/.test(phone.replace(/[\s-]/g, ''))) { setError('contactNumber', 'Enter a valid 11-digit mobile number starting with 09.'); valid = false; }
  if (!date) { setError('preferredDate', 'Please choose a preferred date.'); valid = false; }
  else if (date < new Date().toISOString().slice(0, 10)) { setError('preferredDate', 'Date cannot be in the past.'); valid = false; }
  if (address.length < 5) { setError('siteAddress', 'Please enter a complete site address.'); valid = false; }
  if (!Number.isFinite(area) || area <= 0) { setError('siteArea', 'Site area must be greater than 0 square meters.'); valid = false; }
  return valid;
}
function showReceipt(record) {
  const details = document.getElementById('receiptDetails');
  const rows = [
    ['Reference ID', record.id], ['Client Name', record.clientName], ['Contact Number', record.contactNumber],
    ['Service / Package', record.packageName], ['Preferred Date', record.preferredDate], ['Site Address', record.siteAddress],
    ['Site Area', `${record.siteArea} sq. meters`], ['Status', record.status]
  ];
  details.innerHTML = '';
  details.className = 'receipt-details';
  rows.forEach(([label, value]) => {
    const cell = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label;
    const text = document.createElement('span');
    text.textContent = value;
    cell.append(strong, text);
    details.append(cell);
  });
  document.getElementById('receiptTotal').textContent = formatCurrency(record.total);
  receiptSection.hidden = false;
  receiptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderRecords() {
  const records = loadRecords();
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;
  const filtered = records.filter(record => {
    const searchable = `${record.clientName || ''} ${record.id || ''} ${record.packageName || ''}`.toLowerCase();
    return searchable.includes(query) && (filter === 'all' || record.status === filter);
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  tbody.innerHTML = '';
  recordCount.textContent = records.length;
  emptyState.hidden = filtered.length > 0;
  filtered.forEach((record, index) => {
    const tr = document.createElement('tr');
    const values = [index + 1, record.id, record.clientName, record.packageName, record.preferredDate, record.status, formatCurrency(record.total)];
    values.forEach((value, i) => {
      const td = document.createElement('td');
      if (i === 5) {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${record.status}`;
        badge.textContent = record.status;
        td.append(badge);
      } else td.textContent = value;
      tr.append(td);
    });
    const actionTd = document.createElement('td');
    const update = document.createElement('button');
    update.className = 'action-btn update-btn';
    update.type = 'button';
    update.textContent = 'Update';
    update.title = 'Change status';
    update.addEventListener('click', () => updateStatus(record.id));
    const cancel = document.createElement('button');
    cancel.className = 'action-btn cancel-btn';
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.disabled = record.status === 'Cancelled' || record.status === 'Completed';
    cancel.addEventListener('click', () => cancelRecord(record.id));
    const remove = document.createElement('button');
    remove.className = 'action-btn delete-btn';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteRecord(record.id));
    actionTd.append(update, cancel, remove);
    tr.append(actionTd);
    tbody.append(tr);
  });
}
function updateStatus(id) {
  const records = loadRecords();
  const record = records.find(item => item.id === id);
  if (!record) return;
  const options = ['Pending', 'Confirmed', 'Completed'];
  const currentIndex = options.indexOf(record.status);
  const next = options[(currentIndex + 1) % options.length];
  if (!confirm(`Update ${record.id} status from ${record.status} to ${next}?`)) return;
  record.status = next;
  if (saveRecords(records)) renderRecords();
}
function cancelRecord(id) {
  const records = loadRecords();
  const record = records.find(item => item.id === id);
  if (!record || !confirm(`Cancel request ${id}?`)) return;
  record.status = 'Cancelled';
  if (saveRecords(records)) renderRecords();
}
function deleteRecord(id) {
  if (!confirm(`Permanently delete ${id} from this browser's saved records?`)) return;
  const records = loadRecords().filter(item => item.id !== id);
  if (saveRecords(records)) renderRecords();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  feedback.textContent = '';
  if (!validateForm()) {
    feedback.textContent = 'Please review the highlighted fields and try again.';
    feedback.style.color = '#a94238';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const packageName = packageSelect.value;
  const record = {
    id: makeReferenceId(), clientName: document.getElementById('clientName').value.trim(),
    contactNumber: document.getElementById('contactNumber').value.trim(), packageName,
    preferredDate: document.getElementById('preferredDate').value, siteAddress: document.getElementById('siteAddress').value.trim(),
    siteArea: Number(document.getElementById('siteArea').value), total: packagePrices[packageName],
    status: 'Pending', createdAt: new Date().toISOString()
  };
  const records = loadRecords();
  records.push(record);
  if (!saveRecords(records)) return;
  showReceipt(record);
  renderRecords();
  feedback.textContent = 'Request saved successfully. Your reference ID is shown below.';
  feedback.style.color = '#2b6c32';
});
document.querySelectorAll('.select-package').forEach(button => {
  button.addEventListener('click', () => {
    packageSelect.value = button.dataset.package;
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    packageSelect.focus({ preventScroll: true });
  });
});
searchInput.addEventListener('input', renderRecords);
statusFilter.addEventListener('change', renderRecords);
document.getElementById('printReceipt').addEventListener('click', () => window.print());
document.getElementById('newRequest').addEventListener('click', () => {
  form.reset(); clearErrors(); receiptSection.hidden = true; feedback.textContent = '';
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
});
menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
}));
renderRecords();
