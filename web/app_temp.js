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
      
      console.log('Delta toggle state:', isDeltaMode);
      console.log('Delta uploads element:', deltaUploads);
      console.log('Main upload row:', mainUploadRow);
      
      if (mainUploadRow) {
        mainUploadRow.style.display = 'flex';
        console.log('Main upload row display set to flex');
      }
      // Only show/hide the delta upload row
      if (deltaUploads) {
        deltaUploads.style.display = isDeltaMode ? 'flex' : 'none';
        console.log('Delta uploads display set to:', isDeltaMode ? 'flex' : 'none');
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
          progressText.textContent = 'ג“ Loaded successfully';
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
        progressText.textContent = 'ג— Failed to load';
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
      progressText.textContent = 'ג— Read failed';
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
      errorMsg += '\n\nThis usually means:\nג€¢ The uploaded file is not a valid OWASP dependency-check XML\nג€¢ The file may be corrupted or empty\nג€¢ Try re-running your dependency check and uploading a fresh XML file';
    } else if (error.message.includes('missing')) {
      errorMsg += '\n\nPlease ensure all required files are uploaded:\nג€¢ Current dependency check XML\nג€¢ Baseline dependency check XML';
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
        '<div class="no-vulnerabilities">נ‰ No vulnerabilities found! Your application is secure.</div>' :
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
</html>`;

  return exportHTML;
}

// Add minimal functionality to test delta toggle
function setupDeltaToggle() {
  const deltaToggle = document.getElementById('delta-mode-toggle');
  const generateBtn = document.getElementById('generate-btn');
  
  if (deltaToggle) {
    function updateDeltaMode() {
      isDeltaMode = deltaToggle.checked;
      const deltaUploads = document.getElementById('delta-uploads');
      
      console.log('Delta toggle changed to:', isDeltaMode);
      
      if (deltaUploads) {
        deltaUploads.style.display = isDeltaMode ? 'flex' : 'none';
      }
      
      if (generateBtn) {
        generateBtn.textContent = isDeltaMode ? 'Generate Delta Report' : 'Generate Audit Report';
      }
    }
    
    updateDeltaMode();
    deltaToggle.addEventListener('change', updateDeltaMode);
  }
}

// Initialize delta toggle when DOM is ready
document.addEventListener('DOMContentLoaded', setupDeltaToggle);
    
