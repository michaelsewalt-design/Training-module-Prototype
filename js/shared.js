/* ═══════════════════════════════════════
COMPLIANCE TRAINING — SHARED JS
═══════════════════════════════════════ */

// ─── AUTH ──────────────────────────────
function getToken() {
return sessionStorage.getItem('ct_token');
}

function requireAuth() {
const token = getToken();
if (!token) {
window.location.href = '/login.html';
return false;
}
return true;
}

async function verifyAuth() {
const token = getToken();
if (!token) {
window.location.href = '/login.html';
return false;
}
try {
const resp = await fetch('/api/auth', {
method: 'GET',
headers: { 'Authorization': `Bearer ${token}` }
});
if (!resp.ok) {
sessionStorage.removeItem('ct_token');
window.location.href = '/login.html';
return false;
}
return true;
} catch {
return true; // Allow offline-ish usage if token exists
}
}

function logout() {
sessionStorage.removeItem('ct_token');
window.location.href = '/login.html';
}

// ─── API CALLS ─────────────────────────
async function callClaude(messages, systemPrompt, maxTokens) {
const token = getToken();
if (!token) throw new Error('Not authenticated');

const resp = await fetch('/api/claude', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify({
messages,
system: systemPrompt,
max_tokens: maxTokens || 1024,
model: 'claude-sonnet-4-20250514'
})
});

if (resp.status === 401) {
sessionStorage.removeItem('ct_token');
window.location.href = '/login.html';
throw new Error('Session expired');
}

if (!resp.ok) {
const err = await resp.json().catch(() => ({}));
throw new Error(err.error || err.details || `API error: ${resp.status}`);
}

const data = await resp.json();
return data.content?.[0]?.text || '';
}

async function loadConfig() {
const token = getToken();
if (!token) return null;

try {
const resp = await fetch('/api/config', {
headers: { 'Authorization': `Bearer ${token}` }
});
if (!resp.ok) return null;
return await resp.json();
} catch {
return null;
}
}

// ─── UI HELPERS ────────────────────────
function toggleAcc(id) {
document.getElementById(id).classList.toggle('open');
}

function autoResize(el) {
el.style.height = 'auto';
el.style.height = el.scrollHeight + 'px';
}

function handleChatKey(event) {
if (event.key === 'Enter' && !event.shiftKey) {
event.preventDefault();
sendChat();
}
}

function formatText(text) {
return text
.replace(/\*\*(.*?)\*\*/g, '$1')
.replace(/\*(.*?)\*/g, '$1')
.split('\n\n')
.map(p => `

${p.replace(/\n/g, '
')}

`)
.join('');
}
// ─── SHARED STATE ──────────────────────
let selectedLevel = null;
let selectedStrictness = 'normal';
let agent1Id = '';
let agent2Id = '';
let chatHistory = [];
let stepsCompleted = [false, false, false, false, false];
let currentTab = 'theory';
let activeScenario = null;
let quizResults = [];

// ─── LEVEL SELECTION ───────────────────
function selectLevel(btn) {
document.querySelectorAll('#setupScreen .level-btn').forEach(b => b.classList.remove('selected'));
btn.classList.add('selected');
selectedLevel = btn.dataset.level;

// Show strictness card
const strictCard = document.getElementById('strictnessCard');
if (strictCard) {
strictCard.style