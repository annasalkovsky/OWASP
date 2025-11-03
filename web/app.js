// Minimal parser and report generator for OWASP dependency-check XML + suppressions
// Assumes dependency-check-report XML uses <dependency> -> <vulnerability> elements
// and suppressions.xml uses <suppress><note> with <cpe> or <name> or <cvss> matching rules.
// This is intentionally simple and may need expansion for other shapes.

const reportDrop = document.getElementById('report-drop');
const suppressionsDrop = document.getElementById('suppressions-drop');
const reportInput = document.getElementById('report-file');
const suppressionsInput = document.getElementById('suppressions-file');
const baselineReportDrop = document.getElementById('baseline-report-drop');
const baselineSuppressionsDrop = document.getElementById('baseline-suppressions-drop');
const baselineReportInput = document.getElementById('baseline-report-file');
const baselineSuppressionsInput = document.getElementById('baseline-suppressions-file');
const deltaToggle = document.getElementById('delta-mode-toggle');
const generateBtn = document.getElementById('generate-btn');
const exportBtn = document.getElementById('export-btn');
const reportArea = document.getElementById('report-area');

let dependencyXml = null;
let suppressionsXml = null;
let baselineDependencyXml = null;
let baselineSuppressionsXml = null;
let isDeltaMode = false;

reportInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => dependencyXml = xml); });
suppressionsInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => suppressionsXml = xml); });
baselineReportInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => baselineDependencyXml = xml); });
baselineSuppressionsInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => baselineSuppressionsXml = xml); });

// Toggle uploaded visual state
reportInput.addEventListener('change', () => setUploadedState('report', !!reportInput.files.length));
suppressionsInput.addEventListener('change', () => setUploadedState('suppressions', !!suppressionsInput.files.length));
baselineReportInput.addEventListener('change', () => setUploadedState('baseline', !!baselineReportInput.files.length));
baselineSuppressionsInput.addEventListener('change', () => setUploadedState('baseline-suppressions', !!baselineSuppressionsInput.files.length));

// Delta mode toggle
deltaToggle.addEventListener('change', () => {
  isDeltaMode = deltaToggle.checked;
  document.getElementById('delta-uploads').style.display = isDeltaMode ? 'flex' : 'none';
  updateGenerateButtonText();
});

function setUploadedState(which, state){
  const configs = {
    'report': { zone: 'report-drop', msg: 'report-uploaded' },
    'suppressions': { zone: 'suppressions-drop', msg: 'suppressions-uploaded' },
    'baseline': { zone: 'baseline-report-drop', msg: 'baseline-uploaded' },
    'baseline-suppressions': { zone: 'baseline-suppressions-drop', msg: 'baseline-suppressions-uploaded' }
  };
  
  const config = configs[which];
  if (!config) return;
  
  const zone = document.getElementById(config.zone);
  const msg = document.getElementById(config.msg);
  if(state){ 
    zone?.classList.add('uploaded'); 
    if(msg) { msg.setAttribute('aria-hidden','false'); msg.style.display = 'block'; }
  } else { 
    zone?.classList.remove('uploaded'); 
    if(msg) { msg.setAttribute('aria-hidden','true'); msg.style.display = 'none'; }
  }
}

function updateGenerateButtonText(){
  generateBtn.textContent = isDeltaMode ? 'Generate Delta Report' : 'Generate Audit Report';
}

// Ensure uploaded message display matches aria-hidden (fix for pre-rendered visibility)
function refreshUploadedDisplay(){
  const rmsg = document.getElementById('report-uploaded');
  if(rmsg) rmsg.style.display = rmsg.getAttribute('aria-hidden') === 'false' ? 'block' : 'none';
  const smsg = document.getElementById('suppressions-uploaded');
  if(smsg) smsg.style.display = smsg.getAttribute('aria-hidden') === 'false' ? 'block' : 'none';
}

// Initialize states based on existing inputs (hidden by default)
document.addEventListener('DOMContentLoaded', () => {
  setUploadedState('report', !!reportInput.files.length);
  setUploadedState('suppressions', !!suppressionsInput.files.length);
  refreshUploadedDisplay();
});

// drag styling (optional UX)
;['dragenter','dragover'].forEach(ev => {
  reportDrop.addEventListener(ev, e => e.preventDefault());
  suppressionsDrop.addEventListener(ev, e => e.preventDefault());
  baselineReportDrop?.addEventListener(ev, e => e.preventDefault());
  baselineSuppressionsDrop?.addEventListener(ev, e => e.preventDefault());
});

// Handle drop events to load files and set uploaded state
['drop'].forEach(ev => {
  reportDrop.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ reportInput.files = e.dataTransfer.files; loadFile(f, xml => dependencyXml = xml); setUploadedState('report', true); }
  });
  suppressionsDrop.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ suppressionsInput.files = e.dataTransfer.files; loadFile(f, xml => suppressionsXml = xml); setUploadedState('suppressions', true); }
  });
  baselineReportDrop?.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ baselineReportInput.files = e.dataTransfer.files; loadFile(f, xml => baselineDependencyXml = xml); setUploadedState('baseline', true); }
  });
  baselineSuppressionsDrop?.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ baselineSuppressionsInput.files = e.dataTransfer.files; loadFile(f, xml => baselineSuppressionsXml = xml); setUploadedState('baseline-suppressions', true); }
  });
});

function loadFile(file, cb){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(reader.result, "application/xml");
    cb(xml);
  };
  reader.readAsText(file);
}

generateBtn.addEventListener('click', () => {
  if(!dependencyXml) return alert('Please upload a dependency-check XML report');
  
  if(isDeltaMode) {
    if(!baselineDependencyXml) return alert('Please upload a baseline report for delta comparison');
    generateDeltaReport();
  } else {
    const findings = parseDependencyCheck(dependencyXml);
    const suppressedRules = suppressionsXml ? parseSuppressions(suppressionsXml) : [];
    const unsuppressed = filterSuppressions(findings, suppressedRules);
    renderReport(unsuppressed);
  }
  
  exportBtn.disabled = false;
});

function generateDeltaReport(){
  // Parse current and baseline reports
  const currentFindings = parseDependencyCheck(dependencyXml);
  const baselineFindings = parseDependencyCheck(baselineDependencyXml);
  
  // Parse suppressions
  const currentSuppressions = suppressionsXml ? parseSuppressions(suppressionsXml) : [];
  const baselineSuppressions = baselineSuppressionsXml ? parseSuppressions(baselineSuppressionsXml) : [];
  
  // Calculate delta
  const delta = calculateDelta(currentFindings, baselineFindings, currentSuppressions, baselineSuppressions);
  
  // Render delta report
  renderDeltaReport(delta);
}

function calculateDelta(current, baseline, currentSuppressions, baselineSuppressions){
  // Create vulnerability signature for comparison (name + file)
  const createSig = (vuln) => `${vuln.name}|${vuln.file}`;
  
  const currentSigs = new Set(current.map(createSig));
  const baselineSigs = new Set(baseline.map(createSig));
  
  // Fixed: in baseline but not in current
  const fixed = baseline.filter(vuln => !currentSigs.has(createSig(vuln)));
  
  // New: in current but not in baseline  
  const newVulns = current.filter(vuln => !baselineSigs.has(createSig(vuln)));
  
  // Apply current suppressions to new vulnerabilities
  const newUnsuppressed = filterSuppressions(newVulns, currentSuppressions);
  
  // Suppression changes
  const suppressionChanges = {
    added: currentSuppressions.filter(s => !baselineSuppressions.some(bs => 
      bs.type === s.type && bs.value === s.value
    )),
    removed: baselineSuppressions.filter(s => !currentSuppressions.some(cs => 
      cs.type === s.type && cs.value === s.value
    ))
  };
  
  // All current vulnerabilities after applying suppressions (for context)
  const currentUnsuppressed = filterSuppressions(current, currentSuppressions);
  
  return {
    fixed,
    newVulns,
    newUnsuppressed,
    suppressionChanges,
    currentUnsuppressed,
    summary: {
      totalCurrent: current.length,
      totalBaseline: baseline.length,
      fixedCount: fixed.length,
      newCount: newVulns.length,
      newUnsuppressedCount: newUnsuppressed.length
    }
  };
}

exportBtn.addEventListener('click', async () => {
  // Export current report-area as a self-contained HTML file with inline CSS and JS
  try {
    // Try to find the current stylesheet href
    const link = document.querySelector('link[rel="stylesheet"]');
    const href = link ? link.getAttribute('href') : './styles.css';

    // Helper: try fetch first, otherwise fall back to reading document.styleSheets
    async function collectCssText(){
      let css = '';
      if(href){
        try{
          const res = await fetch(href);
          if(res.ok){ css = await res.text(); }
        } catch(e){
          // fetch failed, will try styleSheets next
          console.warn('Stylesheet fetch failed, will try document.styleSheets:', e);
        }
      }
      if(!css){
        // Fallback: aggregate rules from accessible stylesheets
        for(const sheet of Array.from(document.styleSheets)){
          try{
            if(!sheet.cssRules) continue;
            for(const rule of Array.from(sheet.cssRules)){
              css += rule.cssText + '\n';
            }
          }catch(_){ /* cross-origin or inaccessible stylesheet */ }
        }
      }
      return css;
    }

    const cssText = await collectCssText();

    // Inline small script to re-enable interactivity in the exported file
    const interactiveScript = `
      (function(){
        // Row toggles and keyboard support
        function wireRowToggles(){
          document.querySelectorAll('.vuln-row').forEach(r => {
            r.setAttribute('tabindex','0');
            r.addEventListener('click', ()=>{
              const idx = r.getAttribute('data-idx');
              const panel = document.getElementById('panel-'+idx);
              if(panel) panel.classList.toggle('show');
            });
            r.addEventListener('keydown', e=>{ if(e.key==='Enter'){ r.click(); } });
          });
        }

        // Filtering logic used in exported report
        function wireFilters(){
          const severityFilter = document.getElementById('severity-filter');
          const searchFilter = document.getElementById('search-filter');
          const resetBtn = document.getElementById('reset-filters');
          function applyFilters(){
            const sev = severityFilter ? severityFilter.value : 'ALL';
            const q = searchFilter ? searchFilter.value.trim().toLowerCase() : '';
            document.querySelectorAll('#vuln-table tbody tr.vuln-row').forEach(r=>{
              const idx = r.getAttribute('data-idx');
              const name = r.querySelector('td:nth-child(2)') ? r.querySelector('td:nth-child(2)').textContent.toLowerCase() : '';
              const file = r.querySelector('td:nth-child(6)') ? r.querySelector('td:nth-child(6)').textContent.toLowerCase() : '';
              const sevCell = r.querySelector('td:nth-child(3)') ? r.querySelector('td:nth-child(3)').textContent.toUpperCase() : '';
              let hide = false;
              if(sev !== 'ALL' && sevCell !== sev) hide = true;
              if(q && !(name.includes(q) || file.includes(q))) hide = true;
              const details = document.getElementById('details-'+idx);
              if(hide){ r.style.display='none'; if(details) details.style.display='none'; }
              else { r.style.display='table-row'; if(details) details.style.display='table-row'; }
            });
          }
          if(severityFilter) severityFilter.addEventListener('change', applyFilters);
          if(searchFilter) searchFilter.addEventListener('input', applyFilters);
          if(resetBtn) resetBtn.addEventListener('click', ()=>{ if(severityFilter) severityFilter.value='ALL'; if(searchFilter) searchFilter.value=''; applyFilters(); });
        }

        // Prevent links from navigating when offline
        document.querySelectorAll('a').forEach(a=>a.addEventListener('click', e=>e.preventDefault()));
        // Wire functionality
        wireRowToggles();
        wireFilters();
      })();
    `;

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>OWASP Audit Report</title>
          <style>${cssText}</style>
        </head>
        <body>
          ${reportArea.innerHTML}
          <script>${interactiveScript} <\/script>
        </body>
      </html>`;

    const blob = new Blob([html], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `OWASP-Audit-Report-${new Date().toISOString().split('T')[0]}.html`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed: ' + err.message);
  }
});

// Parse dependency-check output to array of {id, name, severity, cvss, description, file}
function parseDependencyCheck(xml){
  const deps = [];
  // dependency elements
  const depEls = Array.from(xml.getElementsByTagName('dependency'));
  depEls.forEach(dep => {
    const fileName = safeText(dep.getElementsByTagName('fileName')[0]) || safeText(dep.getElementsByTagName('filePath')[0]) || '';
    const vulnEls = Array.from(dep.getElementsByTagName('vulnerability'));
    vulnEls.forEach(v => {
      const name = safeText(v.getElementsByTagName('name')[0]) || 'UNKNOWN';
      const severity = (safeText(v.getElementsByTagName('severity')[0]) || 'UNKNOWN').toUpperCase();
      const description = safeText(v.getElementsByTagName('description')[0]) || '';
      // attempt CVSS score
      let cvss = '';
      const cvssV3 = v.getElementsByTagName('cvssV3')[0];
      if(cvssV3) cvss = safeText(cvssV3.getElementsByTagName('score')[0]) || '';
      if(!cvss){
        const cvssV2 = v.getElementsByTagName('cvssV2')[0];
        if(cvssV2) cvss = safeText(cvssV2.getElementsByTagName('score')[0]) || '';
      }
      deps.push({ id: name, name, severity, description, cvss, file: fileName });
    });
  });
  return deps;
}

function safeText(node){ return node && node.textContent ? node.textContent.trim() : ''; }

// Rough parse of suppressions.xml: collect names or cpes to suppress
function parseSuppressions(xml){
  const rules = [];
  // find suppression items: <suppress> with <note> or <name> or <cpe> children (format differs)
  const suppressEls = Array.from(xml.getElementsByTagName('suppress'));
  suppressEls.forEach(s => {
    const name = safeText(s.getElementsByTagName('name')[0]);
    const cpe = safeText(s.getElementsByTagName('cpe')[0]);
    const note = safeText(s.getElementsByTagName('notes')[0]) || safeText(s.getElementsByTagName('note')[0]);
    if(name) rules.push({type:'name', value:name});
    if(cpe) rules.push({type:'cpe', value:cpe});
    if(note) rules.push({type:'note', value:note});
  });
  // Some suppressions use <suppress><artifact><name>... pattern
  const artifactNames = Array.from(xml.getElementsByTagName('artifactName'));
  artifactNames.forEach(n => {
    const v = safeText(n);
    if(v) rules.push({type:'name', value:v});
  });
  return rules;
}

function filterSuppressions(findings, suppressions){
  if(!suppressions || suppressions.length===0) return findings;
  return findings.filter(f => {
    // If any suppression rule matches ID, file or name substring -> suppress
    for(const r of suppressions){
      if(r.type === 'name' && f.name.includes(r.value)) return false;
      if(r.type === 'cpe' && f.description.includes(r.value)) return false;
      if(r.type === 'note' && (f.description + f.name + f.file).includes(r.value)) return false;
    }
    return true;
  });
}

function severityCounts(items){
  const counts = {CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,UNKNOWN:0};
  items.forEach(i => {
    const s = (i.severity || 'UNKNOWN').toUpperCase();
    if(counts[s]!==undefined) counts[s]++;
    else counts.UNKNOWN++;
  });
  return counts;
}

function renderDeltaReport(delta){
  reportArea.hidden = false;
  
  const fixedCounts = severityCounts(delta.fixed);
  const newCounts = severityCounts(delta.newUnsuppressed);
  
  reportArea.innerHTML = `
    <div class="report-header">
      <h2>OWASP Delta Report</h2>
      <div class="small">Generated: ${new Date().toLocaleString()} &nbsp; 
        <strong>Fixed:</strong> ${delta.fixedCount} &nbsp;
        <strong>New:</strong> ${delta.newUnsuppressedCount} &nbsp;
        <strong>Current Total:</strong> ${delta.currentUnsuppressed.length}
      </div>
    </div>

    <div class="delta-summary" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="delta-section">
        <h3 style="color:#10b981;margin-bottom:12px">✅ Fixed Vulnerabilities (${delta.fixedCount})</h3>
        <div class="metrics">
          <div class="metric critical"><strong>${fixedCounts.CRITICAL}</strong><div class="small">CRITICAL</div></div>
          <div class="metric high"><strong>${fixedCounts.HIGH}</strong><div class="small">HIGH</div></div>
          <div class="metric medium"><strong>${fixedCounts.MEDIUM}</strong><div class="small">MEDIUM</div></div>
          <div class="metric low"><strong>${fixedCounts.LOW}</strong><div class="small">LOW</div></div>
        </div>
      </div>
      
      <div class="delta-section">
        <h3 style="color:#f59e0b;margin-bottom:12px">🆕 New Vulnerabilities (${delta.newUnsuppressedCount})</h3>
        <div class="metrics">
          <div class="metric critical"><strong>${newCounts.CRITICAL}</strong><div class="small">CRITICAL</div></div>
          <div class="metric high"><strong>${newCounts.HIGH}</strong><div class="small">HIGH</div></div>
          <div class="metric medium"><strong>${newCounts.MEDIUM}</strong><div class="small">MEDIUM</div></div>
          <div class="metric low"><strong>${newCounts.LOW}</strong><div class="small">LOW</div></div>
        </div>
      </div>
      
      <div class="delta-section">
        <h3 style="color:#6366f1;margin-bottom:12px">📊 Suppression Changes</h3>
        <div style="padding:16px;background:#f8fafc;border-radius:8px">
          <div><strong>Added:</strong> ${delta.suppressionChanges.added.length} suppressions</div>
          <div><strong>Removed:</strong> ${delta.suppressionChanges.removed.length} suppressions</div>
        </div>
      </div>
    </div>

    ${delta.fixedCount > 0 ? `
    <h3>Fixed Vulnerabilities</h3>
    <table class="table">
      <thead><tr><th>Vulnerability</th><th>Severity</th><th>CVSS</th><th>File</th></tr></thead>
      <tbody>
        ${delta.fixed.map(vuln => `
          <tr>
            <td>${escapeHtml(vuln.name)}</td>
            <td>${renderBadge(vuln.severity)}</td>
            <td>${renderCvss(vuln.cvss)}</td>
            <td>${escapeHtml(vuln.file)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${delta.newUnsuppressedCount > 0 ? `
    <h3>New Vulnerabilities (Unhandled)</h3>
    <table class="table" id="new-vuln-table">
      <thead><tr><th>#</th><th>VULNERABILITY</th><th>SEVERITY</th><th>CVSS SCORE</th><th>DESCRIPTION</th><th>FILE</th></tr></thead>
      <tbody>
        ${delta.newUnsuppressed.map((it,idx) => `
          <tr class="vuln-row" data-idx="${idx}">
            <td>${idx+1}</td>
            <td><a href="#" onclick="return false">${escapeHtml(it.name)}</a></td>
            <td>${renderBadge(it.severity)}</td>
            <td>${renderCvss(it.cvss)}</td>
            <td>${escapeHtml(truncate(it.description,240))}</td>
            <td>${escapeHtml(it.file)}</td>
          </tr>
          <tr class="vuln-details" id="details-${idx}">
            <td colspan="6">
              <div class="vuln-details-panel" id="panel-${idx}">
                <div class="vuln-details-grid">
                  <div>
                    <h4 style="margin:0 0 8px 0">${escapeHtml(it.name)}</h4>
                    <div class="vuln-meta">
                      <div><strong>Severity:</strong> ${escapeHtml(it.severity)}</div>
                      <div><strong>CVSS:</strong> ${escapeHtml(it.cvss || 'N/A')}</div>
                      <div style="margin-top:8px">${escapeHtml(it.description)}</div>
                    </div>
                  </div>
                  <div>
                    <div style="background:#f8fafc;padding:12px;border-radius:8px">
                      <div class="small" style="margin-bottom:8px">File</div>
                      <div style="font-weight:600">${escapeHtml(it.file)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<h3>No New Vulnerabilities Found</h3>'}

    <div class="footer">Delta Report from OWASP Dependency Audit Tool</div>
  `;

  // Attach interactivity to new vulnerability rows  
  attachInteractivity();
}

function renderReport(items){
  const counts = severityCounts(items);
  const total = items.length;
  reportArea.hidden = false;
  reportArea.innerHTML = `
    <div class="report-header">
      <h2>OWASP Dependency Check</h2>
      <div class="small">Generated: ${new Date().toLocaleString()} &nbsp; Total Vulnerabilities: <strong>${total}</strong></div>
    </div>

    <div class="report-controls" style="display:flex;justify-content:space-between;align-items:center;margin:16px 0;gap:12px">
      <div style="display:flex;gap:8px;align-items:center">
        <label class="small" for="severity-filter">Severity:</label>
        <select id="severity-filter" style="padding:8px;border-radius:6px;border:1px solid #e6e9ef">
          <option value="ALL">All</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input id="search-filter" placeholder="Search vulnerability or file" style="padding:8px;border-radius:6px;border:1px solid #e6e9ef;min-width:220px;margin-left:8px">
        <button id="reset-filters" class="btn secondary" style="padding:8px 12px;margin-left:8px">Reset</button>
      </div>
      <div id="summary-chart-container" style="min-width:260px"></div>
    </div>

    <div class="metrics">
      <div class="metric critical">
        <strong>${counts.CRITICAL}</strong>
        <div class="small">CRITICAL</div>
      </div>
      <div class="metric high">
        <strong>${counts.HIGH}</strong>
        <div class="small">HIGH</div>
      </div>
      <div class="metric medium">
        <strong>${counts.MEDIUM}</strong>
        <div class="small">MEDIUM</div>
      </div>
      <div class="metric low">
        <strong>${counts.LOW}</strong>
        <div class="small">LOW</div>
      </div>
    </div>

    <h3>Unsuppressed Vulnerabilities</h3>
    <table class="table" id="vuln-table">
      <thead><tr><th>#</th><th>VULNERABILITY</th><th>SEVERITY</th><th>CVSS SCORE</th><th>DESCRIPTION</th><th>FILE</th></tr></thead>
      <tbody>
          ${items.map((it,idx) => `
            <tr class="vuln-row" data-idx="${idx}">
              <td>${idx+1}</td>
              <td><a href="#" onclick="return false">${escapeHtml(it.name)}</a></td>
              <td>${renderBadge(it.severity)}</td>
              <td>${renderCvss(it.cvss)}</td>
              <td>${escapeHtml(truncate(it.description,240))}</td>
              <td>${escapeHtml(it.file)}</td>
            </tr>
            <tr class="vuln-details" id="details-${idx}">
              <td colspan="6">
                <div class="vuln-details-panel" id="panel-${idx}">
                  <div class="vuln-details-grid">
                    <div>
                      <h4 style="margin:0 0 8px 0">${escapeHtml(it.name)}</h4>
                      <div class="vuln-meta">
                        <div><strong>Severity:</strong> ${escapeHtml(it.severity)}</div>
                        <div><strong>CVSS:</strong> ${escapeHtml(it.cvss || 'N/A')}</div>
                        <div style="margin-top:8px">${escapeHtml(it.description)}</div>
                      </div>
                    </div>
                    <div>
                      <div style="background:#f8fafc;padding:12px;border-radius:8px">
                        <div class="small" style="margin-bottom:8px">File</div>
                        <div style="font-weight:600">${escapeHtml(it.file)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">Exported from OWASP Dependency Audit Tool</div>
  `;

  // After render, insert summary chart SVG
  const chartContainer = document.getElementById('summary-chart-container');
  if(chartContainer){ chartContainer.innerHTML = renderSummaryChart(counts); }
  // Attach interactivity for filtering and expandable rows
  attachInteractivity();

  // Initialize sorting and pagination
  initTableControls(items);
}

// --- Table controls: sorting, pagination, CSV export ---
function initTableControls(items){
  const rowsPerPage = 10;
  let currentPage = 1;
  let sortKey = null; // 'name' or 'severity' or 'cvss'
  let sortDir = 1; // 1 asc, -1 desc

  const table = document.getElementById('vuln-table');
  if(!table) return;

  // Add click handlers on headers
  const headers = table.querySelectorAll('th');
  headers.forEach((th, idx)=>{
    th.addEventListener('click', ()=>{
      const key = idx===1 ? 'name' : idx===2 ? 'severity' : idx===3 ? 'cvss' : null;
      if(!key) return;
      if(sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = -1; }
      headers.forEach(h=>h.classList.remove('sort-asc','sort-desc'));
      th.classList.add(sortDir===1? 'sort-asc':'sort-desc');
      renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir);
    });
  });

  // pagination container
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'pagination';
  table.parentNode.insertBefore(paginationContainer, table.nextSibling);

  function updatePagination(){
    const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
    paginationContainer.innerHTML = '';
    const prev = document.createElement('button'); prev.textContent='Prev'; prev.disabled = currentPage===1; prev.onclick = ()=>{ currentPage--; renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); };
    const next = document.createElement('button'); next.textContent='Next'; next.disabled = currentPage===totalPages; next.onclick = ()=>{ currentPage++; renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); };
    const info = document.createElement('div'); info.textContent = `Page ${currentPage} / ${totalPages}`;
    paginationContainer.appendChild(prev); paginationContainer.appendChild(info); paginationContainer.appendChild(next);
  }

  // CSV export button
  const csvBtn = document.getElementById('export-csv-btn');
  if(csvBtn){ csvBtn.disabled = false; csvBtn.addEventListener('click', ()=>{
    const csv = generateCSVFromTable();
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `owasp-report-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  }); }

  // initial render
  renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir);
  updatePagination();

  // When filters change, re-run pagination & table (attach listener via existing attachInteractivity)
  document.getElementById('severity-filter')?.addEventListener('change', ()=>{ currentPage=1; renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); updatePagination(); });
  document.getElementById('search-filter')?.addEventListener('input', ()=>{ currentPage=1; renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); updatePagination(); });
}

function renderTablePage(items, perPage, page, sortKey, sortDir){
  // Build filtered list according to filters
  const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
  const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
  let list = items.filter(it=>{
    if(sev !== 'ALL' && (it.severity||'').toUpperCase() !== sev) return false;
    if(q && !((it.name||'').toLowerCase().includes(q) || (it.file||'').toLowerCase().includes(q))) return false;
    return true;
  });

  if(sortKey){
    list.sort((a,b)=>{
      let va = (sortKey==='cvss') ? parseFloat(a.cvss)||0 : (a[sortKey]||'').toString().toLowerCase();
      let vb = (sortKey==='cvss') ? parseFloat(b.cvss)||0 : (b[sortKey]||'').toString().toLowerCase();
      if(va < vb) return -1 * sortDir; if(va > vb) return 1 * sortDir; return 0;
    });
  }

  const start = (page-1)*perPage; const pageItems = list.slice(start, start+perPage);
  const tbody = document.querySelector('#vuln-table tbody');
  if(!tbody) return;
  tbody.innerHTML = pageItems.map((it, idx)=>{
    const globalIdx = start + idx;
    return `
      <tr class="vuln-row" data-idx="${globalIdx}">
        <td>${globalIdx+1}</td>
        <td><a href="#" onclick="return false">${escapeHtml(it.name)}</a></td>
        <td>${renderBadge(it.severity)}</td>
        <td>${renderCvss(it.cvss)}</td>
        <td>${escapeHtml(truncate(it.description,240))}</td>
        <td>${escapeHtml(it.file)}</td>
      </tr>
      <tr class="vuln-details" id="details-${globalIdx}"><td colspan="6"><div class="vuln-details-panel" id="panel-${globalIdx}"><div class="vuln-details-grid"><div><h4 style="margin:0 0 8px 0">${escapeHtml(it.name)}</h4><div class="vuln-meta"><div><strong>Severity:</strong> ${escapeHtml(it.severity)}</div><div><strong>CVSS:</strong> ${escapeHtml(it.cvss||'N/A')}</div><div style="margin-top:8px">${escapeHtml(it.description)}</div></div></div><div><div style="background:#f8fafc;padding:12px;border-radius:8px"><div class="small" style="margin-bottom:8px">File</div><div style="font-weight:600">${escapeHtml(it.file)}</div></div></div></div></div></td></tr>`;
  }).join('');

  // re-attach interactivity to newly rendered rows
  attachInteractivity();
}

function generateCSVFromTable(){
  const rows = [];
  rows.push(['#','Vulnerability','Severity','CVSS','Description','File']);
  document.querySelectorAll('#vuln-table tbody tr.vuln-row').forEach(r=>{
    if(r.style.display==='none') return; // skip hidden
    const cols = r.querySelectorAll('td');
    rows.push([cols[0].textContent.trim(), cols[1].textContent.trim(), cols[2].textContent.trim(), cols[3].textContent.trim(), cols[4].textContent.trim(), cols[5].textContent.trim()].map(c=>`"${c.replace(/"/g,'""')}"`));
  });
  return rows.map(r=>r.join(',')).join('\n');
}

function renderSummaryChart(counts){
  const total = counts.CRITICAL + counts.HIGH + counts.MEDIUM + counts.LOW;
  const w = 240, h = 48;
  // simple proportional bars
  const parts = [
    {k:'CRITICAL', v:counts.CRITICAL, color:'#fef2f2', inner:'#dc2626'},
    {k:'HIGH', v:counts.HIGH, color:'#fff7ed', inner:'#ea580c'},
    {k:'MEDIUM', v:counts.MEDIUM, color:'#fffbeb', inner:'#f59e0b'},
    {k:'LOW', v:counts.LOW, color:'#ecfdf5', inner:'#10b981'}
  ];
  let x=0; let svgParts='';
  parts.forEach(p=>{
    const wpart = total ? Math.max(1, Math.round((p.v/total)*w)) : 0;
    svgParts += `<rect x="${x}" y="0" width="${wpart}" height="24" fill="${p.color}" stroke="rgba(0,0,0,0.03)" />`;
    x += wpart;
  });
  // labels
  let labels='';
  parts.forEach((p,i)=>{
    labels += `<tspan x="${10 + i*56}" dy="1.2em" style="font-size:12px;fill:#374151;font-weight:700">${p.v}</tspan>`;
  });
  return `<svg width="${w}" height="48" role="img" aria-label="Severity distribution"><g>${svgParts}</g><text x="0" y="30">${labels}</text></svg>`;
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function truncate(s,n){ if(!s) return ''; return s.length>n ? s.slice(0,n-1)+'…' : s; }
function renderBadge(sev){
  if(!sev) return `<span class="small">${sev||''}</span>`;
  const s = sev.toUpperCase();
  const cls = s==='CRITICAL' ? 'critical' : s==='HIGH' ? 'high' : s==='MEDIUM' ? 'medium' : 'low';
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}

function renderCvss(cvss){
  const score = parseFloat(cvss);
  let cls = 'cvss-none';
  if(!isNaN(score)){
    if(score >= 9) cls = 'cvss-critical';
    else if(score >= 7) cls = 'cvss-high';
    else if(score >= 4) cls = 'cvss-medium';
    else cls = 'cvss-low';
  }
  const label = isNaN(score) ? (cvss || '') : score.toFixed(1);
  return `<div class="cvss"><span class="cvss-dot ${cls}" aria-hidden="true"></span><span class="small">${escapeHtml(label)}</span></div>`;
}

// Make rows expandable: attach click handlers after rendering
setTimeout(()=>{
  document.querySelectorAll('.vuln-row').forEach(r => {
    r.addEventListener('click', () => {
      const idx = r.getAttribute('data-idx');
      const panel = document.getElementById('panel-'+idx);
      if(panel) panel.classList.toggle('show');
    });
  });
}, 50);

function attachInteractivity(){
  // Row toggles
  document.querySelectorAll('.vuln-row').forEach(r => {
    r.setAttribute('tabindex','0');
    r.addEventListener('click', ()=>{
      const idx = r.getAttribute('data-idx');
      const panel = document.getElementById('panel-'+idx);
      if(panel) panel.classList.toggle('show');
    });
    r.addEventListener('keydown', e=>{ if(e.key==='Enter'){ r.click(); } });
  });

  // Filtering
  const severityFilter = document.getElementById('severity-filter');
  const searchFilter = document.getElementById('search-filter');
  const resetBtn = document.getElementById('reset-filters');
  function applyFilters(){
    const sev = severityFilter ? severityFilter.value : 'ALL';
    const q = searchFilter ? searchFilter.value.trim().toLowerCase() : '';
    document.querySelectorAll('#vuln-table tbody tr.vuln-row').forEach(r=>{
      const idx = r.getAttribute('data-idx');
      const name = r.querySelector('td:nth-child(2)') ? r.querySelector('td:nth-child(2)').textContent.toLowerCase() : '';
      const file = r.querySelector('td:nth-child(6)') ? r.querySelector('td:nth-child(6)').textContent.toLowerCase() : '';
      const sevCell = r.querySelector('td:nth-child(3)') ? r.querySelector('td:nth-child(3)').textContent.toUpperCase() : '';
      let hide = false;
      if(sev !== 'ALL' && sevCell !== sev) hide = true;
      if(q && !(name.includes(q) || file.includes(q))) hide = true;
      // toggle row and its details
      const details = document.getElementById('details-'+idx);
      if(hide){ r.style.display='none'; if(details) details.style.display='none'; }
      else { r.style.display='table-row'; if(details) details.style.display='table-row'; }
    });
  }
  if(severityFilter) severityFilter.addEventListener('change', applyFilters);
  if(searchFilter) searchFilter.addEventListener('input', applyFilters);
  if(resetBtn) resetBtn.addEventListener('click', ()=>{ if(severityFilter) severityFilter.value='ALL'; if(searchFilter) searchFilter.value=''; applyFilters(); });
}

// Expose for debug (not needed)
window._debug = {parseDependencyCheck, parseSuppressions, filterSuppressions};