const homeView = document.querySelector('#home-view');
const adminView = document.querySelector('#admin-view');
const formMessage = document.querySelector('#form-message');
let feedbackRows = [];

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function showAdmin() {
  homeView.hidden = true; adminView.hidden = false;
  checkAdmin();
}
function showHome() { adminView.hidden = true; homeView.hidden = false; }
document.querySelector('#admin-toggle').addEventListener('click', () => adminView.hidden ? showAdmin() : showHome());

document.querySelector('#feedback-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.querySelector('#submit-button');
  formMessage.textContent = ''; formMessage.className = 'message'; button.disabled = true; button.textContent = 'Sending…';
  const values = Object.fromEntries(new FormData(form));
  try {
    const result = await api('/api/feedback', { method: 'POST', body: JSON.stringify(values) });
    form.reset(); formMessage.textContent = result.message; formMessage.classList.add('success');
  } catch (error) { formMessage.textContent = error.message; formMessage.classList.add('error'); }
  finally { button.disabled = false; button.innerHTML = 'Submit feedback <span aria-hidden="true">→</span>'; }
});

const loginForm = document.querySelector('#login-form');
const inbox = document.querySelector('#inbox-panel');
const logoutButton = document.querySelector('#logout-button');
async function checkAdmin() {
  try {
    const { isAdmin } = await api('/api/admin/me');
    loginForm.hidden = isAdmin; inbox.hidden = !isAdmin; logoutButton.hidden = !isAdmin;
    if (isAdmin) await loadFeedback();
  } catch { loginForm.hidden = false; inbox.hidden = true; }
}
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const message = document.querySelector('#login-message'); message.textContent = '';
  const values = Object.fromEntries(new FormData(loginForm));
  try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify(values) }); loginForm.reset(); await checkAdmin(); }
  catch (error) { message.textContent = error.message; message.className = 'message error'; }
});
logoutButton.addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST' }); } finally { await checkAdmin(); } });
async function loadFeedback() {
  const list = document.querySelector('#feedback-list'); list.innerHTML = '<p class="empty-state">Loading feedback…</p>';
  try { const data = await api('/api/admin/feedback'); feedbackRows = data.feedback; renderFeedback(); }
  catch (error) { list.innerHTML = `<p class="empty-state error">${escapeHtml(error.message)}</p>`; }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function renderFeedback() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  const status = document.querySelector('#status-filter').value;
  const rows = feedbackRows.filter((row) => (status === 'all' || row.status === status) && [row.student_name, row.student_email, row.course_code, row.instructor_name, row.comments].some((value) => value.toLowerCase().includes(query)));
  document.querySelector('#result-count').textContent = `${rows.length} ${rows.length === 1 ? 'submission' : 'submissions'}`;
  const list = document.querySelector('#feedback-list');
  if (!rows.length) { list.innerHTML = '<p class="empty-state">No matching submissions yet.</p>'; return; }
  list.innerHTML = rows.map((row) => `<article class="feedback-card"><div class="feedback-top"><div><span class="course-tag">${escapeHtml(row.course_code)}</span><span class="status-tag ${row.status}">${escapeHtml(row.status)}</span></div><time>${new Date(row.created_at).toLocaleString()}</time></div><div class="feedback-meta"><strong>${escapeHtml(row.student_name)}</strong><span>${escapeHtml(row.student_email)}</span><span>Instructor: ${escapeHtml(row.instructor_name)}</span></div><p class="stars" aria-label="Rating ${row.rating} out of 5">${'★'.repeat(row.rating)}${'☆'.repeat(5 - row.rating)} <small>${row.rating}/5</small></p><p class="feedback-comment">${escapeHtml(row.comments)}</p>${row.status === 'new' ? `<button class="button button-small" data-review="${escapeHtml(row.id)}">Mark reviewed</button>` : ''}</article>`).join('');
  list.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    try { await api(`/api/admin/feedback/${encodeURIComponent(button.dataset.review)}`, { method: 'PATCH', body: JSON.stringify({ status: 'reviewed' }) }); await loadFeedback(); }
    catch (error) { button.disabled = false; window.alert(error.message); }
  }));
}
document.querySelector('#search-input').addEventListener('input', renderFeedback);
document.querySelector('#status-filter').addEventListener('change', renderFeedback);
