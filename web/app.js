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

reportInput.addEventListener('change', e => { 
  loadFile(e.target.files[0], xml => {
    dependencyXml = xml;
    setUploadedState('report', true);
  }, 'report-progress'); 
});
suppressionsInput.addEventListener('change', e => { 
  loadFile(e.target.files[0], xml => {
    suppressionsXml = xml;
    setUploadedState('suppressions', true);
  }, 'suppressions-progress'); 
});
baselineReportInput.addEventListener('change', e => { 
  loadFile(e.target.files[0], xml => {
    baselineDependencyXml = xml;
    console.log('Baseline report loaded:', !!baselineDependencyXml);
    setUploadedState('baseline', true);
  }, 'baseline-progress'); 
});
baselineSuppressionsInput.addEventListener('change', e => { 
  loadFile(e.target.files[0], xml => {
    baselineSuppressionsXml = xml;
    setUploadedState('baseline-suppressions', true);
  }, 'baseline-suppressions-progress'); 
});

// Toggle uploaded visual state - now handled in loadFile callbacks
// Removed immediate setUploadedState calls as they were causing timing issues


// Delta mode toggle logic moved inside DOMContentLoaded to ensure DOM is ready


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
  generateBtn.textContent = deltaToggle.checked ? 'Generate Delta Report' : 'Generate Audit Report';
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

  // Delta mode toggle logic
  if (deltaToggle) {
    // Helper to update upload rows visibility
    function updateUploadRows() {
      isDeltaMode = deltaToggle.checked;
      const deltaUploads = document.getElementById('delta-uploads');
      // Always show the main upload row
      const mainUploadRow = document.querySelector('.upload-row:not(.delta-uploads)');
      if (mainUploadRow) {
        mainUploadRow.style.display = 'flex';
      }
      // Only show/hide the delta upload row
      if (deltaUploads) {
        deltaUploads.style.display = isDeltaMode ? 'flex' : 'none';
      }
      updateGenerateButtonText();
    }
    // On load
    updateUploadRows();
    // On toggle
    deltaToggle.addEventListener('change', updateUploadRows);
  }
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
    if(f){ 
      reportInput.files = e.dataTransfer.files; 
      loadFile(f, xml => {
        dependencyXml = xml;
        setUploadedState('report', true);
      }, 'report-progress'); 
    }
  });
  suppressionsDrop.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ 
      suppressionsInput.files = e.dataTransfer.files; 
      loadFile(f, xml => {
        suppressionsXml = xml;
        setUploadedState('suppressions', true);
      }, 'suppressions-progress'); 
    }
  });
  baselineReportDrop?.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ 
      baselineReportInput.files = e.dataTransfer.files; 
      loadFile(f, xml => {
        baselineDependencyXml = xml;
        setUploadedState('baseline', true);
      }, 'baseline-progress'); 
    }
  });
  baselineSuppressionsDrop?.addEventListener(ev, e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ 
      baselineSuppressionsInput.files = e.dataTransfer.files; 
      loadFile(f, xml => {
        baselineSuppressionsXml = xml;
        setUploadedState('baseline-suppressions', true);
      }, 'baseline-suppressions-progress'); 
    }
  });
});

function loadFile(file, cb, progressId = null){
  if(!file) return;
  
  const progressBar = progressId ? document.getElementById(progressId) : null;
  const progressFill = progressBar ? progressBar.querySelector('.progress-fill') : null;
  const progressText = progressBar ? progressBar.querySelector('.progress-text') : null;
  
  // Show progress bar
  if (progressBar) {
    progressBar.style.display = 'flex';
    progressBar.className = 'progress-bar';
    progressFill.className = 'progress-fill indeterminate';
    progressText.textContent = 'Reading file...';
  }
  
  const reader = new FileReader();
  
  reader.onprogress = (e) => {
    if (e.lengthComputable && progressFill && progressText) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressFill.style.width = percentComplete + '%';
      progressFill.className = 'progress-fill';
      progressText.textContent = `Loading ${Math.round(percentComplete)}%`;
    }
  };
  
  reader.onload = () => {
    try {
      // Show parsing state
      if (progressText) {
        progressText.textContent = 'Parsing XML...';
      }
      
      setTimeout(() => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(reader.result, "application/xml");
        
        // Check for parsing errors
        const parserError = xml.querySelector("parsererror");
        if (parserError) {
          throw new Error("Invalid XML file");
        }
        
        // Success state
        if (progressBar) {
          progressBar.className = 'progress-bar success';
          progressText.textContent = '✓ Loaded successfully';
          progressFill.style.width = '100%';
          
          // Hide progress after delay
          setTimeout(() => {
            progressBar.style.display = 'none';
          }, 1500);
        }
        
        cb(xml);
      }, 100); // Small delay to show parsing state
      
    } catch (error) {
      console.error('File loading error:', error);
      
      // Error state
      if (progressBar) {
        progressBar.className = 'progress-bar error';
        progressText.textContent = '✗ Failed to load';
        progressFill.style.width = '100%';
        
        // Hide progress after delay
        setTimeout(() => {
          progressBar.style.display = 'none';
        }, 2000);
      }
      
      alert('Error loading file: ' + error.message);
    }
  };
  
  reader.onerror = () => {
    console.error('FileReader error');
    
    if (progressBar) {
      progressBar.className = 'progress-bar error';
      progressText.textContent = '✗ Read failed';
      progressFill.style.width = '100%';
      
      setTimeout(() => {
        progressBar.style.display = 'none';
      }, 2000);
    }
    
    alert('Error reading file');
  };
  
  reader.readAsText(file);
}


generateBtn.addEventListener('click', () => {
  if(!dependencyXml) return alert('Please upload a dependency-check XML report');
  
  // Check current state of delta toggle directly
  const deltaMode = deltaToggle.checked;
  
  console.log('Generate button clicked:', { deltaMode, baselineDependencyXml: !!baselineDependencyXml });
  
  if(deltaMode) {
    if(!baselineDependencyXml) {
      console.error('Baseline report is missing for delta comparison');
      return alert('Please upload a baseline report for delta comparison.\n\nMake sure you:\n1. Check "Enable Delta Comparison Mode"\n2. Upload both Current and Baseline reports\n3. Click "Generate Delta Report"');
    }
    generateDeltaReport();
  } else {
    const result = parseDependencyCheck(dependencyXml);
    const suppressedRules = suppressionsXml ? parseSuppressions(suppressionsXml) : [];
    const unsuppressed = filterSuppressions(result.vulnerabilities, suppressedRules);
    renderReport(unsuppressed, result.metadata);
  }
  
  exportBtn.disabled = false;
  emailBtn.disabled = false;
  
  // Enable CSV export for normal reports too
  const csvBtn = document.getElementById('export-csv-btn');
  if(csvBtn) csvBtn.disabled = false;
});

function generateDeltaReport(){
  console.log('generateDeltaReport called');
  console.log('Dependencies:', { 
    dependencyXml: !!dependencyXml, 
    baselineDependencyXml: !!baselineDependencyXml,
    suppressionsXml: !!suppressionsXml,
    baselineSuppressionsXml: !!baselineSuppressionsXml 
  });
  
  try {
    // Validate XML inputs
    if (!dependencyXml) {
      throw new Error('Current dependency XML is missing');
    }
    if (!baselineDependencyXml) {
      throw new Error('Baseline dependency XML is missing');
    }
    
    // Parse current and baseline reports
    console.log('Parsing current findings...');
    const currentResult = parseDependencyCheck(dependencyXml);
    console.log('Current findings parsed:', currentResult.vulnerabilities?.length || 'undefined');
    
    if (!Array.isArray(currentResult.vulnerabilities)) {
      throw new Error('Failed to parse current dependency check - invalid XML format');
    }
    
    console.log('Parsing baseline findings...');
    const baselineResult = parseDependencyCheck(baselineDependencyXml);
    console.log('Baseline findings parsed:', baselineResult.vulnerabilities?.length || 'undefined');
    
    if (!Array.isArray(baselineResult.vulnerabilities)) {
      throw new Error('Failed to parse baseline dependency check - invalid XML format');
    }
    
    // Parse suppressions with validation
    console.log('Parsing suppressions...');
    const currentSuppressions = suppressionsXml ? parseSuppressions(suppressionsXml) : [];
    const baselineSuppressions = baselineSuppressionsXml ? parseSuppressions(baselineSuppressionsXml) : [];
    
    if (!Array.isArray(currentSuppressions)) {
      throw new Error('Failed to parse current suppressions - invalid XML format');
    }
    if (!Array.isArray(baselineSuppressions)) {
      throw new Error('Failed to parse baseline suppressions - invalid XML format');
    }
    
    console.log('Suppressions parsed:', { current: currentSuppressions.length, baseline: baselineSuppressions.length });
    
    // Calculate delta with validation
    console.log('Calculating delta...');
    const delta = calculateDelta(currentResult.vulnerabilities, baselineResult.vulnerabilities, currentSuppressions, baselineSuppressions);
    console.log('Delta calculated:', delta);
    
    if (!delta) {
      throw new Error('Failed to calculate delta - calculateDelta returned null/undefined');
    }
    
    // Render delta report
    console.log('Rendering delta report...');
    renderDeltaReport(delta, currentResult.metadata, currentResult.vulnerabilities, baselineResult.vulnerabilities);
    console.log('Delta report rendered successfully');
    
    // Enable export buttons for delta reports
    exportBtn.disabled = false;
    emailBtn.disabled = false;
    
  } catch (error) {
    console.error('Error in generateDeltaReport:', error);
    console.error('Stack trace:', error.stack);
    
    // Show more helpful error message
    let errorMsg = `Error generating delta report: ${error.message}`;
    
    // Add specific guidance based on error type
    if (error.message.includes('invalid XML format')) {
      errorMsg += '\n\nThis usually means:\n• The uploaded file is not a valid OWASP dependency-check XML\n• The file may be corrupted or empty\n• Try re-running your dependency check and uploading a fresh XML file';
    } else if (error.message.includes('missing')) {
      errorMsg += '\n\nPlease ensure all required files are uploaded:\n• Current dependency check XML\n• Baseline dependency check XML';
    }
    
    errorMsg += '\n\nPlease check the console for more details.';
    
    alert(errorMsg);
  }
}

function calculateDelta(current, baseline, currentSuppressions, baselineSuppressions){
  console.log('calculateDelta called with:', {
    current: current ? `array length ${current.length}` : 'undefined/null',
    baseline: baseline ? `array length ${baseline.length}` : 'undefined/null',
    currentSuppressions: currentSuppressions ? `array length ${currentSuppressions.length}` : 'undefined/null',
    baselineSuppressions: baselineSuppressions ? `array length ${baselineSuppressions.length}` : 'undefined/null'
  });
  
  // Validate inputs
  if (!Array.isArray(current)) {
    throw new Error(`calculateDelta: current parameter is not an array (got ${typeof current})`);
  }
  if (!Array.isArray(baseline)) {
    throw new Error(`calculateDelta: baseline parameter is not an array (got ${typeof baseline})`);
  }
  if (!Array.isArray(currentSuppressions)) {
    throw new Error(`calculateDelta: currentSuppressions parameter is not an array (got ${typeof currentSuppressions})`);
  }
  if (!Array.isArray(baselineSuppressions)) {
    throw new Error(`calculateDelta: baselineSuppressions parameter is not an array (got ${typeof baselineSuppressions})`);
  }
  
  try {
    // Create vulnerability signature for comparison (name + file)
    const createSig = (vuln) => {
      if (!vuln) throw new Error('Vulnerability object is null/undefined');
      if (!vuln.name && !vuln.file) throw new Error('Vulnerability missing name and file properties');
      return `${vuln.name || 'UNKNOWN'}|${vuln.file || 'UNKNOWN'}`;
    };

    console.log('Creating signature sets...');
    const currentSigs = new Set(current.map(createSig));
    const baselineSigs = new Set(baseline.map(createSig));
    console.log('Signature sets created successfully');

    // Fixed: in baseline but not in current
    console.log('Calculating fixed vulnerabilities...');
    const fixed = baseline.filter(vuln => !currentSigs.has(createSig(vuln)));
    console.log(`Fixed vulnerabilities: ${fixed.length}`);

    // New: in current but not in baseline  
    console.log('Calculating new vulnerabilities...');
    const newVulns = current.filter(vuln => !baselineSigs.has(createSig(vuln)));
    console.log(`New vulnerabilities: ${newVulns.length}`);

    // Apply current suppressions to new vulnerabilities
    console.log('Filtering suppressions on new vulnerabilities...');
    const newUnsuppressed = filterSuppressions(newVulns, currentSuppressions);
    console.log(`New unsuppressed vulnerabilities: ${newUnsuppressed.length}`);

    // Suppression changes
    console.log('Calculating suppression changes...');
    const suppressionChanges = {
      added: currentSuppressions.filter(s => !baselineSuppressions.some(bs => 
        bs.type === s.type && bs.value === s.value
      )),
      removed: baselineSuppressions.filter(s => !currentSuppressions.some(cs => 
        cs.type === s.type && cs.value === s.value
      ))
    };
    console.log(`Suppression changes - added: ${suppressionChanges.added.length}, removed: ${suppressionChanges.removed.length}`);

    // All current vulnerabilities after applying suppressions (for context)
    console.log('Filtering current vulnerabilities with suppressions...');
    const currentUnsuppressed = filterSuppressions(current, currentSuppressions);
    console.log(`Current unsuppressed vulnerabilities: ${currentUnsuppressed.length}`);

    const result = {
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
    
    console.log('Delta calculation completed successfully:', result);
    return result;
    
  } catch (error) {
    console.error('Error in calculateDelta:', error);
    throw error;
  }
}

exportBtn.addEventListener('click', async () => {
  // Export current report with beautiful modern styling
  try {
    const reportData = getCurrentReportData();
    const exportHtml = generateBeautifulReportHTML(reportData);

    const blob = new Blob([exportHtml], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `OWASP-Audit-Report-${new Date().toISOString().split('T')[0]}.html`; 
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed: ' + err.message);
  }
});

function getCurrentReportData() {
  // Check if this is a delta report
  const isDelta = window.lastDeltaData && document.querySelector('.delta-container');

  if (isDelta) {
    // For delta reports, return the stored delta data
    return {
      type: 'delta',
      data: window.lastDeltaData,
      timestamp: new Date().toLocaleString()
    };
  }

  // For normal reports, extract ALL vulnerabilities from DOM (not just filtered ones)
  const vulnerabilities = [];

  // Try to get all vulnerability rows, including those that might be hidden by filters
  const allRows = document.querySelectorAll('#vuln-table tbody tr');
  console.log('Regular report export - found rows:', allRows.length);

  allRows.forEach((row, idx) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6 && !row.classList.contains('no-data')) {
      vulnerabilities.push({
        Package: cells[0].textContent.trim(),
        Vulnerability: cells[1].textContent.trim(),
        Severity: cells[2].textContent.trim(),
        CVSS: cells[3].textContent.trim(),
        Description: cells[4].textContent.trim(),
        File: cells[5].textContent.trim()
      });
    }
  });

  // Debug: Log vulnerabilities array before returning
  console.log('Exported vulnerabilities array:', vulnerabilities);

  return {
    type: 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

function generateBeautifulReportHTML(data) {
  console.log('Export called with data type:', data.type);
  console.log('Export data:', data);
  
  // Check if this is a delta report
  if (data.type === 'delta' && window.lastDeltaData) {
  console.log('Generating delta export with lastDeltaData:', window.lastDeltaData);
  // Use newVulnerabilities for the table and severity counts
  const newVulns = window.lastDeltaData.newVulnerabilities || [];
  // Count by severity for new vulnerabilities
  const severityCounts = {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0};
  newVulns.forEach(vuln => {
    const severity = (vuln.Severity || vuln.severity || '').toUpperCase();
    if (severityCounts[severity] !== undefined) severityCounts[severity]++;
  });
  const totalVulns = newVulns.length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OWASP Delta Security Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #2c3e50;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 700; }
    .header .subtitle { font-size: 1.2rem; opacity: 0.9; margin-bottom: 5px; }
    .header .timestamp { font-size: 1rem; opacity: 0.8; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 40px; background: #f8f9fa; }
    .metric-card { background: white; padding: 25px; border-radius: 15px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.08); border-left: 4px solid; }
    .metric-card.critical { border-left-color: #e74c3c; }
    .metric-card.high { border-left-color: #f39c12; }
    .metric-card.medium { border-left-color: #f1c40f; }
    .metric-card.low { border-left-color: #27ae60; }
    .metric-number { font-size: 2.5rem; font-weight: bold; margin-bottom: 5px; }
    .metric-label { color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 40px; }
    .section-title { font-size: 1.5rem; margin-bottom: 20px; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
    .vuln-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
    .vuln-table th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; text-align: left; font-weight: 600; }
    .vuln-table td { padding: 12px 15px; border-bottom: 1px solid #ecf0f1; }
    .vuln-table tr:hover { background-color: #f8f9fa; }
    .severity-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; color: white; }
    .severity-critical { background-color: #e74c3c; }
    .severity-high { background-color: #f39c12; }
    .severity-medium { background-color: #f1c40f; color: #2c3e50; }
    .severity-low { background-color: #27ae60; }
    .footer { background: #2c3e50; color: white; padding: 30px 40px; text-align: center; }
    .footer p { margin-bottom: 10px; }
    .no-vulnerabilities { text-align: center; padding: 60px; color: #27ae60; font-size: 1.2rem; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OWASP Delta Security Report</h1>
      <div class="subtitle">Comprehensive Security Analysis Report</div>
      <div class="timestamp">Generated on ${data.timestamp}</div>
    </div>
    <div class="metrics-grid">
      <div class="metric-card critical">
        <div class="metric-number">${severityCounts.CRITICAL}</div>
        <div class="metric-label">Critical</div>
      </div>
      <div class="metric-card high">
        <div class="metric-number">${severityCounts.HIGH}</div>
        <div class="metric-label">High</div>
      </div>
      <div class="metric-card medium">
        <div class="metric-number">${severityCounts.MEDIUM}</div>
        <div class="metric-label">Medium</div>
      </div>
      <div class="metric-card low">
        <div class="metric-number">${severityCounts.LOW}</div>
        <div class="metric-label">Low</div>
      </div>
    </div>
    <div class="content">
      <h2 class="section-title">
        Unhandled Vulnerabilities Detected (${totalVulns} total)
      </h2>
      ${totalVulns === 0 ? 
        '<div class="no-vulnerabilities">🎉 No vulnerabilities found! Your application is secure.</div>' :
        `<table class="vuln-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Vulnerability</th>
              <th>Severity</th>
              <th>CVSS</th>
              <th>Description</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            ${newVulns.map(vuln => `
              <tr>
                <td>${vuln.Package || vuln.package || ''}</td>
                <td>${vuln.Vulnerability || vuln.vulnerability || ''}</td>
                <td>
                  <span class="severity-badge severity-${(vuln.Severity || vuln.severity || '').toLowerCase()}">
                    ${vuln.Severity || vuln.severity || ''}
                  </span>
                </td>
                <td>${vuln.CVSS || vuln.cvss || ''}</td>
                <td>${vuln.Description || vuln.description || ''}</td>
                <td>${vuln.File || vuln.file || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      }
    </div>
    <div class="footer">
      <p><strong>OWASP Dependency Audit Tool</strong></p>
      <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
      <p>Contact: anna.salkovsky@imd-soft.com</p>
    </div>
  </div>
</body>
</html>`
    
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OWASP Delta Security Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 700; }
        .header .subtitle { font-size: 1.2rem; opacity: 0.9; margin-bottom: 5px; }
        .header .timestamp { font-size: 1rem; opacity: 0.8; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .metrics-section {
            margin-bottom: 30px;
        }
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
            text-align: center;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-number { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
        .metric-label { font-size: 0.9rem; color: #666; text-transform: uppercase; }
        .critical .metric-number { color: #e74c3c; }
        .high .metric-number { color: #f39c12; }
        .medium .metric-number { color: #f1c40f; }
        .low .metric-number { color: #27ae60; }
        .content { padding: 40px; }
        .section-title { font-size: 1.8rem; margin-bottom: 20px; color: #2c3e50; }
        .vuln-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .vuln-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .vuln-table td { padding: 12px 15px; border-bottom: 1px solid #eee; }
        .vuln-table tr:hover { background: #f8f9fa; }
        .severity-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }
        .severity-critical { background-color: #e74c3c; }
        .severity-high { background-color: #f39c12; }
        .severity-medium { background-color: #f1c40f; color: #2c3e50; }
        .severity-low { background-color: #27ae60; }
        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        .footer p { margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 OWASP Delta Security Report</h1>
            <div class="subtitle">Comprehensive Security Analysis Report</div>
            <div class="timestamp">Generated on ${timestamp}</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metrics-section">
                <h2>📊 Analysis Summary</h2>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div style="text-align: center; background: #e8f5e8; padding: 15px; border-radius: 8px;">
                        <div style="font-size: 2rem; color: #27ae60; font-weight: bold;">${fixedVulns.length}</div>
                        <div style="color: #2c3e50;">Fixed Vulnerabilities</div>
                    </div>
                    <div style="text-align: center; background: #fff3e0; padding: 15px; border-radius: 8px;">
                        <div style="font-size: 2rem; color: #f39c12; font-weight: bold;">${newVulns.length}</div>
                        <div style="color: #2c3e50;">Unhandled (Unsuppressed)</div>
                    </div>
                </div>
                <div style="text-align: center; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 1.5rem; color: #2c3e50; font-weight: bold;">Current Total: ${allCurrentVulns.length} vulnerabilities</div>
                </div>
            </div>
            
            <div class="metrics-section">
                <h2>✅ Fixed Vulnerabilities (${fixedVulns.length})</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div class="metric-card critical">
                        <div class="metric-number">${fixedCounts.CRITICAL}</div>
                        <div class="metric-label">Critical</div>
                    </div>
                    <div class="metric-card high">
                        <div class="metric-number">${fixedCounts.HIGH}</div>
                        <div class="metric-label">High</div>
                    </div>
                    <div class="metric-card medium">
                        <div class="metric-number">${fixedCounts.MEDIUM}</div>
                        <div class="metric-label">Medium</div>
                    </div>
                    <div class="metric-card low">
                        <div class="metric-number">${fixedCounts.LOW}</div>
                        <div class="metric-label">Low</div>
                    </div>
                </div>
            </div>
            
            <div class="metrics-section">
                <h2>⚠️ Unhandled Vulnerabilities (${newVulns.length})</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div class="metric-card critical">
                        <div class="metric-number">${newCounts.CRITICAL}</div>
                        <div class="metric-label">Critical</div>
                    </div>
                    <div class="metric-card high">
                        <div class="metric-number">${newCounts.HIGH}</div>
                        <div class="metric-label">High</div>
                    </div>
                    <div class="metric-card medium">
                        <div class="metric-number">${newCounts.MEDIUM}</div>
                        <div class="metric-label">Medium</div>
                    </div>
                    <div class="metric-card low">
                        <div class="metric-number">${newCounts.LOW}</div>
                        <div class="metric-label">Low</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="content">
            ${newVulns.length > 0 ? `
            <h2 class="section-title">⚠️ Unhandled Vulnerabilities (${newVulns.length})</h2>
            <table class="vuln-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Vulnerability</th>
                        <th>Severity</th>
                        <th>CVSS Score</th>
                        <th>Description</th>
                        <th>File</th>
                    </tr>
                </thead>
                <tbody>
                    ${newVulns.map((vuln, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${vuln.name || ''}</td>
                            <td>
                                <span class="severity-badge severity-${(vuln.severity || '').toLowerCase()}">
                                    ${vuln.severity || ''}
                                </span>
                            </td>
                            <td>${vuln.cvss || ''}</td>
                            <td>${vuln.description || ''}</td>
                            <td>${vuln.file || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<div style="text-align: center; padding: 60px; color: #27ae60; font-size: 1.2rem;">🎉 No unhandled vulnerabilities found!</div>'}
            
            ${fixedVulns.length > 0 ? `
            <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length})</h2>
            <table class="vuln-table">
                <thead>
                    <tr>
                        <th>Vulnerability</th>
                        <th>Severity</th>
                        <th>CVSS</th>
                        <th>File</th>
                    </tr>
                </thead>
                <tbody>
                    ${fixedVulns.map(vuln => `
                        <tr>
                            <td>${vuln.name || ''}</td>
                            <td>
                                <span class="severity-badge severity-${(vuln.severity || '').toLowerCase()}">
                                    ${vuln.severity || ''}
                                </span>
                            </td>
                            <td>${vuln.cvss || ''}</td>
                            <td>${vuln.file || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<div style="text-align: center; padding: 60px; color: #27ae60; font-size: 1.2rem;">🎉 No fixed vulnerabilities to report!</div>'}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate beautiful HTML for normal reports
  const { vulnerabilities, metrics, total, generated } = data;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OWASP Dependency Check Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #1e293b; 
            background: #f8fafc;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .report-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
            margin: 2rem 0;
        }
        .report-header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .report-header h1 {
            font-size: 2.5rem;
            margin: 0 0 0.5rem 0;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
        }
        .report-header p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin: 0;
        }
        .report-content { padding: 2rem; }
        .summary-section {
            background: #f1f5f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
        .summary-section h2 {
            color: #1e293b;
            margin: 0 0 1rem 0;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .metric-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            border-top: 4px solid;
        }
        .metric-card.critical { border-top-color: #dc2626; }
        .metric-card.high { border-top-color: #ea580c; }
        .metric-card.medium { border-top-color: #d97706; }
        .metric-card.low { border-top-color: #059669; }
        .metric-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .metric-number.critical { color: #dc2626; }
        .metric-number.high { color: #ea580c; }
        .metric-number.medium { color: #d97706; }
        .metric-number.low { color: #059669; }
        .metric-label {
            color: #64748b;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .vulnerabilities-section {
            margin: 2rem 0;
        }
        .section-header {
            background: #f1f5f9;
            color: #374151;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border-left: 4px solid #6366f1;
            font-weight: bold;
            font-size: 1.2rem;
        }
        .vulnerabilities-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: #f8fafc;
        }
        th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e2e8f0;
        }
        td {
            padding: 1rem;
            border-bottom: 1px solid #f1f5f9;
        }
        tr:nth-child(even) {
            background: #fafafa;
        }
        .severity-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .severity-critical {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        .severity-high {
            background: #fff7ed;
            color: #9a3412;
            border: 1px solid #fed7aa;
        }
        .severity-medium {
            background: #fffbeb;
            color: #92400e;
            border: 1px solid #fde68a;
        }
        .severity-low {
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        .file-path {
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color: #64748b;
            background: #f1f5f9;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        .footer {
            background: #f1f5f9;
            padding: 1.5rem;
            text-align: center;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #fef2f2;
            color: #991b1b;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .status-indicator::before {
            content: "⚠️";
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="report-container">
            <div class="report-header">
                <h1>🛡️ OWASP Dependency Check</h1>
                <p>Security Vulnerability Audit Report</p>
            </div>
            
            <div class="report-content">
                <div class="summary-section">
                    <h2>📊 Report Summary</h2>
                    <p><strong>Generated:</strong> ${generated}</p>
                    <p><strong>Total Vulnerabilities:</strong> ${total} ${total > 0 ? '| <span class="status-indicator">Action Required</span>' : ''}</p>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card critical">
                        <div class="metric-number critical">${metrics.CRITICAL || 0}</div>
                        <div class="metric-label">Critical</div>
                    </div>
                    <div class="metric-card high">
                        <div class="metric-number high">${metrics.HIGH || 0}</div>
                        <div class="metric-label">High</div>
                    </div>
                    <div class="metric-card medium">
                        <div class="metric-number medium">${metrics.MEDIUM || 0}</div>
                        <div class="metric-label">Medium</div>
                    </div>
                    <div class="metric-card low">
                        <div class="metric-number low">${metrics.LOW || 0}</div>
                        <div class="metric-label">Low</div>
                    </div>
                </div>

                ${vulnerabilities.length > 0 ? `
                <div class="vulnerabilities-section">
                    <div class="section-header">
                        🔍 Unsuppressed Vulnerabilities (${vulnerabilities.length})
                    </div>
                    <div class="vulnerabilities-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Vulnerability</th>
                                    <th>Severity</th>
                                    <th>CVSS Score</th>
                                    <th>Description</th>
                                    <th>File</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vulnerabilities.map((vuln, idx) => `
                                    <tr>
                                        <td>${vuln.number}</td>
                                        <td style="color: #6366f1; font-weight: 500;">${escapeHtml(vuln.name)}</td>
                                        <td>
                                            <span class="severity-badge severity-${vuln.severity.toLowerCase()}">
                                                ${vuln.severity}
                                            </span>
                                        </td>
                                        <td>${vuln.cvss}</td>
                                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(vuln.description)}</td>
                                        <td>
                                            <span class="file-path">${escapeHtml(vuln.file)}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : `
                <div class="vulnerabilities-section">
                    <div style="text-align: center; padding: 3rem; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <h3 style="color: #065f46; margin: 0 0 1rem 0;">✅ No Vulnerabilities Found</h3>
                        <p style="color: #059669; margin: 0;">All dependencies are secure and up to date.</p>
                    </div>
                </div>
                `}
            </div>

            <div class="footer">
                <p>Generated by OWASP Dependency Audit Tool | <strong>github.com/annasalkovsky/OWASP</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getCommonStyles() {
  // Common styles for both normal and delta reports
  return `
    .severity-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .severity-critical { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .severity-high { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    .severity-medium { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    .severity-low { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  `;
}

function getInteractivityScript() {
  return `
    (function(){
      // Row toggles and keyboard support for exported reports
      document.querySelectorAll('.vuln-row').forEach(r => {
        r.setAttribute('tabindex','0');
        r.style.cursor = 'pointer';
        r.addEventListener('click', ()=>{
          const idx = r.getAttribute('data-idx');
          const panel = document.getElementById('panel-'+idx);
          if(panel) panel.classList.toggle('show');
        });
        r.addEventListener('keydown', e=>{ if(e.key==='Enter'){ r.click(); } });
      });
    })();
  `;
}

// Helper function to get current report data for exports
function getCurrentReportData() {
  const isDelta = reportArea.innerHTML.includes('OWASP Delta Report');
  
  if (isDelta) {
    // For delta reports, extract from the delta data if available
    if (window.lastDeltaData) {
      return {
        type: 'delta',
        data: window.lastDeltaData,
        timestamp: new Date().toLocaleString()
      };
    }
  }
  
  // For regular reports or if delta data not available, extract from DOM
  const vulnerabilities = [];
  const vulnTable = document.querySelector('#vuln-table, #new-vuln-table');
  
  if (vulnTable) {
    const rows = vulnTable.querySelectorAll('tbody tr.vuln-row');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 6) {
        vulnerabilities.push({
          'Package': cells[0]?.textContent.trim() || '',
          'Vulnerability': cells[1]?.textContent.trim() || '',
          'Severity': cells[2]?.textContent.trim() || '',
          'CVSS': cells[3]?.textContent.trim() || '',
          'Description': cells[4]?.textContent.trim() || '',
          'File': cells[5]?.textContent.trim() || ''
        });
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let vulnerabilities = [];
  if (isDelta && reportData.data) {
    vulnerabilities = reportData.data.newVulnerabilities || [];
  } else {
    vulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Count by severity
  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };
  
  vulnerabilities.forEach(vuln => {
    const severity = vuln.Severity?.toUpperCase() || 'UNKNOWN';
    if (severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++;
    }
  });
  
  const totalVulns = vulnerabilities.length;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .header .timestamp {
            font-size: 1rem;
            opacity: 0.8;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            border-left: 4px solid;
        }
        
        .metric-card.critical { border-left-color: #e74c3c; }
        .metric-card.high { border-left-color: #f39c12; }
        .metric-card.medium { border-left-color: #f1c40f; }
        .metric-card.low { border-left-color: #27ae60; }
        
        .metric-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #7f8c8d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .content {
            padding: 40px;
        }
        
        .section-title {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #2c3e50;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        
        .vuln-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        .vuln-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .vuln-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .vuln-table tr:hover {
            background-color: #f8f9fa;
        }
        
        .severity-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }
        
        .severity-critical { background-color: #e74c3c; }
        .severity-high { background-color: #f39c12; }
        .severity-medium { background-color: #f1c40f; color: #2c3e50; }
        .severity-low { background-color: #27ae60; }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer p {
            margin-bottom: 10px;
        }
        
        .no-vulnerabilities {
            text-align: center;
            padding: 60px;
            color: #27ae60;
            font-size: 1.2rem;
        }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Comprehensive Security Analysis Report</div>
            <div class="timestamp">Generated on ${timestamp}</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card critical">
                <div class="metric-number">${severityCounts.CRITICAL}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric-card high">
                <div class="metric-number">${severityCounts.HIGH}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric-card medium">
                <div class="metric-number">${severityCounts.MEDIUM}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric-card low">
                <div class="metric-number">${severityCounts.LOW}</div>
                <div class="metric-label">Low</div>
            </div>
        </div>
        
        <div class="content">
            <h2 class="section-title">
                ${isDelta ? 'Unhandled Vulnerabilities Detected' : 'Security Vulnerabilities'} 
                (${totalVulns} total)
            </h2>
            
            ${totalVulns === 0 ? 
                '<div class="no-vulnerabilities">🎉 No vulnerabilities found! Your application is secure.</div>' :
                `<table class="vuln-table">
                    <thead>
                        <tr>
                            <th>Package</th>
                            <th>Vulnerability</th>
                            <th>Severity</th>
                            <th>CVSS</th>
                            <th>Description</th>
                            <th>File</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vulnerabilities.map(vuln => `
                            <tr>
                                <td>${vuln.Package || ''}</td>
                                <td>${vuln.Vulnerability || ''}</td>
                                <td>
                                    <span class="severity-badge severity-${(vuln.Severity || '').toLowerCase()}">
                                        ${vuln.Severity || ''}
                                    </span>
                                </td>
                                <td>${vuln.CVSS || ''}</td>
                                <td>${vuln.Description || ''}</td>
                                <td>${vuln.File || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;
}

emailBtn.addEventListener('click', async () => {
  // Enhanced email with detailed report content
  try {
    const reportContent = reportArea.innerHTML;
    const timestamp = new Date().toLocaleString();
    const isDelta = reportContent.includes('OWASP Delta Report');
    const subject = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
    
    // Generate the full HTML report for attachment instructions
    const reportData = getCurrentReportData();
    const fullReportHtml = generateBeautifulReportHTML(reportData);
    
    // Create a data URL for the report (user can save it)
    const blob = new Blob([fullReportHtml], {type: 'text/html'});
    const reportUrl = URL.createObjectURL(blob);
    
    // Extract detailed information from the report
    let detailedSummary = '';
    let vulnerabilityList = '';
    
    if (isDelta) {
      // Delta report details
      const parser = new DOMParser();
      const doc = parser.parseFromString(reportContent, 'text/html');
      
      const fixedCount = doc.querySelector('.delta-content')?.textContent.match(/Fixed:\s*(\d+)/)?.[1] || '0';
      const newCount = doc.querySelector('.delta-content')?.textContent.match(/New:\s*(\d+)/)?.[1] || '0';
      const totalCount = doc.querySelector('.delta-content')?.textContent.match(/Current Total:\s*(\d+)/)?.[1] || '0';
      
      detailedSummary = `
🔄 DELTA ANALYSIS RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fixed Vulnerabilities: ${fixedCount}
🆕 Unhandled Vulnerabilities: ${newCount}  
📊 Current Total: ${totalCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This delta report compares your current security scan with a baseline scan
to show what vulnerabilities were fixed and what new ones were discovered.
`;
      
      // Extract new vulnerabilities details
      const newVulnTable = doc.querySelector('#new-vuln-table');
      if (newVulnTable) {
        vulnerabilityList = '\n🚨 UNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
        vulnerabilityList += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
        rows.forEach((row, index) => {
          if (index < 10) { // Limit to first 10 for email readability
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              const name = cells[1]?.textContent.trim() || '';
              const severity = cells[2]?.textContent.trim() || '';
              const file = cells[5]?.textContent.trim() || '';
              vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
            }
          }
        });
        if (rows.length > 10) {
          vulnerabilityList += `... and ${rows.length - 10} more vulnerabilities.\n`;
        }
      }
      
    } else {
      // Normal report details
      const metrics = {};
      document.querySelectorAll('.metric').forEach(metric => {
        const count = metric.querySelector('strong')?.textContent || '0';
        const severity = metric.querySelector('.small')?.textContent || '';
        if (severity) metrics[severity] = parseInt(count);
      });
      
      const total = Object.values(metrics).reduce((a, b) => a + b, 0);
      
      detailedSummary = `
🛡️ SECURITY AUDIT RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Critical: ${metrics.CRITICAL || 0}
🟠 High: ${metrics.HIGH || 0}
🟡 Medium: ${metrics.MEDIUM || 0}
🟢 Low: ${metrics.LOW || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total Vulnerabilities: ${total}
`;

      // Extract top vulnerabilities
      const vulnTable = document.querySelector('#vuln-table');
      if (vulnTable && total > 0) {
        vulnerabilityList = '\n� TOP CRITICAL & HIGH VULNERABILITIES:\n';
        vulnerabilityList += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        const rows = vulnTable.querySelectorAll('tbody tr.vuln-row');
        let criticalHighCount = 0;
        rows.forEach((row) => {
          if (criticalHighCount < 10) { // Limit to first 10 critical/high
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
              const severity = cells[2]?.textContent.trim().toUpperCase() || '';
              if (severity === 'CRITICAL' || severity === 'HIGH') {
                const name = cells[1]?.textContent.trim() || '';
                const file = cells[5]?.textContent.trim() || '';
                vulnerabilityList += `${criticalHighCount + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
                criticalHighCount++;
              }
            }
          }
        });
        if (criticalHighCount === 0 && total > 0) {
          vulnerabilityList += 'All vulnerabilities are MEDIUM or LOW severity.\n';
        }
      }
    }
    
    const emailBody = `Hello,

Please find the ${subject} generated on ${timestamp}.
${detailedSummary}
${vulnerabilityList}

� FULL INTERACTIVE REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The complete interactive HTML report is ready for download.

To access the full report:
1. Visit: https://annasalkovsky.github.io/OWASP/
2. Use the Export Report button to download the complete HTML file
3. Or copy this email and manually download the attached report file

The full report includes:
• Interactive vulnerability details
• Filtering and search capabilities  
• Professional formatting for presentations
• Complete CVSS scores and descriptions
• Exportable CSV data

Best regards,
Anna Salkovsky
OWASP Dependency Audit Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Tool: https://github.com/annasalkovsky/OWASP
📧 Contact: anna.salkovsky@imd-soft.com
    `.trim();

    // Create mailto link with enhanced content
    const mailtoLink = `mailto:anna.salkovsky@imd-soft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Check if mailto link is too long and provide fallback
    if (mailtoLink.length > 2000) {
      // Show a modal with instructions for manual email
      const shortBody = `Hello,

Please find the ${subject} generated on ${timestamp}.
${detailedSummary}

Full interactive report available at: https://annasalkovsky.github.io/OWASP/

Best regards,
Anna Salkovsky`;
      
      const shortMailto = `mailto:anna.salkovsky@imd-soft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortBody)}`;
      
      // Also show instructions
      alert(`📧 Email Report Instructions:

1. Your email client will open with a detailed report summary
2. For the FULL INTERACTIVE REPORT:
   - Click "Export Report" button to download HTML file
   - Attach the downloaded file to your email
   
3. The complete report includes all vulnerability details,
   interactive features, and professional formatting.`);
      
      window.open(shortMailto, '_blank');
    } else {
      window.open(mailtoLink, '_blank');
    }
    
    // Clean up the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(reportUrl), 60000);
    
  } catch (err) {
    console.error('Email failed', err);
    alert('Failed to open email client: ' + err.message);
  }
});

// Parse dependency-check output to array of {id, name, severity, cvss, description, file}
function parseDependencyCheck(xml){
  if (!xml) {
    console.error('parseDependencyCheck: xml parameter is null/undefined');
    return { vulnerabilities: [], metadata: {} };
  }
  
  // Check if XML has parser errors
  const parserError = xml.querySelector("parsererror");
  if (parserError) {
    console.error('parseDependencyCheck: XML parsing error', parserError.textContent);
    throw new Error('Invalid XML format - parsing failed');
  }
  
  const deps = [];
  const metadata = {};
  
  try {
    // Extract metadata from scan info
    const scanInfo = xml.querySelector('scanInfo');
    if (scanInfo) {
      metadata.version = safeText(scanInfo.querySelector('engineVersion'));
      metadata.scanDate = safeText(scanInfo.querySelector('reportDate'));
    }
    
    // Extract project info
    const projectInfo = xml.querySelector('projectInfo');
    if (projectInfo) {
      metadata.projectName = safeText(projectInfo.querySelector('name'));
    }
    
    // Extract summary statistics - try multiple possible element structures
    let summary = xml.querySelector('summary');
    if (!summary) {
      // Sometimes it's in analysisStatistics or similar
      summary = xml.querySelector('analysisStatistics') || xml.querySelector('statistics');
    }
    
    if (summary) {
      metadata.dependenciesScanned = parseInt(safeText(summary.querySelector('dependencies')) || '0');
      metadata.vulnerableDependencies = parseInt(safeText(summary.querySelector('vulnerableDependencies')) || '0');
      metadata.vulnerabilitiesFound = parseInt(safeText(summary.querySelector('vulnerabilitiesFound')) || '0');
      metadata.vulnerabilitiesSuppressed = parseInt(safeText(summary.querySelector('vulnerabilitiesSuppressed')) || '0');
    }
    
    // If summary data not found in XML, calculate from dependencies
    const depEls = Array.from(xml.getElementsByTagName('dependency'));
    if (!metadata.dependenciesScanned && depEls.length > 0) {
      metadata.dependenciesScanned = depEls.length;
      
      // Calculate unique dependencies by grouping by filename
      const uniqueFiles = new Set();
      const vulnerableFiles = new Set();
      let totalVulns = 0;
      
      depEls.forEach(dep => {
        const fileName = safeText(dep.getElementsByTagName('fileName')[0]) || safeText(dep.getElementsByTagName('filePath')[0]) || 'unknown';
        uniqueFiles.add(fileName);
        
        const vulnEls = Array.from(dep.getElementsByTagName('vulnerability'));
        if (vulnEls.length > 0) {
          vulnerableFiles.add(fileName);
          totalVulns += vulnEls.length;
        }
      });
      
      metadata.uniqueDependencies = uniqueFiles.size;
      metadata.vulnerableDependencies = metadata.vulnerableDependencies || vulnerableFiles.size;
      metadata.vulnerabilitiesFound = metadata.vulnerabilitiesFound || totalVulns;
    }
    
    // dependency elements
    console.log(`Found ${depEls.length} dependency elements`);
    
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
    
    console.log(`Parsed ${deps.length} vulnerabilities from dependency check XML`);
    console.log('Extracted metadata:', metadata);
    
    return { vulnerabilities: deps, metadata };
    
  } catch (error) {
    console.error('Error parsing dependency check XML:', error);
    throw new Error('Failed to parse dependency check XML: ' + error.message);
  }
}

function safeText(node){ return node && node.textContent ? node.textContent.trim() : ''; }

// Rough parse of suppressions.xml: collect names or cpes to suppress
function parseSuppressions(xml){
  if (!xml) {
    console.warn('parseSuppressions: xml parameter is null/undefined, returning empty array');
    return [];
  }
  
  // Check if XML has parser errors
  const parserError = xml.querySelector("parsererror");
  if (parserError) {
    console.error('parseSuppressions: XML parsing error', parserError.textContent);
    throw new Error('Invalid suppressions XML format - parsing failed');
  }
  
  const rules = [];
  try {
    // find suppression items: <suppress> with <note> or <name> or <cpe> children (format differs)
    const suppressEls = Array.from(xml.getElementsByTagName('suppress'));
    console.log(`Found ${suppressEls.length} suppression elements`);
    
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
    
    console.log(`Parsed ${rules.length} suppression rules`);
    return rules;
    
  } catch (error) {
    console.error('Error parsing suppressions XML:', error);
    throw new Error('Failed to parse suppressions XML: ' + error.message);
  }
}

function filterSuppressions(findings, suppressions){
  console.log('filterSuppressions called with:', {
    findings: findings ? `array length ${findings.length}` : 'undefined/null',
    suppressions: suppressions ? `array length ${suppressions.length}` : 'undefined/null'
  });
  
  // Validate inputs
  if (!Array.isArray(findings)) {
    throw new Error(`filterSuppressions: findings parameter is not an array (got ${typeof findings})`);
  }
  if (!Array.isArray(suppressions)) {
    console.warn('filterSuppressions: suppressions is not an array, treating as empty');
    suppressions = [];
  }
  
  if(!suppressions || suppressions.length===0) {
    console.log('No suppressions to apply, returning all findings');
    return findings;
  }
  
  try {
    const result = findings.filter(f => {
      if (!f) {
        console.warn('filterSuppressions: found null/undefined finding, skipping');
        return true;
      }
      
      // If any suppression rule matches ID, file or name substring -> suppress
      for(const r of suppressions){
        if (!r) continue;
        
        const fname = f.name || '';
        const fdesc = f.description || '';
        const ffile = f.file || '';
        
        if(r.type === 'name' && fname.includes(r.value)) return false;
        if(r.type === 'cpe' && fdesc.includes(r.value)) return false;
        if(r.type === 'note' && (fdesc + fname + ffile).includes(r.value)) return false;
      }
      return true;
    });
    
    console.log(`filterSuppressions: filtered ${findings.length} findings to ${result.length} (${findings.length - result.length} suppressed)`);
    return result;
    
  } catch (error) {
    console.error('Error in filterSuppressions:', error);
    throw error;
  }
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

function renderDeltaReport(delta, metadata = {}, currentAllVulns = [], baselineAllVulns = []){
  reportArea.hidden = false;

  // Extra defensive logging to help diagnose issues
  console.log('renderDeltaReport received parameters:', {
    deltaKeys: Object.keys(delta || {}),
    currentAllVulnsLength: currentAllVulns.length,
    baselineAllVulnsLength: baselineAllVulns.length,
    currentAllVulnsSample: currentAllVulns[0],
    metadataKeys: Object.keys(metadata)
  });

  console.log('renderDeltaReport received delta object:', {
    keys: Object.keys(delta || {}),
    fixedType: Array.isArray(delta.fixed) ? `array[${delta.fixed.length}]` : typeof delta.fixed,
    newVulnsType: Array.isArray(delta.newVulns) ? `array[${delta.newVulns.length}]` : typeof delta.newVulns,
    newUnsuppressedType: Array.isArray(delta.newUnsuppressed) ? `array[${delta.newUnsuppressed.length}]` : typeof delta.newUnsuppressed,
    suppressionChanges: delta.suppressionChanges ? {
      added: Array.isArray(delta.suppressionChanges.added) ? delta.suppressionChanges.added.length : 'bad',
      removed: Array.isArray(delta.suppressionChanges.removed) ? delta.suppressionChanges.removed.length : 'bad'
    } : 'none'
  });

  // Derive suppressed-new vulnerabilities count (those filtered out by suppressions)
  const totalNewAll = Array.isArray(delta.newVulns) ? delta.newVulns.length : 0;
  const totalNewUnsuppressed = Array.isArray(delta.newUnsuppressed) ? delta.newUnsuppressed.length : 0;
  const suppressedNewCount = Math.max(totalNewAll - totalNewUnsuppressed, 0);

  // Store delta data globally for email export (avoid undefined properties)
  window.lastDeltaData = {
    fixed: Array.isArray(delta.fixed) ? delta.fixed : [],
    newVulnerabilities: Array.isArray(delta.newUnsuppressed) ? delta.newUnsuppressed : [],
    suppressedNewCount,
    totalNew: totalNewAll,
    fixedCount: Array.isArray(delta.fixed) ? delta.fixed.length : 0,
    summary: delta.summary || {},
    // Store original full vulnerability arrays for export (including suppressed ones)
    currentAllVulnerabilities: currentAllVulns,
    baselineAllVulnerabilities: baselineAllVulns,
    // Store all new vulnerabilities (including suppressed) for export
    allNewVulnerabilities: Array.isArray(delta.newVulns) ? delta.newVulns : []
  };

  // Debug logging for what we stored
  console.log('window.lastDeltaData stored:', {
    fixedCount: window.lastDeltaData.fixedCount,
    newVulnerabilitiesCount: window.lastDeltaData.newVulnerabilities.length,
    currentAllVulnerabilitiesCount: window.lastDeltaData.currentAllVulnerabilities.length,
    baselineAllVulnerabilitiesCount: window.lastDeltaData.baselineAllVulnerabilities.length,
    allNewVulnerabilitiesCount: window.lastDeltaData.allNewVulnerabilities.length,
    sampleCurrentVuln: window.lastDeltaData.currentAllVulnerabilities[0],
    sampleNewVuln: window.lastDeltaData.newVulnerabilities[0],
    sampleFixedVuln: window.lastDeltaData.fixed[0]
  });

  // Guard against undefined arrays before passing to severityCounts
  const fixedCounts = severityCounts(window.lastDeltaData.fixed);
  const newCounts = severityCounts(window.lastDeltaData.newVulnerabilities);
  
  reportArea.innerHTML = `
    <div class="delta-container" style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; margin: 2rem 0;">
      <div class="delta-header" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 2rem; text-align: center;">
        <h1 style="font-size: 2.5rem; margin: 0 0 0.5rem 0; font-weight: bold;">🔄 OWASP Delta Report</h1>
        <p style="font-size: 1.1rem; opacity: 0.9; margin: 0;">Generated: ${new Date().toLocaleString()}</p>
      </div>

      ${metadata.projectName || metadata.version || metadata.scanDate ? `
      <div class="metadata-section" style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 0 2rem; border-left: 4px solid #6366f1;">
        <h3 style="margin: 0 0 1rem 0; color: #1e293b; font-size: 1.1rem;">📋 Scan Information</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; font-family: monospace; font-size: 0.9rem; color: #374151;">
          ${metadata.projectName ? `<div><strong>Project:</strong> ${escapeHtml(metadata.projectName)}</div>` : ''}
          ${metadata.version ? `<div><strong>dependency-check version:</strong> ${escapeHtml(metadata.version)}</div>` : ''}
          ${metadata.scanDate ? `<div><strong>Report Generated On:</strong> ${escapeHtml(metadata.scanDate)}</div>` : ''}
          ${metadata.dependenciesScanned ? `<div><strong>Dependencies Scanned:</strong> ${metadata.dependenciesScanned}${metadata.uniqueDependencies ? ` (${metadata.uniqueDependencies} unique)` : ''}</div>` : ''}
          ${metadata.vulnerableDependencies !== undefined ? `<div><strong>Vulnerable Dependencies:</strong> ${metadata.vulnerableDependencies}</div>` : ''}
          ${metadata.vulnerabilitiesFound !== undefined ? `<div><strong>Vulnerabilities Found:</strong> ${metadata.vulnerabilitiesFound}</div>` : ''}
          ${metadata.vulnerabilitiesSuppressed !== undefined ? `<div><strong>Vulnerabilities Suppressed:</strong> ${metadata.vulnerabilitiesSuppressed}</div>` : ''}
        </div>
      </div>
      ` : ''}

      <div class="delta-content" style="padding: 2rem;">
        <div class="delta-summary-section" style="background: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
          <h2 style="color: #1e293b; margin: 0 0 1rem 0;">📊 Analysis Summary</h2>
          <p style="margin: 0; color: #64748b;">
            <strong>Fixed:</strong> ${window.lastDeltaData.fixedCount} vulnerabilities &nbsp;|&nbsp;
            <strong>Unhandled (Unsuppressed):</strong> ${totalNewUnsuppressed} &nbsp;|&nbsp;
            <strong>Unhandled (Suppressed):</strong> ${suppressedNewCount} &nbsp;|&nbsp;
            <strong>Current Total:</strong> ${Array.isArray(delta.currentUnsuppressed) ? delta.currentUnsuppressed.length : 0} vulnerabilities
          </p>
        </div>

        <div class="delta-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="delta-stat-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; border-top: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 1rem 0; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              ✅ Fixed Vulnerabilities (${window.lastDeltaData.fixedCount})
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
              ⚠️ Unhandled Vulnerabilities (${totalNewUnsuppressed})
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

  ${window.lastDeltaData.fixedCount > 0 ? `
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

  ${totalNewUnsuppressed > 0 ? `
        <div class="delta-section" style="margin: 2rem 0;">
          <div class="section-header" style="background: #fff7ed; color: #9a3412; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #f59e0b; font-weight: bold; font-size: 1.2rem;">
            ⚠️ Unhandled Vulnerabilities (${totalNewUnsuppressed})
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
                ${window.lastDeltaData.newVulnerabilities.map((it,idx) => `
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
            <h3 style="color: #065f46; margin: 0 0 1rem 0;">✅ No Unhandled Vulnerabilities Found</h3>
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
  
  // Enable CSV export for delta reports
  const csvBtn = document.getElementById('export-csv-btn');
  if(csvBtn){ 
    csvBtn.disabled = false; 
    // Remove existing event listeners to avoid duplicates
    csvBtn.replaceWith(csvBtn.cloneNode(true));
    const newCsvBtn = document.getElementById('export-csv-btn');
    newCsvBtn.addEventListener('click', ()=>{
      const csv = generateDeltaCSV(delta);
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `owasp-delta-report-${new Date().toISOString().split('T')[0]}.csv`; 
      a.click(); 
      URL.revokeObjectURL(url);
    }); 
  }
}

function groupVulnerabilitiesByDependency(items) {
  const dependencyMap = new Map();
  
  items.forEach(vuln => {
    const file = vuln.file || 'Unknown';
    if (!dependencyMap.has(file)) {
      dependencyMap.set(file, {
        file: file,
        vulnerabilities: [],
        highestSeverity: 'LOW',
        totalVulns: 0,
        severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
      });
    }
    
    const dep = dependencyMap.get(file);
    dep.vulnerabilities.push(vuln);
    dep.totalVulns++;
    
    // Count by severity
    const severity = (vuln.severity || 'LOW').toUpperCase();
    if (dep.severityCounts[severity] !== undefined) {
      dep.severityCounts[severity]++;
    }
    
    // Track highest severity
    const severityRank = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    if (severityRank[severity] > severityRank[dep.highestSeverity]) {
      dep.highestSeverity = severity;
    }
  });
  
  return Array.from(dependencyMap.values()).sort((a, b) => {
    const severityRank = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return severityRank[b.highestSeverity] - severityRank[a.highestSeverity];
  });
}

function renderReport(items, metadata = {}){
  // Group vulnerabilities by dependency/file first
  const groupedDeps = groupVulnerabilitiesByDependency(items);
  
  // Calculate severity counts from the vulnerabilities in vulnerable dependencies only
  const vulnerableDepVulns = [];
  groupedDeps.forEach(dep => {
    vulnerableDepVulns.push(...dep.vulnerabilities);
  });
  const counts = severityCounts(vulnerableDepVulns);
  
  const total = vulnerableDepVulns.length;
  const vulnerableDependencies = groupedDeps.length;
  
  reportArea.hidden = false;
  reportArea.innerHTML = `
    <div class="report-header">
      <h2>OWASP Dependency Check</h2>
      <div class="small">Generated: ${new Date().toLocaleString()} &nbsp; Vulnerable Dependencies: <strong>${vulnerableDependencies}</strong></div>
    </div>

    ${metadata.projectName || metadata.version || metadata.scanDate ? `
    <div class="metadata-section" style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; border-left: 4px solid #6366f1;">
      <h3 style="margin: 0 0 1rem 0; color: #1e293b; font-size: 1.1rem;">📋 Scan Information</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; font-family: monospace; font-size: 0.9rem; color: #374151;">
        ${metadata.projectName ? `<div><strong>Project:</strong> ${escapeHtml(metadata.projectName)}</div>` : ''}
        ${metadata.version ? `<div><strong>dependency-check version:</strong> ${escapeHtml(metadata.version)}</div>` : ''}
        ${metadata.scanDate ? `<div><strong>Report Generated On:</strong> ${escapeHtml(metadata.scanDate)}</div>` : ''}
        ${metadata.dependenciesScanned ? `<div><strong>Dependencies Scanned:</strong> ${metadata.dependenciesScanned}${metadata.uniqueDependencies ? ` (${metadata.uniqueDependencies} unique)` : ''}</div>` : ''}
        ${metadata.vulnerableDependencies !== undefined ? `<div><strong>Vulnerable Dependencies:</strong> ${metadata.vulnerableDependencies}</div>` : ''}
        ${metadata.vulnerabilitiesFound !== undefined ? `<div><strong>Vulnerabilities Found:</strong> ${metadata.vulnerabilitiesFound}</div>` : ''}
        ${metadata.vulnerabilitiesSuppressed !== undefined ? `<div><strong>Vulnerabilities Suppressed:</strong> ${metadata.vulnerabilitiesSuppressed}</div>` : ''}
      </div>
    </div>
    ` : ''}

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
        <input id="search-filter" placeholder="Search dependency or file" style="padding:8px;border-radius:6px;border:1px solid #e6e9ef;min-width:220px;margin-left:8px">
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

    <h3>Vulnerable Dependencies (${groupedDeps.length})</h3>
    <table class="table" id="vuln-table">
      <thead><tr><th>#</th><th>DEPENDENCY</th><th>HIGHEST SEVERITY</th><th>VULNERABILITIES</th><th>BREAKDOWN</th><th>FILE</th></tr></thead>
      <tbody>
          ${groupedDeps.map((dep,idx) => `
            <tr class="vuln-row" data-idx="${idx}">
              <td>${idx+1}</td>
              <td><a href="#" onclick="return false">${escapeHtml(dep.file.split('/').pop() || dep.file)}</a></td>
              <td>${renderBadge(dep.highestSeverity)}</td>
              <td><strong>${dep.totalVulns}</strong></td>
              <td style="font-size: 0.9rem;">
                ${dep.severityCounts.CRITICAL > 0 ? `<span style="color: #dc2626;">C:${dep.severityCounts.CRITICAL}</span> ` : ''}
                ${dep.severityCounts.HIGH > 0 ? `<span style="color: #ea580c;">H:${dep.severityCounts.HIGH}</span> ` : ''}
                ${dep.severityCounts.MEDIUM > 0 ? `<span style="color: #d97706;">M:${dep.severityCounts.MEDIUM}</span> ` : ''}
                ${dep.severityCounts.LOW > 0 ? `<span style="color: #059669;">L:${dep.severityCounts.LOW}</span>` : ''}
              </td>
              <td style="font-family: monospace; font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(dep.file)}</td>
            </tr>
            <tr class="vuln-details" id="details-${idx}">
              <td colspan="6">
                <div class="vuln-details-panel" id="panel-${idx}">
                  <div style="padding: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #1e293b;">Vulnerabilities in ${escapeHtml(dep.file)}</h4>
                    <div style="display: grid; gap: 1rem;">
                      ${dep.vulnerabilities.map((vuln, vIdx) => `
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; background: #fafafa;">
                          <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: start; margin-bottom: 0.5rem;">
                            <div>
                              <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">${escapeHtml(vuln.name)}</div>
                              <div style="font-size: 0.9rem; color: #64748b; line-height: 1.4;">${escapeHtml(vuln.description)}</div>
                            </div>
                            <div>${renderBadge(vuln.severity)}</div>
                            <div style="text-align: right; font-size: 0.9rem; color: #64748b;">
                              ${renderCvss(vuln.cvss)}
                            </div>
                          </div>
                        </div>
                      `).join('')}
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

  // Initialize sorting and pagination with grouped dependencies
  initTableControls(groupedDeps);
}

// --- Table controls: sorting, pagination, CSV export ---
function initTableControls(items){
  const rowsPerPage = 10;
  let currentPage = 1;
  let sortKey = null; // 'name' or 'severity' or 'cvss'
  let sortDir = 1; // 1 asc, -1 desc

  const table = document.getElementById('vuln-table');
  if(!table) {
    console.error('vuln-table not found');
    return;
  }

  // Remove any existing event listeners by cloning table headers
  const headers = table.querySelectorAll('th');
  headers.forEach((th, idx)=>{
    const newTh = th.cloneNode(true);
    th.parentNode.replaceChild(newTh, th);
  });

  // Add click handlers on headers
  const newHeaders = table.querySelectorAll('th');
  newHeaders.forEach((th, idx)=>{
    th.addEventListener('click', ()=>{
      const key = idx===1 ? 'file' : idx===2 ? 'severity' : idx===3 ? 'totalVulns' : null;
      if(!key) return;
      if(sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = -1; }
      newHeaders.forEach(h=>h.classList.remove('sort-asc','sort-desc'));
      th.classList.add(sortDir===1? 'sort-asc':'sort-desc');
      renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir);
      updatePagination();
    });
  });

  // pagination container - remove existing one if present
  let paginationContainer = table.parentNode.querySelector('.pagination');
  if (paginationContainer) {
    paginationContainer.remove();
  }
  paginationContainer = document.createElement('div');
  paginationContainer.className = 'pagination';
  table.parentNode.insertBefore(paginationContainer, table.nextSibling);

  function updatePagination(){
    // Calculate filtered grouped dependencies count for accurate pagination
    const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
    const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
    let filteredItems = items.filter(it=>{
      if(sev !== 'ALL' && (it.highestSeverity||'').toUpperCase() !== sev) return false;
      if(q && !(it.file||'').toLowerCase().includes(q)) return false;
      return true;
    });
    
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
    
    // Ensure currentPage is within valid bounds
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    // Clear and rebuild pagination controls
    paginationContainer.innerHTML = '';
    
    const prev = document.createElement('button'); 
    prev.textContent = 'Prev'; 
    prev.disabled = (currentPage <= 1); 
    prev.onclick = ()=>{ 
      if (currentPage > 1) {
        currentPage--; 
        renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); 
        updatePagination(); 
      }
    };
    
    const next = document.createElement('button'); 
    next.textContent = 'Next'; 
    next.disabled = (currentPage >= totalPages); 
    next.onclick = ()=>{ 
      if (currentPage < totalPages) {
        currentPage++; 
        renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); 
        updatePagination(); 
      }
    };
    
    const info = document.createElement('div'); 
    info.textContent = `Page ${currentPage} / ${totalPages}`;
    
    paginationContainer.appendChild(prev); 
    paginationContainer.appendChild(info); 
    paginationContainer.appendChild(next);
  }

  // CSV export button
  const csvBtn = document.getElementById('export-csv-btn');
  if(csvBtn){ 
    csvBtn.disabled = false; 
    // Remove existing event listeners by cloning the button
    const newCsvBtn = csvBtn.cloneNode(true);
    csvBtn.parentNode.replaceChild(newCsvBtn, csvBtn);
    
    newCsvBtn.addEventListener('click', ()=>{
      const htmlTable = generateExcelFromGroupedData(items); // Use enhanced Excel-compatible format
      const blob = new Blob([htmlTable], {type:'application/vnd.ms-excel'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `owasp-vulnerable-dependencies-${new Date().toISOString().split('T')[0]}.xls`; a.click(); URL.revokeObjectURL(url);
    }); 
  }

  // initial render
  renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir);
  updatePagination();

  // When filters change, re-run pagination & table (remove existing listeners first)
  const severityFilter = document.getElementById('severity-filter');
  const searchFilter = document.getElementById('search-filter');
  
  if(severityFilter) {
    const newSeverityFilter = severityFilter.cloneNode(true);
    severityFilter.parentNode.replaceChild(newSeverityFilter, severityFilter);
    newSeverityFilter.addEventListener('change', ()=>{ 
      currentPage=1; 
      renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); 
      updatePagination(); 
    });
  }
  
  if(searchFilter) {
    const newSearchFilter = searchFilter.cloneNode(true);
    searchFilter.parentNode.replaceChild(newSearchFilter, searchFilter);
    newSearchFilter.addEventListener('input', ()=>{ 
      currentPage=1; 
      renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); 
      updatePagination(); 
    });
  }

  // Reset button functionality
  const resetBtn = document.getElementById('reset-filters');
  if(resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener('click', ()=>{ 
      const severityFilter = document.getElementById('severity-filter');
      const searchFilter = document.getElementById('search-filter');
      if(severityFilter) severityFilter.value='ALL'; 
      if(searchFilter) searchFilter.value=''; 
      currentPage=1; 
      renderTablePage(items, rowsPerPage, currentPage, sortKey, sortDir); 
      updatePagination(); 
    });
  }
}

function renderTablePage(items, perPage, page, sortKey, sortDir){
  // Build filtered list according to filters
  const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
  const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
  let list = items.filter(it=>{
    // For grouped dependencies, check against highest severity
    if(sev !== 'ALL' && (it.highestSeverity||'').toUpperCase() !== sev) return false;
    // For grouped dependencies, search in file name
    if(q && !(it.file||'').toLowerCase().includes(q)) return false;
    return true;
  });

  if(sortKey){
    list.sort((a,b)=>{
      let va, vb;
      if(sortKey === 'severity') {
        const severityRank = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        va = severityRank[a.highestSeverity] || 0;
        vb = severityRank[b.highestSeverity] || 0;
      } else if(sortKey === 'file') {
        va = (a.file||'').toString().toLowerCase();
        vb = (b.file||'').toString().toLowerCase();
      } else if(sortKey === 'totalVulns') {
        va = a.totalVulns || 0;
        vb = b.totalVulns || 0;
      } else {
        va = 0; vb = 0;
      }
      if(va < vb) return -1 * sortDir; if(va > vb) return 1 * sortDir; return 0;
    });
  }

  const start = (page-1)*perPage; const pageItems = list.slice(start, start+perPage);
  const tbody = document.querySelector('#vuln-table tbody');
  if(!tbody) return;
  tbody.innerHTML = pageItems.map((dep, idx)=>{
    const globalIdx = start + idx;
    return `
      <tr class="vuln-row" data-idx="${globalIdx}">
        <td>${globalIdx+1}</td>
        <td><a href="#" onclick="return false">${escapeHtml(dep.file.split('/').pop() || dep.file)}</a></td>
        <td>${renderBadge(dep.highestSeverity)}</td>
        <td><strong>${dep.totalVulns}</strong></td>
        <td style="font-size: 0.9rem;">
          ${dep.severityCounts.CRITICAL > 0 ? `<span style="color: #dc2626;">C:${dep.severityCounts.CRITICAL}</span> ` : ''}
          ${dep.severityCounts.HIGH > 0 ? `<span style="color: #ea580c;">H:${dep.severityCounts.HIGH}</span> ` : ''}
          ${dep.severityCounts.MEDIUM > 0 ? `<span style="color: #d97706;">M:${dep.severityCounts.MEDIUM}</span> ` : ''}
          ${dep.severityCounts.LOW > 0 ? `<span style="color: #059669;">L:${dep.severityCounts.LOW}</span>` : ''}
        </td>
        <td style="font-family: monospace; font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(dep.file)}</td>
      </tr>
      <tr class="vuln-details" id="details-${globalIdx}">
        <td colspan="6">
          <div class="vuln-details-panel" id="panel-${globalIdx}">
            <div style="padding: 1rem;">
              <h4 style="margin: 0 0 1rem 0; color: #1e293b;">Vulnerabilities in ${escapeHtml(dep.file)}</h4>
              <div style="display: grid; gap: 1rem;">
                ${dep.vulnerabilities.map((vuln, vIdx) => `
                  <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; background: #fafafa;">
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: start; margin-bottom: 0.5rem;">
                      <div>
                        <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">${escapeHtml(vuln.name)}</div>
                        <div style="font-size: 0.9rem; color: #64748b; line-height: 1.4;">${escapeHtml(vuln.description)}</div>
                      </div>
                      <div>${renderBadge(vuln.severity)}</div>
                      <div style="text-align: right; font-size: 0.9rem; color: #64748b;">
                        ${renderCvss(vuln.cvss)}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </td>
      </tr>`;
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

function generateExcelFromGroupedData(items){
  // Group vulnerabilities by dependency/file
  const groupedDeps = groupVulnerabilitiesByDependency(items);
  
  // Apply current filters to get the same filtered data that would be shown
  const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
  const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
  
  let filteredItems = groupedDeps.filter(it=>{
    if(sev !== 'ALL' && (it.highestSeverity||'').toUpperCase() !== sev) return false;
    if(q && !(it.file||'').toLowerCase().includes(q)) return false;
    return true;
  });

  // Generate scan metadata
  const metadata = {
    scanDate: new Date().toLocaleDateString(),
    totalDependencies: filteredItems.length,
    appliedFilters: sev !== 'ALL' ? `Severity: ${sev}` : 'None',
    searchQuery: q || 'None'
  };

  // Calculate total vulnerabilities by severity
  const totalCounts = {
    CRITICAL: filteredItems.reduce((sum, dep) => sum + dep.severityCounts.CRITICAL, 0),
    HIGH: filteredItems.reduce((sum, dep) => sum + dep.severityCounts.HIGH, 0),
    MEDIUM: filteredItems.reduce((sum, dep) => sum + dep.severityCounts.MEDIUM, 0),
    LOW: filteredItems.reduce((sum, dep) => sum + dep.severityCounts.LOW, 0)
  };

  // Create HTML table with Excel-compatible styling
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Excel.Sheet">
      <meta name="Generator" content="OWASP Dependency Audit Tool">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Vulnerable Dependencies</x:Name>
              <x:WorksheetSource HRef="sheet001.htm"/>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        .header { font-weight: bold; background-color: #4472C4; color: white; text-align: center; font-size: 14px; }
        .summary { font-weight: bold; background-color: #E7E6E6; font-size: 12px; }
        .critical { background-color: #FFE6E6; color: #8B0000; font-weight: bold; }
        .high { background-color: #FFF0E6; color: #FF4500; font-weight: bold; }
        .medium { background-color: #FFFACD; color: #FF8C00; font-weight: bold; }
        .low { background-color: #F0FFF0; color: #228B22; font-weight: bold; }
        .data { font-size: 11px; border: 1px solid #D4D4D4; }
        .number { text-align: center; }
        .path { font-family: 'Courier New', monospace; font-size: 10px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #D4D4D4; padding: 8px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="9" class="header" style="font-size: 16px; padding: 15px;">
            🛡️ OWASP Dependency Check - Vulnerable Dependencies Report
          </td>
        </tr>
        <tr>
          <td colspan="9" class="summary">
            Report Generated: ${metadata.scanDate} | 
            Total Vulnerable Dependencies: ${metadata.totalDependencies} | 
            Applied Filters: ${metadata.appliedFilters} | 
            Search Query: ${metadata.searchQuery}
          </td>
        </tr>
        <tr>
          <td colspan="9" class="summary">
            🔴 Critical: ${totalCounts.CRITICAL} | 
            🟠 High: ${totalCounts.HIGH} | 
            🟡 Medium: ${totalCounts.MEDIUM} | 
            🟢 Low: ${totalCounts.LOW} | 
            Total Vulnerabilities: ${totalCounts.CRITICAL + totalCounts.HIGH + totalCounts.MEDIUM + totalCounts.LOW}
          </td>
        </tr>
        <tr><td colspan="9" style="height: 10px;"></td></tr>
        <tr class="header">
          <th style="width: 5%;">#</th>
          <th style="width: 20%;">Dependency</th>
          <th style="width: 12%;">Highest Severity</th>
          <th style="width: 8%;">Total Vulns</th>
          <th style="width: 8%;">Critical</th>
          <th style="width: 8%;">High</th>
          <th style="width: 8%;">Medium</th>
          <th style="width: 8%;">Low</th>
          <th style="width: 23%;">File Path</th>
        </tr>
        ${filteredItems.map((dep, index) => {
          const severityClass = dep.highestSeverity ? dep.highestSeverity.toLowerCase() : '';
          return `
          <tr class="data">
            <td class="number">${index + 1}</td>
            <td><strong>${escapeHtml(dep.file.split('/').pop() || dep.file)}</strong></td>
            <td class="${severityClass} number">${dep.highestSeverity || ''}</td>
            <td class="number"><strong>${dep.totalVulns}</strong></td>
            <td class="number ${dep.severityCounts.CRITICAL > 0 ? 'critical' : ''}">${dep.severityCounts.CRITICAL}</td>
            <td class="number ${dep.severityCounts.HIGH > 0 ? 'high' : ''}">${dep.severityCounts.HIGH}</td>
            <td class="number ${dep.severityCounts.MEDIUM > 0 ? 'medium' : ''}">${dep.severityCounts.MEDIUM}</td>
            <td class="number ${dep.severityCounts.LOW > 0 ? 'low' : ''}">${dep.severityCounts.LOW}</td>
            <td class="path">${escapeHtml(dep.file)}</td>
          </tr>`;
        }).join('')}
        <tr><td colspan="9" style="height: 10px;"></td></tr>
        <tr class="summary">
          <td colspan="9" style="font-style: italic; text-align: center;">
            Exported from OWASP Dependency Audit Tool - ${new Date().toLocaleString()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  return html;
}

function generateCSVFromGroupedData(items){
  // Group vulnerabilities by dependency/file
  const groupedDeps = groupVulnerabilitiesByDependency(items);
  
  const rows = [];
  rows.push(['#','Dependency','Highest Severity','Total Vulnerabilities','Critical','High','Medium','Low','File Path']);
  
  // Apply current filters to get the same filtered data that would be shown
  const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
  const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
  
  let filteredItems = groupedDeps.filter(it=>{
    if(sev !== 'ALL' && (it.highestSeverity||'').toUpperCase() !== sev) return false;
    if(q && !(it.file||'').toLowerCase().includes(q)) return false;
    return true;
  });
  
  // Export all filtered data (not just current page)
  filteredItems.forEach((dep, index) => {
    rows.push([
      (index + 1).toString(),
      (dep.file.split('/').pop() || dep.file) || '',
      dep.highestSeverity || '',
      dep.totalVulns.toString(),
      dep.severityCounts.CRITICAL.toString(),
      dep.severityCounts.HIGH.toString(),
      dep.severityCounts.MEDIUM.toString(),
      dep.severityCounts.LOW.toString(),
      dep.file || ''
    ].map(c => `"${c.replace(/"/g, '""')}"`));
  });
  
  return rows.map(r => r.join(',')).join('\n');
}

function generateCSVFromData(items){
  const rows = [];
  rows.push(['#','Dependency','Highest Severity','Total Vulnerabilities','Critical','High','Medium','Low','File Path']);
  
  // Apply current filters to get the same filtered data that would be shown
  const sev = document.getElementById('severity-filter') ? document.getElementById('severity-filter').value : 'ALL';
  const q = document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '';
  
  let filteredItems = items.filter(it=>{
    if(sev !== 'ALL' && (it.highestSeverity||'').toUpperCase() !== sev) return false;
    if(q && !(it.file||'').toLowerCase().includes(q)) return false;
    return true;
  });
  
  // Export all filtered data (not just current page)
  filteredItems.forEach((dep, index) => {
    rows.push([
      (index + 1).toString(),
      (dep.file.split('/').pop() || dep.file) || '',
      dep.highestSeverity || '',
      dep.totalVulns.toString(),
      dep.severityCounts.CRITICAL.toString(),
      dep.severityCounts.HIGH.toString(),
      dep.severityCounts.MEDIUM.toString(),
      dep.severityCounts.LOW.toString(),
      dep.file || ''
    ].map(c => `"${c.replace(/"/g, '""')}"`));
  });
  
  return rows.map(r => r.join(',')).join('\n');
}

function generateDeltaCSV(delta){
  const rows = [];
  
  // Add header
  rows.push(['Report Type', 'Vulnerability', 'Severity', 'CVSS', 'Description', 'File']);
  
  // Add fixed vulnerabilities
  delta.fixed.forEach(vuln => {
    rows.push([
      'FIXED',
      vuln.name || '',
      vuln.severity || '',
      vuln.cvss || '',
      (vuln.description || '').replace(/\n/g, ' ').substring(0, 200),
      vuln.file || ''
    ].map(c => `"${c.replace(/"/g, '""')}"`));
  });
  
  // Add new vulnerabilities
  delta.newUnsuppressed.forEach(vuln => {
    rows.push([
      'NEW',
      vuln.name || '',
      vuln.severity || '',
      vuln.cvss || '',
      (vuln.description || '').replace(/\n/g, ' ').substring(0, 200),
      vuln.file || ''
    ].map(c => `"${c.replace(/"/g, '""')}"`));
  });
  
  // Add summary information
  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '']);
  rows.push(['Fixed Vulnerabilities', delta.fixedCount.toString(), '', '', '', '']);
  rows.push(['Unhandled Vulnerabilities', delta.newUnsuppressedCount.toString(), '', '', '', '']);
  rows.push(['Suppressions Added', delta.suppressionChanges.added.length.toString(), '', '', '', '']);
  rows.push(['Suppressions Removed', delta.suppressionChanges.removed.length.toString(), '', '', '', '']);
  rows.push(['Current Total Vulnerabilities', delta.currentUnsuppressed.length.toString(), '', '', '', '']);
  
  return rows.map(r => r.join(',')).join('\n');
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

  // Filtering is now handled by initTableControls() with pagination
  // Removed conflicting filter event listeners to prevent interference
}

// Expose for debug (not needed)
window._debug = {parseDependencyCheck, parseSuppressions, filterSuppressions};