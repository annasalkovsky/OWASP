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
const emailBtn = document.getElementById('email-btn');
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
  emailBtn.disabled = false;
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
    fixedCount: fixed.length,
    newCount: newVulns.length,
    newUnsuppressedCount: newUnsuppressed.length,
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

emailBtn.addEventListener('click', async () => {
  // Email report using mailto with HTML content embedded
  try {
    const reportContent = reportArea.innerHTML;
    const timestamp = new Date().toLocaleString();
    const isDelta = reportContent.includes('OWASP Delta Report');
    const subject = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
    
    // Create a simplified text version for email body
    const parser = new DOMParser();
    const doc = parser.parseFromString(reportContent, 'text/html');
    
    // Extract key metrics
    const header = doc.querySelector('.report-header');
    const headerText = header ? header.textContent.trim() : '';
    
    // Extract summary counts
    let summaryText = '';
    if (isDelta) {
      const deltaSection = doc.querySelector('.delta-summary');
      if (deltaSection) {
        const fixed = deltaSection.textContent.match(/Fixed Vulnerabilities \((\d+)\)/)?.[1] || '0';
        const newVulns = deltaSection.textContent.match(/New Vulnerabilities \((\d+)\)/)?.[1] || '0';
        summaryText = `\n📊 Delta Summary:\n- Fixed: ${fixed} vulnerabilities\n- New: ${newVulns} vulnerabilities\n`;
      }
    } else {
      const metrics = doc.querySelectorAll('.metric');
      if (metrics.length > 0) {
        summaryText = '\n📊 Vulnerability Summary:\n';
        metrics.forEach(metric => {
          const count = metric.querySelector('strong')?.textContent || '0';
          const severity = metric.querySelector('.small')?.textContent || '';
          if (severity) summaryText += `- ${severity}: ${count}\n`;
        });
      }
    }
    
    const emailBody = `Hello,

Please find the ${subject} generated on ${timestamp}.

${headerText}${summaryText}

📋 Full interactive report is available for download from the OWASP Security Tool.

Best regards,
OWASP Dependency Audit Tool
    `.trim();

    // Create mailto link
    const mailtoLink = `mailto:anna.salkovsky@imd-soft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Check if mailto link is too long (some email clients have limits)
    if (mailtoLink.length > 2000) {
      // Fallback to shorter version
      const shortBody = `Hello,

Please find the ${subject} generated on ${timestamp}.

${summaryText}

Best regards,
OWASP Tool`;
      const shortMailto = `mailto:anna.salkovsky@imd-soft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortBody)}`;
      window.open(shortMailto, '_blank');
    } else {
      window.open(mailtoLink, '_blank');
    }
    
  } catch (err) {
    console.error('Email failed', err);
    alert('Failed to open email client: ' + err.message);
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
    <div class="delta-container" style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; margin: 2rem 0;">
      <div class="delta-header" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 2rem; text-align: center;">
        <h1 style="font-size: 2.5rem; margin: 0 0 0.5rem 0; font-weight: bold;">🔄 OWASP Delta Report</h1>
        <p style="font-size: 1.1rem; opacity: 0.9; margin: 0;">Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="delta-content" style="padding: 2rem;">
        <div class="delta-summary-section" style="background: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
          <h2 style="color: #1e293b; margin: 0 0 1rem 0;">📊 Analysis Summary</h2>
          <p style="margin: 0; color: #64748b;">
            <strong>Fixed:</strong> ${delta.fixedCount} vulnerabilities &nbsp;|&nbsp;
            <strong>New:</strong> ${delta.newUnsuppressedCount} vulnerabilities &nbsp;|&nbsp;
            <strong>Current Total:</strong> ${delta.currentUnsuppressed.length} vulnerabilities
          </p>
        </div>

        <div class="delta-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="delta-stat-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; border-top: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 1rem 0; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              ✅ Fixed Vulnerabilities (${delta.fixedCount})
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div style="text-align: center; padding: 1rem; background: #fef2f2; border-radius: 6px; border-left: 3px solid #dc2626;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #dc2626;">${fixedCounts.CRITICAL}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">CRITICAL</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #fff7ed; border-radius: 6px; border-left: 3px solid #ea580c;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #ea580c;">${fixedCounts.HIGH}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">HIGH</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #fffbeb; border-radius: 6px; border-left: 3px solid #d97706;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #d97706;">${fixedCounts.MEDIUM}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">MEDIUM</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #059669;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #059669;">${fixedCounts.LOW}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">LOW</div>
              </div>
            </div>
          </div>
          
          <div class="delta-stat-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; border-top: 4px solid #f59e0b;">
            <h3 style="color: #f59e0b; margin: 0 0 1rem 0; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              🆕 New Vulnerabilities (${delta.newUnsuppressedCount})
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div style="text-align: center; padding: 1rem; background: #fef2f2; border-radius: 6px; border-left: 3px solid #dc2626;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #dc2626;">${newCounts.CRITICAL}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">CRITICAL</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #fff7ed; border-radius: 6px; border-left: 3px solid #ea580c;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #ea580c;">${newCounts.HIGH}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">HIGH</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #fffbeb; border-radius: 6px; border-left: 3px solid #d97706;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #d97706;">${newCounts.MEDIUM}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">MEDIUM</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #059669;">
                <div style="font-size: 1.8rem; font-weight: bold; color: #059669;">${newCounts.LOW}</div>
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">LOW</div>
              </div>
            </div>
          </div>
          
          <div class="delta-stat-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; border-top: 4px solid #6366f1;">
            <h3 style="color: #6366f1; margin: 0 0 1rem 0; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              📊 Suppression Changes
            </h3>
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #374151;">Added:</span>
                <span style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${delta.suppressionChanges.added.length}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #374151;">Removed:</span>
                <span style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${delta.suppressionChanges.removed.length}</span>
              </div>
            </div>
          </div>
        </div>

        ${delta.fixedCount > 0 ? `
        <div class="delta-section" style="margin: 2rem 0;">
          <div class="section-header" style="background: #ecfdf5; color: #065f46; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #10b981; font-weight: bold; font-size: 1.2rem;">
            ✅ Fixed Vulnerabilities (${delta.fixedCount})
          </div>
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table class="table" style="width: 100%; border-collapse: collapse;">
              <thead style="background: #f8fafc;">
                <tr>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">Vulnerability</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">Severity</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">CVSS</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">File</th>
                </tr>
              </thead>
              <tbody>
                ${delta.fixed.map((vuln, index) => `
                  <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : 'background: white;'}">
                    <td style="padding: 1rem; color: #374151;">${escapeHtml(vuln.name)}</td>
                    <td style="padding: 1rem;">${renderBadge(vuln.severity)}</td>
                    <td style="padding: 1rem; color: #374151;">${renderCvss(vuln.cvss)}</td>
                    <td style="padding: 1rem; color: #374151; font-family: monospace; font-size: 0.9rem;">${escapeHtml(vuln.file)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${delta.newUnsuppressedCount > 0 ? `
        <div class="delta-section" style="margin: 2rem 0;">
          <div class="section-header" style="background: #fff7ed; color: #9a3412; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #f59e0b; font-weight: bold; font-size: 1.2rem;">
            🆕 New Vulnerabilities (${delta.newUnsuppressedCount})
          </div>
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table class="table" id="new-vuln-table" style="width: 100%; border-collapse: collapse;">
              <thead style="background: #f8fafc;">
                <tr>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">#</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">VULNERABILITY</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">SEVERITY</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">CVSS SCORE</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">DESCRIPTION</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">FILE</th>
                </tr>
              </thead>
              <tbody>
                ${delta.newUnsuppressed.map((it,idx) => `
                  <tr class="vuln-row" data-idx="${idx}" style="border-bottom: 1px solid #f1f5f9; ${idx % 2 === 0 ? 'background: #fafafa;' : 'background: white;'} cursor: pointer; transition: background-color 0.2s;">
                    <td style="padding: 1rem; color: #374151;">${idx+1}</td>
                    <td style="padding: 1rem;"><a href="#" onclick="return false" style="color: #6366f1; text-decoration: none; font-weight: 500;">${escapeHtml(it.name)}</a></td>
                    <td style="padding: 1rem;">${renderBadge(it.severity)}</td>
                    <td style="padding: 1rem; color: #374151;">${renderCvss(it.cvss)}</td>
                    <td style="padding: 1rem; color: #64748b; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(truncate(it.description,120))}</td>
                    <td style="padding: 1rem; color: #374151; font-family: monospace; font-size: 0.9rem;">${escapeHtml(it.file)}</td>
                  </tr>
                  <tr class="vuln-details" id="details-${idx}" style="display: none;">
                    <td colspan="6" style="padding: 0; background: #f8fafc;">
                      <div class="vuln-details-panel" id="panel-${idx}" style="padding: 1.5rem; border-top: 1px solid #e2e8f0;">
                        <div class="vuln-details-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
                          <div>
                            <h4 style="margin: 0 0 1rem 0; color: #1e293b; font-size: 1.1rem;">${escapeHtml(it.name)}</h4>
                            <div class="vuln-meta" style="margin-bottom: 1rem;">
                              <div style="margin-bottom: 0.5rem;"><strong>Severity:</strong> ${renderBadge(it.severity)}</div>
                              <div style="margin-bottom: 1rem;"><strong>CVSS:</strong> ${renderCvss(it.cvss)}</div>
                              <div style="line-height: 1.6; color: #374151;">${escapeHtml(it.description)}</div>
                            </div>
                          </div>
                          <div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                              <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Affected File</div>
                              <div style="font-weight: 600; font-family: monospace; color: #374151; word-break: break-all;">${escapeHtml(it.file)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : `
        <div class="delta-section" style="margin: 2rem 0;">
          <div style="text-align: center; padding: 3rem; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <h3 style="color: #065f46; margin: 0 0 1rem 0;">✅ No New Vulnerabilities Found</h3>
            <p style="color: #059669; margin: 0;">All current vulnerabilities are either resolved or already known from the baseline.</p>
          </div>
        </div>
        `}

      </div>

      <div class="delta-footer" style="background: #f1f5f9; padding: 1.5rem; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Generated by OWASP Dependency Audit Tool | <strong>github.com/annasalkovsky/OWASP</strong></p>
      </div>
    </div>
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