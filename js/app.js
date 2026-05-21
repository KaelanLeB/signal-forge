import { parse as parsePaste }      from './adapters/paste.js';
import { validateFeedbackItems }    from './pipeline/normalize.js';
import { clusterFeedback }          from './pipeline/cluster.js';
import { draftPRD }                 from './pipeline/prd.js';
import { saveItem, getItem, removeItem } from './storage/storage.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const apiKeyInput  = document.getElementById('api-key-input');
const saveKeyBtn   = document.getElementById('save-key-btn');
const clearKeyBtn  = document.getElementById('clear-key-btn');
const keyStatus    = document.getElementById('key-status');
const textarea     = document.getElementById('feedback-input');
const itemCount    = document.getElementById('item-count');
const processBtn   = document.getElementById('process-btn');
const resultsPanel = document.getElementById('results');
const exportRow    = document.getElementById('export-row');
const exportBtn    = document.getElementById('export-btn');

// ── Initialise ────────────────────────────────────────────────────────────────

function init() {
  const saved = getItem('apiKey');
  if (saved) {
    apiKeyInput.value = '••••••••' + saved.slice(-4);
    setKeyStatus('API key saved', 'saved');
  }
  updateItemCount();
}

// ── API key ───────────────────────────────────────────────────────────────────

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key || key.startsWith('•')) return;
  saveItem('apiKey', key);
  apiKeyInput.value = '••••••••' + key.slice(-4);
  setKeyStatus('Key saved', 'saved');
});

clearKeyBtn.addEventListener('click', () => {
  removeItem('apiKey');
  apiKeyInput.value = '';
  setKeyStatus('Key cleared', 'cleared');
});

function setKeyStatus(msg, cls) {
  keyStatus.textContent = msg;
  keyStatus.className = `key-status ${cls}`;
}

// ── Live item count ───────────────────────────────────────────────────────────

textarea.addEventListener('input', updateItemCount);

function updateItemCount() {
  const raw = textarea.value.trim();
  if (!raw) { itemCount.textContent = ''; return; }
  const sep = raw.includes('\n\n') ? /\n\n+/ : /\n/;
  const n = raw.split(sep).filter(c => c.trim().length > 0).length;
  itemCount.textContent = `${n} item${n !== 1 ? 's' : ''} detected`;
}

// ── Process ───────────────────────────────────────────────────────────────────

processBtn.addEventListener('click', async () => {
  const raw = textarea.value.trim();
  if (!raw) { showError('Paste some feedback first.'); return; }

  processBtn.disabled = true;
  processBtn.textContent = 'Processing…';
  exportRow.classList.add('hidden');

  try {
    showLoading('Parsing feedback…');
    const items = validateFeedbackItems(parsePaste(raw));

    showLoading(`Clustering ${items.length} item${items.length !== 1 ? 's' : ''} into themes…`);
    const themes = await clusterFeedback(items);

    const prds = [];
    for (const theme of themes) {
      showLoading(`Drafting PRD for "${theme.theme_name}"…`);
      const prd = await draftPRD(theme, items);
      prds.push({ theme, prd });
    }

    renderResults(items, prds);
    exportBtn.onclick = () => exportMarkdown(prds);
    exportRow.classList.remove('hidden');

  } catch (err) {
    showError(err.message);
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = 'Process Feedback';
  }
});

// ── Rendering ─────────────────────────────────────────────────────────────────

function showLoading(msg) {
  resultsPanel.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>${esc(msg)}</p>
    </div>`;
  resultsPanel.classList.remove('hidden');
}

function showError(msg) {
  resultsPanel.innerHTML = `<div class="error">${esc(msg)}</div>`;
  resultsPanel.classList.remove('hidden');
}

function renderResults(items, prds) {
  const priorityClass = { P0: 'priority-p0', P1: 'priority-p1', P2: 'priority-p2' };

  resultsPanel.innerHTML = `
    <div class="results-header">
      <h2>Results</h2>
      <p class="results-meta">${items.length} feedback item${items.length !== 1 ? 's' : ''} → ${prds.length} theme${prds.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="prd-list">
      ${prds.map(({ theme, prd }) => `
        <div class="prd-card">
          <div class="prd-card-header">
            <div>
              <h3>${esc(theme.theme_name)}</h3>
              <p class="theme-description">${esc(theme.theme_description)}</p>
            </div>
            <span class="priority-badge ${priorityClass[prd.priority] ?? ''}">${esc(prd.priority)}</span>
          </div>
          <p class="priority-reasoning">${esc(prd.priority_reasoning)}</p>

          <div class="prd-section">
            <h4>Problem Statement</h4>
            <p>${esc(prd.problem_statement)}</p>
          </div>
          <div class="prd-section">
            <h4>Proposed Solution</h4>
            <p>${esc(prd.proposed_solution)}</p>
          </div>
          <div class="prd-section">
            <h4>Success Metrics</h4>
            <ul>${prd.success_metrics.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
          </div>
          <div class="prd-section">
            <h4>Affected User Segment</h4>
            <p>${esc(prd.affected_user_segment)}</p>
          </div>
          <div class="prd-section">
            <h4>Source Feedback · ${theme.item_ids.length} item${theme.item_ids.length !== 1 ? 's' : ''}</h4>
            <ul class="source-items">
              ${items
                .filter(i => theme.item_ids.includes(i.id))
                .map(i => `<li>"${esc(i.text)}"</li>`)
                .join('')}
            </ul>
          </div>
        </div>`).join('')}
    </div>`;
  resultsPanel.classList.remove('hidden');
}

// ── Export (Step 5 — placeholder) ─────────────────────────────────────────────

function exportMarkdown(_prds) {
  alert('Export will be implemented in Step 5.');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
