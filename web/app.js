// Minimal parser and report generator for OWASP dependency-check XML + suppressions
// Assumes dependency-check-report XML uses <dependency> -> <vulnerability> elements
// and suppressions.xml uses <suppress><note> with <cpe> or <name> or <cvss> matching rules.
// This is intentionally simple and may need expansion for other shapes.

const reportDrop = document.getElementById('report-drop');
const suppressionsDrop = document.getElementById('suppressions-drop');
const reportInput = document.getElementById('report-file');
const suppressionsInput = document.getElementById('suppressions-file');
const generateBtn = document.getElementById('generate-btn');
const exportBtn = document.getElementById('export-btn');
const reportArea = document.getElementById('report-area');

let dependencyXml = null;
let suppressionsXml = null;

reportInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => dependencyXml = xml); });
suppressionsInput.addEventListener('change', e => { loadFile(e.target.files[0], xml => suppressionsXml = xml); });

// Toggle uploaded visual state
reportInput.addEventListener('change', () => setUploadedState('report', !!reportInput.files.length));
suppressionsInput.addEventListener('change', () => setUploadedState('suppressions', !!suppressionsInput.files.length));

function setUploadedState(which, state){
  if(which === 'report'){
    const zone = document.getElementById('report-drop');
    const msg = document.getElementById('report-uploaded');
    if(state){ zone.classList.add('uploaded'); if(msg) msg.setAttribute('aria-hidden','false'); }
    else { zone.classList.remove('uploaded'); if(msg) msg.setAttribute('aria-hidden','true'); }
  }
  if(which === 'suppressions'){
    const zone = document.getElementById('suppressions-drop');
    const msg = document.getElementById('suppressions-uploaded');
    if(state){ zone.classList.add('uploaded'); if(msg) msg.setAttribute('aria-hidden','false'); }
    else { zone.classList.remove('uploaded'); if(msg) msg.setAttribute('aria-hidden','true'); }
  }
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
  const findings = parseDependencyCheck(dependencyXml);
  const suppressedRules = suppressionsXml ? parseSuppressions(suppressionsXml) : [];
  const unsuppressed = filterSuppressions(findings, suppressedRules);
  renderReport(unsuppressed);
  exportBtn.disabled = false;
});

exportBtn.addEventListener('click', async () => {
  // Export current report-area as a self-contained HTML file with inline CSS and JS
  try {
    // Try to find the current stylesheet href
    const link = document.querySelector('link[rel="stylesheet"]');
    const href = link ? link.getAttribute('href') : './styles.css';
    let cssText = '';
    try {
      const res = await fetch(href);
      if (res.ok) cssText = await res.text();
    } catch (e) {
      // If fetch fails, fallback to empty CSS
      console.warn('Could not fetch stylesheet for export:', e);
      cssText = '';
    }

    // Inline small script to re-enable interactivity in the exported file
    const interactiveScript = `
      // Toggle detail panels on row click
      document.querySelectorAll('.vuln-row').forEach(r => {
        r.addEventListener('click', () => {
          const idx = r.getAttribute('data-idx');
          const panel = document.getElementById('panel-'+idx);
          if(panel) panel.classList.toggle('show');
          // scroll into view if opening
          if(panel && panel.classList.contains('show')) panel.scrollIntoView({behavior:'smooth', block:'center'});
        });
      });
      // Make sure links don't navigate when opened
      document.querySelectorAll('a').forEach(a=>a.addEventListener('click', e=>e.preventDefault()));
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

function renderReport(items){
  const counts = severityCounts(items);
  const total = items.length;
  reportArea.hidden = false;
  reportArea.innerHTML = `
    <div class="report-header">
      <h2>OWASP Dependency Check</h2>
      <div class="small">Generated: ${new Date().toLocaleString()} &nbsp; Total Vulnerabilities: <strong>${total}</strong></div>
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

// Expose for debug (not needed)
window._debug = {parseDependencyCheck, parseSuppressions, filterSuppressions};