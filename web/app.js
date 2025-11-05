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
console.log('Delta toggle element found:', deltaToggle);
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

// Debug function for testing delta toggle
function debugDeltaToggle() {
  console.log('=== DEBUG DELTA TOGGLE ===');
  const toggle = document.getElementById('delta-mode-toggle');
  const uploads = document.getElementById('delta-uploads');
  
  console.log('Toggle element:', toggle);
  console.log('Toggle checked:', toggle ? toggle.checked : 'N/A');
  console.log('Uploads element:', uploads);
  console.log('Uploads display style:', uploads ? uploads.style.display : 'N/A');
  console.log('Uploads computed style:', uploads ? window.getComputedStyle(uploads).display : 'N/A');
  
  if (uploads) {
    console.log('Forcing uploads to show...');
    uploads.style.display = 'flex';
    uploads.style.visibility = 'visible';
    uploads.style.opacity = '1';
    console.log('After forcing - display:', uploads.style.display);
    console.log('After forcing - computed:', window.getComputedStyle(uploads).display);
  }
  
  console.log('isDeltaMode variable:', isDeltaMode);
  console.log('=== END DEBUG ===');
}

// Make it globally available
window.debugDeltaToggle = debugDeltaToggle;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  initializeDeltaToggle();
});

// Also try on window load as backup
window.addEventListener('load', function() {
  console.log('Window Load Event');
  if (!deltaToggle.hasAttribute('data-initialized')) {
    initializeDeltaToggle();
  }
});

function initializeDeltaToggle() {
  console.log('Initializing delta toggle...');
  const toggle = document.getElementById('delta-mode-toggle');
  const uploads = document.getElementById('delta-uploads');
  
  console.log('Toggle element:', toggle);
  console.log('Uploads element:', uploads);
  
  if (!toggle) {
    console.error('Delta toggle element not found in the DOM. Check if the ID "delta-mode-toggle" is correct.');
    return;
  }
  
  if (!uploads) {
    console.error('Delta uploads element not found in the DOM. Check if the ID "delta-uploads" is correct.');
    return;
  }
  
  toggle.setAttribute('data-initialized', 'true');
  console.log('Delta toggle initialized successfully:', toggle);
  
  // Remove any existing event listeners
  toggle.removeEventListener('change', handleDeltaToggle);
  // Add the event listener
  toggle.addEventListener('change', handleDeltaToggle);
  
  console.log('Event listener added to delta toggle');
}

function handleDeltaToggle(event) {
  console.log('Delta toggle state changed:', event.target.checked);
  isDeltaMode = event.target.checked;
  console.log('isDeltaMode updated to:', isDeltaMode);
  const deltaUploads = document.getElementById('delta-uploads');
  console.log('Delta uploads element:', deltaUploads);
  if (deltaUploads) {
    deltaUploads.style.display = isDeltaMode ? 'flex' : 'none';
    console.log('Set display to:', isDeltaMode ? 'flex' : 'none');
    console.log('Actual computed style:', window.getComputedStyle(deltaUploads).display);
  } else {
    console.error('Delta uploads element not found!');
  }
  updateGenerateButtonText();
}

// Legacy initialization (keeping for compatibility)
// Delta mode toggle
if (!deltaToggle) {
  console.error('Delta toggle element not found in the DOM. Check if the ID "delta-mode-toggle" is correct.');
} else {
  console.log('Delta toggle initialized successfully:', deltaToggle);
  
  // Add detailed logging to the event listener
  deltaToggle.addEventListener('change', () => {
    console.log('Delta toggle state changed:', deltaToggle.checked);
    isDeltaMode = deltaToggle.checked;
    console.log('isDeltaMode updated to:', isDeltaMode);
    const deltaUploads = document.getElementById('delta-uploads');
    console.log('Delta uploads element:', deltaUploads);
    if (deltaUploads) {
      deltaUploads.style.display = isDeltaMode ? 'flex' : 'none';
      console.log('Set display to:', isDeltaMode ? 'flex' : 'none');
    } else {
      console.error('Delta uploads element not found!');
    }
    updateGenerateButtonText();
  });
}

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
    renderDeltaReport(delta, currentResult.metadata);
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
  // Extract current report data from the DOM
  const isDelta = document.querySelector('.delta-container') !== null;
  
  if (isDelta) {
    // For delta reports, we'll handle this separately
    return { type: 'delta', html: reportArea.innerHTML };
  }
  
  // For normal reports, extract the data
  const vulnerabilities = [];
  document.querySelectorAll('#vuln-table tbody tr.vuln-row').forEach((row, idx) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      vulnerabilities.push({
        number: cells[0].textContent.trim(),
        name: cells[1].textContent.trim(),
        severity: cells[2].textContent.trim(),
        cvss: cells[3].textContent.trim(),
        description: cells[4].textContent.trim(),
        file: cells[5].textContent.trim()
      });
    }
  });

  // Extract summary statistics
  const metrics = {};
  document.querySelectorAll('.metric').forEach(metric => {
    const value = metric.querySelector('strong')?.textContent || '0';
    const label = metric.querySelector('.small')?.textContent || '';
    if (label) metrics[label] = parseInt(value);
  });

  const total = vulnerabilities.length;
  const generated = document.querySelector('.report-header')?.textContent.includes('Generated:') ? 
    document.querySelector('.report-header').textContent.match(/Generated: ([^Total]+)/)?.[1]?.trim() : 
    new Date().toLocaleString();

  return {
    type: 'normal',
    vulnerabilities,
    metrics,
    total,
    generated: generated || new Date().toLocaleString()
  };
}

function generateBeautifulReportHTML(data) {
  if (data.type === 'delta') {
    // For delta reports, return the existing beautiful HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OWASP Delta Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        ${getCommonStyles()}
    </style>
</head>
<body>
    <div class="container">
        ${data.html}
    </div>
    <script>${getInteractivityScript()}</script>
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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
        </div>` : `
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
        ${suppressionChanges ? `
        <div class="metrics-section">
            <h2>🔒 Suppression Changes</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.added}</div>
                    <div class="metric-label">Added</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.removed}</div>
                    <div class="metric-label">Removed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.unchanged}</div>
                    <div class="metric-label">Unchanged</div>
                </div>
            </div>
        </div>` : ''}`}
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
            ${isDelta ? `
            ${allVulnerabilities.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">⚠️ New Vulnerabilities (${allVulnerabilities.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>
            </div>` : ''}

            ${fixedVulns.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(fixedVulns)}
                    </tbody>
                </table>
            </div>` : ''}

            ` : `
            <h2 class="section-title">
                Security Vulnerabilities (${allVulnerabilities.length} total)
            </h2>
            
            ${allVulnerabilities.length === 0 ? 
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>`}
            `}
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
                </table>`}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;

// Replace special characters with plain text alternatives
const detailedSummary = `\nDELTA ANALYSIS RESULTS:\n------------------------------\nFixed Vulnerabilities: ${fixedCount}\nUnhandled Vulnerabilities: ${newCount}\nCurrent Total: ${totalCount}\n------------------------------\n\nThis delta report compares your current security scan with a baseline scan to show what vulnerabilities were fixed and what new ones were discovered.`;

// Ensure proper syntax for vulnerability list generation
if (newVulnTable) {
  vulnerabilityList = '\nUNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
  vulnerabilityList += '------------------------------\n';
  const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
  rows.forEach((row, index) => {
    if (index < 10) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const name = cells[1]?.textContent.trim() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const file = cells[5]?.textContent.trim() || '';
        vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
      }
    }
  });
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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
        </div>` : `
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
        ${suppressionChanges ? `
        <div class="metrics-section">
            <h2>🔒 Suppression Changes</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.added}</div>
                    <div class="metric-label">Added</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.removed}</div>
                    <div class="metric-label">Removed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.unchanged}</div>
                    <div class="metric-label">Unchanged</div>
                </div>
            </div>
        </div>` : ''}`}
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
            ${isDelta ? `
            ${allVulnerabilities.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">⚠️ New Vulnerabilities (${allVulnerabilities.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>
            </div>` : ''}

            ${fixedVulns.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(fixedVulns)}
                    </tbody>
                </table>
            </div>` : ''}

            ` : `
            <h2 class="section-title">
                Security Vulnerabilities (${allVulnerabilities.length} total)
            </h2>
            
            ${allVulnerabilities.length === 0 ? 
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>`}
            `}
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
                </table>`}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;

// Replace special characters with plain text alternatives
const detailedSummary = `\nDELTA ANALYSIS RESULTS:\n------------------------------\nFixed Vulnerabilities: ${fixedCount}\nUnhandled Vulnerabilities: ${newCount}\nCurrent Total: ${totalCount}\n------------------------------\n\nThis delta report compares your current security scan with a baseline scan to show what vulnerabilities were fixed and what new ones were discovered.`;

// Ensure proper syntax for vulnerability list generation
if (newVulnTable) {
  vulnerabilityList = '\nUNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
  vulnerabilityList += '------------------------------\n';
  const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
  rows.forEach((row, index) => {
    if (index < 10) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const name = cells[1]?.textContent.trim() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const file = cells[5]?.textContent.trim() || '';
        vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
      }
    }
  });
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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
        </div>` : `
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
        ${suppressionChanges ? `
        <div class="metrics-section">
            <h2>🔒 Suppression Changes</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.added}</div>
                    <div class="metric-label">Added</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.removed}</div>
                    <div class="metric-label">Removed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.unchanged}</div>
                    <div class="metric-label">Unchanged</div>
                </div>
            </div>
        </div>` : ''}`}
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
            ${isDelta ? `
            ${allVulnerabilities.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">⚠️ New Vulnerabilities (${allVulnerabilities.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>
            </div>` : ''}

            ${fixedVulns.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(fixedVulns)}
                    </tbody>
                </table>
            </div>` : ''}

            ` : `
            <h2 class="section-title">
                Security Vulnerabilities (${allVulnerabilities.length} total)
            </h2>
            
            ${allVulnerabilities.length === 0 ? 
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>`}
            `}
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
                </table>`}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;

// Replace special characters with plain text alternatives
const detailedSummary = `\nDELTA ANALYSIS RESULTS:\n------------------------------\nFixed Vulnerabilities: ${fixedCount}\nUnhandled Vulnerabilities: ${newCount}\nCurrent Total: ${totalCount}\n------------------------------\n\nThis delta report compares your current security scan with a baseline scan to show what vulnerabilities were fixed and what new ones were discovered.`;

// Ensure proper syntax for vulnerability list generation
if (newVulnTable) {
  vulnerabilityList = '\nUNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
  vulnerabilityList += '------------------------------\n';
  const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
  rows.forEach((row, index) => {
    if (index < 10) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const name = cells[1]?.textContent.trim() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const file = cells[5]?.textContent.trim() || '';
        vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
      }
    }
  });
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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
        </div>` : `
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
        ${suppressionChanges ? `
        <div class="metrics-section">
            <h2>🔒 Suppression Changes</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.added}</div>
                    <div class="metric-label">Added</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.removed}</div>
                    <div class="metric-label">Removed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.unchanged}</div>
                    <div class="metric-label">Unchanged</div>
                </div>
            </div>
        </div>` : ''}`}
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
            ${isDelta ? `
            ${allVulnerabilities.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">⚠️ New Vulnerabilities (${allVulnerabilities.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>
            </div>` : ''}

            ${fixedVulns.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(fixedVulns)}
                    </tbody>
                </table>
            </div>` : ''}

            ` : `
            <h2 class="section-title">
                Security Vulnerabilities (${allVulnerabilities.length} total)
            </h2>
            
            ${allVulnerabilities.length === 0 ? 
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>`}
            `}
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
                </table>`}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;

// Replace special characters with plain text alternatives
const detailedSummary = `\nDELTA ANALYSIS RESULTS:\n------------------------------\nFixed Vulnerabilities: ${fixedCount}\nUnhandled Vulnerabilities: ${newCount}\nCurrent Total: ${totalCount}\n------------------------------\n\nThis delta report compares your current security scan with a baseline scan to show what vulnerabilities were fixed and what new ones were discovered.`;

// Ensure proper syntax for vulnerability list generation
if (newVulnTable) {
  vulnerabilityList = '\nUNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
  vulnerabilityList += '------------------------------\n';
  const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
  rows.forEach((row, index) => {
    if (index < 10) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const name = cells[1]?.textContent.trim() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const file = cells[5]?.textContent.trim() || '';
        vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
      }
    }
  });
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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
        </div>` : `
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
        ${suppressionChanges ? `
        <div class="metrics-section">
            <h2>🔒 Suppression Changes</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.added}</div>
                    <div class="metric-label">Added</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.removed}</div>
                    <div class="metric-label">Removed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-number">${suppressionChanges.unchanged}</div>
                    <div class="metric-label">Unchanged</div>
                </div>
            </div>
        </div>` : ''}`}
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
            ${isDelta ? `
            ${allVulnerabilities.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">⚠️ New Vulnerabilities (${allVulnerabilities.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>
            </div>` : ''}

            ${fixedVulns.length > 0 ? `
            <div class="vuln-section">
                <h2 class="section-title">✅ Fixed Vulnerabilities (${fixedVulns.length} total)</h2>
                <table class="vuln-table">
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
                        ${generateVulnerabilityRows(fixedVulns)}
                    </tbody>
                </table>
            </div>` : ''}

            ` : `
            <h2 class="section-title">
                Security Vulnerabilities (${allVulnerabilities.length} total)
            </h2>
            
            ${allVulnerabilities.length === 0 ? 
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
                        ${generateVulnerabilityRows(allVulnerabilities)}
                    </tbody>
                </table>`}
            `}
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
                </table>`}
        </div>
        
        <div class="footer">
            <p><strong>OWASP Dependency Audit Tool</strong></p>
            <p>Visit: <a href="https://annasalkovsky.github.io/OWASP/" style="color: #3498db;">https://annasalkovsky.github.io/OWASP/</a></p>
            <p>Contact: anna.salkovsky@imd-soft.com</p>
        </div>
    </div>
</body>
</html>`;

// Replace special characters with plain text alternatives
const detailedSummary = `\nDELTA ANALYSIS RESULTS:\n------------------------------\nFixed Vulnerabilities: ${fixedCount}\nUnhandled Vulnerabilities: ${newCount}\nCurrent Total: ${totalCount}\n------------------------------\n\nThis delta report compares your current security scan with a baseline scan to show what vulnerabilities were fixed and what new ones were discovered.`;

// Ensure proper syntax for vulnerability list generation
if (newVulnTable) {
  vulnerabilityList = '\nUNHANDLED VULNERABILITIES REQUIRING ATTENTION:\n';
  vulnerabilityList += '------------------------------\n';
  const rows = newVulnTable.querySelectorAll('tbody tr.vuln-row');
  rows.forEach((row, index) => {
    if (index < 10) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const name = cells[1]?.textContent.trim() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const file = cells[5]?.textContent.trim() || '';
        vulnerabilityList += `${index + 1}. ${name} [${severity}]\n   File: ${file}\n\n`;
      }
    }
  });
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
  const vulnTable = isDelta ? document.querySelector('#new-vuln-table') : document.querySelector('#vuln-table');
  
  if (vulnTable) {
    // Get all visible vulnerability rows (not filtered out)
    const rows = Array.from(vulnTable.querySelectorAll('tbody tr.vuln-row')).filter(row => {
      return window.getComputedStyle(row).display !== 'none';
    });
    
    rows.forEach(row => {
      // Only process if the row has the correct severity level
      const severityCell = row.querySelector('td[data-severity]');
      if (severityCell) {
        const severity = severityCell.getAttribute('data-severity')?.toUpperCase() || 'UNKNOWN';
        if (severity) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            vulnerabilities.push({
              'Package': cells[0]?.textContent.trim() || '',
              'Vulnerability': cells[1]?.textContent.trim() || '',
              'Severity': severity,
              'CVSS': cells[3]?.textContent.trim() || '',
              'Description': cells[4]?.textContent.trim() || '',
              'File': cells[5]?.textContent.trim() || ''
            });
          }
        }
      }
    });
  }
  
  return {
    type: isDelta ? 'delta' : 'regular',
    vulnerabilities: vulnerabilities,
    timestamp: new Date().toLocaleString()
  };
}

// Helper function to generate table rows for vulnerabilities
function generateVulnerabilityRows(vulnerabilities) {
  return vulnerabilities.map(vuln => `

    <tr class="severity-${vuln.Severity?.toLowerCase() || 'unknown'}">
      <td>${escapeHtml(vuln.Package || '')}</td>
      <td>${escapeHtml(vuln.Vulnerability || '')}</td>
      <td>${escapeHtml(vuln.Severity || '')}</td>
      <td>${escapeHtml(vuln.CVSS || '')}</td>
      <td>${escapeHtml(vuln.Description || '')}</td>
      <td>${escapeHtml(vuln.File || '')}</td>
    </tr>
  `).join('');
}

// Helper function to escape HTML special characters
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Generate beautiful HTML report for export (enhanced version)
function generateBeautifulReportHTML(reportData) {
  const isDelta = reportData.type === 'delta';
  const timestamp = reportData.timestamp;
  
  let allVulnerabilities = [];
  let fixedVulns = [];
  let suppressionChanges = null;

  if (isDelta && reportData.data) {
    // Include all types of vulnerabilities for delta reports
    allVulnerabilities = reportData.data.newVulnerabilities || [];
    fixedVulns = reportData.data.fixed || [];
    suppressionChanges = reportData.data.suppressionChanges || {
      added: reportData.data.suppressedNewCount || 0,
      removed: 0,
      unchanged: 0
    };
  } else {
    allVulnerabilities = reportData.vulnerabilities || [];
  }
  
  const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
  
  // Debug logging for export data
  console.log('Export data debug:', {
    isDelta,
    reportDataType: reportData.type,
    allVulnerabilitiesCount: allVulnerabilities.length,
    fixedVulnsCount: fixedVulns.length,
    sampleAllVuln: allVulnerabilities[0],
    sampleFixedVuln: fixedVulns[0],
    suppressionChanges
  });
  
  // Function to count vulnerabilities by severity
  function countBySeverity(vulns) {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    if (!Array.isArray(vulns)) {
      console.warn('countBySeverity: vulns is not an array:', vulns);
      return counts;
    }

    vulns.forEach((vuln, index) => {
      // Debug logging for the first few vulnerabilities
      if (index < 3) {
        console.log(`Vulnerability ${index}:`, vuln);
      }
      
      // Try multiple ways to get severity
      let severity = vuln.severity || vuln.Severity || vuln.cvssScore?.severity;
      
      // If it's still not found, try looking at the structure
      if (!severity && typeof vuln === 'object') {
        // Check if vulnerability has nested structure
        severity = vuln.vulnerability?.severity || vuln.package?.severity;
      }
      
      if (typeof severity === 'string') {
        severity = severity.toUpperCase();
        if (counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      } else {
        console.warn('No severity found for vulnerability:', vuln);
      }
    });

    console.log('Severity counts:', counts);
    return counts;
  }

  // Get counts for both new and fixed vulnerabilities
  const severityCounts = countBySeverity(allVulnerabilities);
  const fixedCounts = countBySeverity(fixedVulns);
  
  const totalVulns = allVulnerabilities.length;
  
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
        
        .metrics-section {
            margin-bottom: 30px;
        }
        
        .metrics-section h2 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #764ba2;
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
        
        ${isDelta ? `
        <div class="metrics-section">
            <h2>⚠️ New Vulnerabilities</h2>
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
        </div>
        
        <div class="metrics-section">
            <h2>✅ Fixed Vulnerabilities</h2>
            <div class="metrics-grid">
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