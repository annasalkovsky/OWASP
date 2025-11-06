// OWASP Dependency Audit Tool - Complete Functionality

console.log('App loading...');

// Global variables for storing XML data
let dependencyXml = null;
let suppressionsXml = null;
let baselineDependencyXml = null;
let baselineSuppressionsXml = null;
let isDeltaMode = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready - setting up application');
    
    setupDeltaToggle();
    setupFileUploads();
    setupButtons();
    
    console.log('Application setup complete');
});

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
                console.log('Delta uploads display set to:', isDeltaMode ? 'flex' : 'none');
            }
            
            if (generateBtn) {
                generateBtn.textContent = isDeltaMode ? 'Generate Delta Report' : 'Generate Audit Report';
                console.log('Button text updated to:', generateBtn.textContent);
            }
        }
        
        // Set initial state
        updateDeltaMode();
        
        // Listen for changes
        deltaToggle.addEventListener('change', updateDeltaMode);
        
        console.log('Delta toggle setup complete');
    } else {
        console.warn('Delta toggle element not found');
    }
}

function setupFileUploads() {
    // Set up file input listeners and drag & drop
    setupFileInput('report-file', 'report', 'report-progress');
    setupFileInput('suppressions-file', 'suppressions', 'suppressions-progress');
    setupFileInput('baseline-report-file', 'baseline-report', 'baseline-progress');
    setupFileInput('baseline-suppressions-file', 'baseline-suppressions', 'baseline-suppressions-progress');
    
    // Set up drag and drop zones
    setupDropZone('report-drop', 'report-file', 'report', 'report-progress');
    setupDropZone('suppressions-drop', 'suppressions-file', 'suppressions', 'suppressions-progress');
    setupDropZone('baseline-report-drop', 'baseline-report-file', 'baseline-report', 'baseline-progress');
    setupDropZone('baseline-suppressions-drop', 'baseline-suppressions-file', 'baseline-suppressions', 'baseline-suppressions-progress');
}

function setupDropZone(dropZoneId, inputId, type, progressId) {
    const dropZone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);
    
    if (!dropZone || !input) return;
    
    // Handle drop zone clicks
    dropZone.addEventListener('click', function(e) {
        if (e.target === dropZone || e.target.classList.contains('drop-text')) {
            input.click();
        }
    });
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, function() {
            dropZone.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, function() {
            dropZone.classList.remove('drag-over');
        });
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', function(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            input.files = files; // Update the input files
            handleFileUpload(file, type, progressId);
        }
    });
}

function setupFileInput(inputId, type, progressId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file, type, progressId);
            }
        });
        console.log('File input setup for:', inputId);
    }
}

function handleFileUpload(file, type, progressId) {
    console.log('Uploading file:', file.name, 'Type:', type, 'Progress ID:', progressId);
    
    // Debug: Check if progress elements exist
    const progressBar = document.getElementById(progressId);
    console.log('Progress bar element found:', !!progressBar, progressId);
    
    // Show progress bar
    if (progressBar) {
        progressBar.style.display = 'block';
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        
        console.log('Progress fill found:', !!progressFill);
        console.log('Progress text found:', !!progressText);
        
        if (progressText) {
            progressText.textContent = 'Loading 0%';
        }
    } else {
        console.error('Progress bar not found for ID:', progressId);
    }
    
    const reader = new FileReader();
    
    reader.onprogress = function(e) {
        if (e.lengthComputable && progressBar) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const progressFill = progressBar.querySelector('.progress-fill');
            const progressText = progressBar.querySelector('.progress-text');
            
            if (progressFill) {
                progressFill.style.width = percentComplete + '%';
            }
            if (progressText) {
                progressText.textContent = `Loading ${percentComplete}%`;
            }
        }
    };
    
    reader.onload = function(e) {
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(e.target.result, 'text/xml');
            
            // Check for parsing errors
            const parseError = xml.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML format');
            }
            
            // Store the XML data
            storeXMLData(xml, type);
            
            // Hide progress bar
            if (progressBar) {
                progressBar.style.display = 'none';
            }
            
            // Show uploaded state
            setUploadedState(type, true);
            
            console.log('Successfully uploaded and parsed:', type);
            
        } catch (error) {
            console.error('Error parsing file:', error);
            if (progressBar) {
                progressBar.style.display = 'none';
            }
            alert('Error parsing file: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
        alert('Error reading file');
    };
    
    reader.readAsText(file);
}

function storeXMLData(xml, type) {
    switch (type) {
        case 'report':
            dependencyXml = xml;
            break;
        case 'suppressions':
            suppressionsXml = xml;
            break;
        case 'baseline-report':
            baselineDependencyXml = xml;
            break;
        case 'baseline-suppressions':
            baselineSuppressionsXml = xml;
            break;
        default:
            console.warn('Unknown file type:', type);
    }
}

function setUploadedState(type, isUploaded) {
    const configs = {
        'report': { zone: 'report-drop', message: 'report-uploaded' },
        'suppressions': { zone: 'suppressions-drop', message: 'suppressions-uploaded' },
        'baseline-report': { zone: 'baseline-report-drop', message: 'baseline-uploaded' },
        'baseline-suppressions': { zone: 'baseline-suppressions-drop', message: 'baseline-suppressions-uploaded' }
    };
    
    const config = configs[type];
    if (!config) {
        console.warn('Unknown upload type:', type);
        return;
    }
    
    const zone = document.getElementById(config.zone);
    const message = document.getElementById(config.message);
    
    if (isUploaded) {
        if (zone) {
            zone.classList.add('uploaded');
        }
        if (message) {
            message.setAttribute('aria-hidden', 'false');
            message.style.display = 'block';
        }
        console.log('Upload state set for:', type, '- uploaded');
    } else {
        if (zone) {
            zone.classList.remove('uploaded');
        }
        if (message) {
            message.setAttribute('aria-hidden', 'true');
            message.style.display = 'none';
        }
        console.log('Upload state set for:', type, '- not uploaded');
    }
}

function setupButtons() {
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const emailBtn = document.getElementById('email-btn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            if (isDeltaMode) {
                if (!dependencyXml || !baselineDependencyXml) {
                    alert('Please upload both current and baseline dependency reports for delta comparison');
                    return;
                }
                generateDeltaReport();
            } else {
                if (!dependencyXml) {
                    alert('Please upload a dependency report first');
                    return;
                }
                generateAuditReport();
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportReport);
    }
    
    if (emailBtn) {
        emailBtn.addEventListener('click', handleEmailReport);
    }
}

// Generate standard audit report
function generateAuditReport() {
    console.log('Generating audit report...');
    
    try {
        const vulnerabilities = extractVulnerabilitiesFromXML(dependencyXml, suppressionsXml);
        displayReport(vulnerabilities, 'audit');
        
        // Enable export buttons
        const exportBtn = document.getElementById('export-btn');
        const emailBtn = document.getElementById('email-btn');
        if (exportBtn) exportBtn.disabled = false;
        if (emailBtn) emailBtn.disabled = false;
        
        console.log(`Audit report generated with ${vulnerabilities.length} vulnerabilities`);
        
    } catch (error) {
        console.error('Error generating audit report:', error);
        alert('Error generating audit report: ' + error.message);
    }
}

// Generate delta comparison report
function generateDeltaReport() {
    console.log('=== DELTA REPORT GENERATION DEBUG ===');
    // Reset debug counters
    window.debugMatchCount = 0;
    
    console.log('Current dependency XML:', !!dependencyXml);
    console.log('Current suppressions XML:', !!suppressionsXml);
    console.log('Baseline dependency XML:', !!baselineDependencyXml);
    console.log('Baseline suppressions XML:', !!baselineSuppressionsXml);
    
    try {
        // Extract vulnerabilities with suppressions applied
        console.log('=== EXTRACTING CURRENT VULNERABILITIES ===');
        const currentVulns = extractVulnerabilitiesFromXML(dependencyXml, suppressionsXml);
        
        console.log('=== EXTRACTING BASELINE VULNERABILITIES ===');
        const baselineVulns = extractVulnerabilitiesFromXML(baselineDependencyXml, baselineSuppressionsXml);
        
        console.log(`Current vulnerabilities after suppressions: ${currentVulns.length}`);
        console.log(`Baseline vulnerabilities after suppressions: ${baselineVulns.length}`);
        
        // Log sample vulnerabilities for comparison
        if (currentVulns.length > 0) {
            console.log('Sample current vulnerability:', {
                Package: currentVulns[0].Package,
                Vulnerability: currentVulns[0].Vulnerability,
                Severity: currentVulns[0].Severity,
                File: currentVulns[0].File
            });
        }
        
        if (baselineVulns.length > 0) {
            console.log('Sample baseline vulnerability:', {
                Package: baselineVulns[0].Package,
                Vulnerability: baselineVulns[0].Vulnerability,
                Severity: baselineVulns[0].Severity,
                File: baselineVulns[0].File
            });
        }
        
        // Find differences
        console.log('=== CALCULATING DIFFERENCES ===');
        const newVulns = findNewVulnerabilities(currentVulns, baselineVulns);
        const fixedVulns = findFixedVulnerabilities(currentVulns, baselineVulns);
        
        console.log(`New vulnerabilities found: ${newVulns.length}`);
        console.log(`Fixed vulnerabilities found: ${fixedVulns.length}`);
        
        // Debug vulnerability matching
        console.log('=== VULNERABILITY MATCHING DEBUG ===');
        if (newVulns.length > 0) {
            console.log('First new vulnerability:', newVulns[0]);
            // Check if this "new" vulnerability exists in baseline
            const existsInBaseline = baselineVulns.some(bv => vulnerabilitiesMatch(newVulns[0], bv));
            console.log('Does first new vuln exist in baseline?', existsInBaseline);
        }
        
        if (fixedVulns.length > 0) {
            console.log('First fixed vulnerability:', fixedVulns[0]);
            // Check if this "fixed" vulnerability exists in current
            const existsInCurrent = currentVulns.some(cv => vulnerabilitiesMatch(fixedVulns[0], cv));
            console.log('Does first fixed vuln exist in current?', existsInCurrent);
        }
        
        // Store delta data for export
        window.lastDeltaData = {
            newVulnerabilities: newVulns,
            fixedVulnerabilities: fixedVulns,
            currentTotal: currentVulns.length,
            baselineTotal: baselineVulns.length,
            currentRaw: currentVulns,
            baselineRaw: baselineVulns
        };
        
        displayDeltaReport(newVulns, fixedVulns);
        
        // Enable export buttons
        const exportBtn = document.getElementById('export-btn');
        const emailBtn = document.getElementById('email-btn');
        if (exportBtn) exportBtn.disabled = false;
        if (emailBtn) emailBtn.disabled = false;
        
        console.log(`=== FINAL DELTA RESULTS ===`);
        console.log(`New (Unhandled): ${newVulns.length}, Fixed: ${fixedVulns.length}`);
        console.log(`Current total: ${currentVulns.length}, Baseline total: ${baselineVulns.length}`);
        
        // Validation check against expected numbers
        console.log(`=== VALIDATION CHECK ===`);
        console.log(`Expected: Baseline=182, Current=170, Fixed=27, Added=15`);
        console.log(`Actual: Baseline=${baselineVulns.length}, Current=${currentVulns.length}, Fixed=${fixedVulns.length}, Added=${newVulns.length}`);
        
        const expectedCurrentTotal = baselineVulns.length - fixedVulns.length + newVulns.length;
        console.log(`Math check: ${baselineVulns.length} (baseline) - ${fixedVulns.length} (fixed) + ${newVulns.length} (added) = ${expectedCurrentTotal} (should equal ${currentVulns.length} current)`);
        
        if (Math.abs(expectedCurrentTotal - currentVulns.length) > 5) {
            console.warn('WARNING: Math doesn\'t add up! There might be an issue with vulnerability matching or extraction.');
        }
    } catch (error) {
        console.error('Error generating delta report:', error);
        alert('Error generating delta report: ' + error.message);
    }
}

// Extract vulnerabilities from XML with suppressions applied
function extractVulnerabilitiesFromXML(depXml, suppXml) {
    if (!depXml) {
        console.warn('No dependency XML provided');
        return [];
    }
    
    const dependencies = Array.from(depXml.querySelectorAll('dependency'));
    const suppressions = suppXml ? Array.from(suppXml.querySelectorAll('suppress')) : [];
    
    console.log(`Processing ${dependencies.length} dependencies with ${suppressions.length} suppressions`);
    
    let allVulnerabilities = [];
    let suppressionAppliedCount = 0;
    
    dependencies.forEach((dependency, depIndex) => {
        const vulnerabilities = Array.from(dependency.querySelectorAll('vulnerability'));
        const packageName = getTextContent(dependency, 'fileName') || getTextContent(dependency, 'artifactId') || 'Unknown';
        const filePath = getTextContent(dependency, 'filePath') || 'Unknown';
        
        vulnerabilities.forEach((vuln, vulnIndex) => {
            // Get vulnerability identifier - prefer name over CVE references for matching
            let vulnId = getTextContent(vuln, 'name') || 'Unknown';
            
            // Get package name - try multiple fields
            let packageName = getTextContent(dependency, 'fileName') || 
                             getTextContent(dependency, 'artifactId') || 
                             getTextContent(dependency, 'groupId') || 'Unknown';
            
            // Normalize package name (remove version info, paths, etc)
            packageName = packageName.replace(/\.(jar|dll|exe|war)$/, '').replace(/.*[\\\/]/, '');
            
            // Get CVSS score
            let cvssScore = 'N/A';
            const cvssV3 = vuln.querySelector('cvssV3');
            const cvssV2 = vuln.querySelector('cvssV2');
            if (cvssV3) {
                cvssScore = getTextContent(cvssV3, 'baseScore') || getTextContent(cvssV3, 'baseSeverity') || cvssScore;
            } else if (cvssV2) {
                cvssScore = getTextContent(cvssV2, 'score') || cvssScore;
            }
            
            const vulnData = {
                Package: packageName,
                Vulnerability: vulnId,
                Severity: getTextContent(vuln, 'severity') || 'Unknown',
                CVSS: cvssScore,
                Description: truncateText(getTextContent(vuln, 'description'), 100) || 'No description',
                File: filePath,
                // Keep original data for reference
                OriginalPackage: getTextContent(dependency, 'fileName') || 'Unknown',
                Source: getTextContent(vuln, 'source') || 'Unknown'
            };
            
            // Debug first few vulnerabilities
            if (allVulnerabilities.length < 3) {
                console.log(`Vulnerability ${allVulnerabilities.length + 1}:`, {
                    Package: vulnData.Package,
                    OriginalPackage: vulnData.OriginalPackage,
                    Vulnerability: vulnData.Vulnerability,
                    Severity: vulnData.Severity,
                    File: vulnData.File
                });
            }
            
            allVulnerabilities.push(vulnData);
        });
    });
    
    console.log(`Found ${allVulnerabilities.length} total vulnerabilities before suppression filtering`);
    
    // Filter out suppressed vulnerabilities
    const filteredVulns = allVulnerabilities.filter(vuln => {
        const suppressed = isSuppressed(vuln, suppressions);
        if (suppressed) suppressionAppliedCount++;
        return !suppressed;
    });
    
    console.log(`After applying suppressions: ${filteredVulns.length} vulnerabilities remain (${suppressionAppliedCount} were suppressed)`);
    
    return filteredVulns;
}

// Helper function to get text content from XML element
function getTextContent(parent, selector) {
    const element = parent.querySelector(selector);
    return element ? element.textContent.trim() : null;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Check if vulnerability is suppressed
function isSuppressed(vulnerability, suppressions) {
    return suppressions.some(suppress => {
        // Check if suppression applies to this vulnerability
        const filePath = suppress.querySelector('filePath');
        const cpe = suppress.querySelector('cpe');
        const packageUrl = suppress.querySelector('packageUrl');
        const gav = suppress.querySelector('gav');
        const vulnerabilityName = suppress.querySelector('vulnerabilityName');
        const cve = suppress.querySelector('cve');
        const cvss = suppress.querySelector('cvssScore');
        const cwe = suppress.querySelector('cwe');
        
        // If file path is specified, check if it matches
        if (filePath && filePath.textContent.trim()) {
            const filePathPattern = filePath.textContent.trim();
            if (!vulnerability.File.includes(filePathPattern) && !vulnerability.Package.includes(filePathPattern)) {
                return false; // File path doesn't match, skip this suppression
            }
        }
        
        // Check vulnerability name/CVE match
        if (vulnerabilityName && vulnerabilityName.textContent.trim()) {
            const vulnNamePattern = vulnerabilityName.textContent.trim();
            if (vulnerability.Vulnerability.includes(vulnNamePattern)) {
                return true; // Vulnerability name matches
            }
        }
        
        // Check CVE match
        if (cve && cve.textContent.trim()) {
            const cvePattern = cve.textContent.trim();
            if (vulnerability.Vulnerability.includes(cvePattern)) {
                return true; // CVE matches
            }
        }
        
        // Check CPE match (for package/component)
        if (cpe && cpe.textContent.trim()) {
            const cpePattern = cpe.textContent.trim();
            if (vulnerability.Package.includes(cpePattern)) {
                return true; // CPE matches package
            }
        }
        
        // Check GAV (groupId:artifactId:version) match
        if (gav && gav.textContent.trim()) {
            const gavPattern = gav.textContent.trim();
            if (vulnerability.Package.includes(gavPattern) || vulnerability.File.includes(gavPattern)) {
                return true; // GAV matches
            }
        }
        
        // Check package URL match
        if (packageUrl && packageUrl.textContent.trim()) {
            const packageUrlPattern = packageUrl.textContent.trim();
            if (vulnerability.Package.includes(packageUrlPattern)) {
                return true; // Package URL matches
            }
        }
        
        return false;
    });
}

// Find new vulnerabilities (in current but not in baseline)
function findNewVulnerabilities(current, baseline) {
    return current.filter(currentVuln => 
        !baseline.some(baselineVuln => vulnerabilitiesMatch(currentVuln, baselineVuln))
    );
}

// Find fixed vulnerabilities (in baseline but not in current)
function findFixedVulnerabilities(current, baseline) {
    return baseline.filter(baselineVuln => 
        !current.some(currentVuln => vulnerabilitiesMatch(currentVuln, baselineVuln))
    );
}

// Check if two vulnerabilities are the same
function vulnerabilitiesMatch(vuln1, vuln2) {
    // Use a simpler matching strategy that might match the original tool
    // Match based on vulnerability name/CVE and package, but be more flexible with file paths
    
    const vuln1Id = vuln1.Vulnerability || '';
    const vuln2Id = vuln2.Vulnerability || '';
    const vuln1Pkg = vuln1.Package || '';
    const vuln2Pkg = vuln2.Package || '';
    
    // Primary match: same vulnerability ID and same package
    const basicMatch = vuln1Id === vuln2Id && vuln1Pkg === vuln2Pkg;
    
    // Debug logging for first few comparisons
    if (window.debugMatchCount < 10) {
        console.log(`Vulnerability match check #${window.debugMatchCount + 1}:`, {
            vuln1: { Vulnerability: vuln1Id, Package: vuln1Pkg, File: vuln1.File },
            vuln2: { Vulnerability: vuln2Id, Package: vuln2Pkg, File: vuln2.File },
            basicMatch: basicMatch,
            fileMatch: vuln1.File === vuln2.File
        });
        window.debugMatchCount = (window.debugMatchCount || 0) + 1;
    }
    
    return basicMatch;
}

// Display standard audit report
function displayReport(vulnerabilities, type) {
    const reportArea = document.getElementById('report-area');
    if (!reportArea) return;
    
    const severityCounts = calculateSeverityCounts(vulnerabilities);
    
    const html = `
        <div class="report-container">
            <div class="metrics">
                <div class="metric critical">
                    <strong>${severityCounts.CRITICAL}</strong>
                    <span>Critical</span>
                </div>
                <div class="metric high">
                    <strong>${severityCounts.HIGH}</strong>
                    <span>High</span>
                </div>
                <div class="metric medium">
                    <strong>${severityCounts.MEDIUM}</strong>
                    <span>Medium</span>
                </div>
                <div class="metric low">
                    <strong>${severityCounts.LOW}</strong>
                    <span>Low</span>
                </div>
            </div>
            
            <h2>Security Vulnerabilities (${vulnerabilities.length} total)</h2>
            
            ${generateVulnerabilityTable(vulnerabilities)}
        </div>
    `;
    
    reportArea.innerHTML = html;
    reportArea.hidden = false;
}

// Display delta comparison report
function displayDeltaReport(newVulns, fixedVulns) {
    const reportArea = document.getElementById('report-area');
    if (!reportArea) return;
    
    const data = window.lastDeltaData || {};
    const currentTotal = data.currentTotal || 0;
    const baselineTotal = data.baselineTotal || 0;
    
    // Calculate severity breakdowns
    const fixedSeverities = calculateSeverityCounts(fixedVulns);
    const newSeverities = calculateSeverityCounts(newVulns);
    
    // Calculate suppression changes (simplified for now)
    const suppressionChanges = calculateSuppressionChanges();
    
    const html = `
        <div class="delta-container">
            <div class="delta-header">
                <h1>🛡️ OWASP Delta Report</h1>
                <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="scan-info">
                <h2>📋 Scan Information</h2>
                <div class="scan-details">
                    <div class="scan-item">
                        <strong>dependency-check version:</strong> 12.4.0
                    </div>
                    <div class="scan-item">
                        <strong>Dependencies Scanned:</strong> ${data.currentTotal + data.baselineTotal} (total unique)
                    </div>
                    <div class="scan-item">
                        <strong>Vulnerable Dependencies:</strong> ${currentTotal}
                    </div>
                    <div class="scan-item highlight">
                        <strong>Vulnerabilities Found:</strong> ${newVulns.length}
                    </div>
                </div>
            </div>
            
            <div class="analysis-summary">
                <h2>📊 Analysis Summary</h2>
                <p class="summary-text">
                    <strong>Fixed:</strong> ${fixedVulns.length} vulnerabilities | 
                    <strong>Unhandled (Unsuppressed):</strong> ${newVulns.length} | 
                    <strong>Unhandled (Suppressed):</strong> 0 | 
                    <strong>Current Total:</strong> ${currentTotal} vulnerabilities
                </p>
            </div>
            
            <div class="delta-results">
                <div class="result-section fixed-section">
                    <div class="section-header fixed">
                        <h3>✅ Fixed Vulnerabilities (${fixedVulns.length})</h3>
                    </div>
                    <div class="severity-grid">
                        <div class="severity-box critical">
                            <div class="count">${fixedSeverities.CRITICAL}</div>
                            <div class="label">CRITICAL</div>
                        </div>
                        <div class="severity-box high">
                            <div class="count">${fixedSeverities.HIGH}</div>
                            <div class="label">HIGH</div>
                        </div>
                        <div class="severity-box medium">
                            <div class="count">${fixedSeverities.MEDIUM}</div>
                            <div class="label">MEDIUM</div>
                        </div>
                        <div class="severity-box low">
                            <div class="count">${fixedSeverities.LOW}</div>
                            <div class="label">LOW</div>
                        </div>
                    </div>
                </div>
                
                <div class="result-section unhandled-section">
                    <div class="section-header unhandled">
                        <h3>⚠️ Unhandled Vulnerabilities (${newVulns.length})</h3>
                    </div>
                    <div class="severity-grid">
                        <div class="severity-box critical">
                            <div class="count">${newSeverities.CRITICAL}</div>
                            <div class="label">CRITICAL</div>
                        </div>
                        <div class="severity-box high">
                            <div class="count">${newSeverities.HIGH}</div>
                            <div class="label">HIGH</div>
                        </div>
                        <div class="severity-box medium">
                            <div class="count">${newSeverities.MEDIUM}</div>
                            <div class="label">MEDIUM</div>
                        </div>
                        <div class="severity-box low">
                            <div class="count">${newSeverities.LOW}</div>
                            <div class="label">LOW</div>
                        </div>
                    </div>
                </div>
                
                <div class="result-section suppression-section">
                    <div class="section-header suppression">
                        <h3>📝 Suppression Changes</h3>
                    </div>
                    <div class="suppression-grid">
                        <div class="suppression-change added">
                            <div class="change-count">${suppressionChanges.added}</div>
                            <div class="change-label">Added</div>
                        </div>
                        <div class="suppression-change removed">
                            <div class="change-count">${suppressionChanges.removed}</div>
                            <div class="change-label">Removed</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${newVulns.length > 0 ? `
                <div class="vulnerabilities-details">
                    <h3>🔍 Unhandled Vulnerabilities Details</h3>
                    ${generateVulnerabilityTable(newVulns, 'unhandled-vulns')}
                </div>
            ` : ''}
            
            ${fixedVulns.length > 0 ? `
                <div class="vulnerabilities-details">
                    <h3>✅ Fixed Vulnerabilities Details</h3>
                    ${generateVulnerabilityTable(fixedVulns, 'fixed-vulns')}
                </div>
            ` : ''}
        </div>
    `;
    
    reportArea.innerHTML = html;
    reportArea.hidden = false;
}

// Calculate suppression changes between current and baseline
function calculateSuppressionChanges() {
    const currentSuppressions = suppressionsXml ? Array.from(suppressionsXml.querySelectorAll('suppress')) : [];
    const baselineSuppressions = baselineSuppressionsXml ? Array.from(baselineSuppressionsXml.querySelectorAll('suppress')) : [];
    
    // Convert suppressions to comparable strings
    const currentSuppSet = new Set(currentSuppressions.map(supp => getSuppressionSignature(supp)));
    const baselineSuppSet = new Set(baselineSuppressions.map(supp => getSuppressionSignature(supp)));
    
    // Find added suppressions (in current but not in baseline)
    const addedSuppressions = [...currentSuppSet].filter(supp => !baselineSuppSet.has(supp));
    
    // Find removed suppressions (in baseline but not in current)
    const removedSuppressions = [...baselineSuppSet].filter(supp => !currentSuppSet.has(supp));
    
    console.log(`Suppression analysis: ${addedSuppressions.length} added, ${removedSuppressions.length} removed`);
    
    return {
        added: addedSuppressions.length,
        removed: removedSuppressions.length,
        addedList: addedSuppressions,
        removedList: removedSuppressions
    };
}

// Generate a unique signature for a suppression rule
function getSuppressionSignature(suppressElement) {
    const filePath = getTextContent(suppressElement, 'filePath') || '';
    const cpe = getTextContent(suppressElement, 'cpe') || '';
    const packageUrl = getTextContent(suppressElement, 'packageUrl') || '';
    const gav = getTextContent(suppressElement, 'gav') || '';
    const vulnerabilityName = getTextContent(suppressElement, 'vulnerabilityName') || '';
    const cve = getTextContent(suppressElement, 'cve') || '';
    const cvss = getTextContent(suppressElement, 'cvssScore') || '';
    const cwe = getTextContent(suppressElement, 'cwe') || '';
    
    // Create a signature by combining all relevant fields
    return `${filePath}|${cpe}|${packageUrl}|${gav}|${vulnerabilityName}|${cve}|${cvss}|${cwe}`;
}

// Calculate severity counts
function calculateSeverityCounts(vulnerabilities) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    
    vulnerabilities.forEach(vuln => {
        const severity = vuln.Severity.toUpperCase();
        if (counts[severity] !== undefined) {
            counts[severity]++;
        }
    });
    
    return counts;
}

// Generate HTML table for vulnerabilities
function generateVulnerabilityTable(vulnerabilities, tableClass = '') {
    if (vulnerabilities.length === 0) {
        return '<p class="no-vulnerabilities">No vulnerabilities found.</p>';
    }
    
    const tableRows = vulnerabilities.map(vuln => `
        <tr>
            <td>${escapeHtml(vuln.Package)}</td>
            <td>${escapeHtml(vuln.Vulnerability)}</td>
            <td><span class="severity-${vuln.Severity.toLowerCase()}">${escapeHtml(vuln.Severity)}</span></td>
            <td>${escapeHtml(vuln.CVSS)}</td>
            <td>${escapeHtml(vuln.Description)}</td>
            <td>${escapeHtml(vuln.File)}</td>
        </tr>
    `).join('');
    
    return `
        <table id="vuln-table" class="${tableClass}">
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
                ${tableRows}
            </tbody>
        </table>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle export report
function handleExportReport() {
    try {
        const reportData = getCurrentReportData();
        const htmlContent = generateExportHTML(reportData);
        
        // Create and download file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OWASP-${reportData.type}-Report-${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(url);
        
        console.log('Report exported successfully');
        
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
    }
}

// Get current report data for export
function getCurrentReportData() {
    const isDelta = window.lastDeltaData && document.querySelector('.delta-container');
    const timestamp = new Date().toLocaleString();
    
    if (isDelta) {
        return {
            type: 'delta',
            data: window.lastDeltaData,
            timestamp: timestamp
        };
    }
    
    // Extract vulnerabilities from current DOM
    const vulnerabilities = [];
    const rows = document.querySelectorAll('#vuln-table tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
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
    
    return {
        type: 'regular',
        vulnerabilities: vulnerabilities,
        timestamp: timestamp
    };
}

// Generate HTML for export (simplified version)
function generateExportHTML(reportData) {
    const isDelta = reportData.type === 'delta';
    const title = isDelta ? 'OWASP Delta Security Report' : 'OWASP Security Audit Report';
    const vulnerabilities = isDelta ? (reportData.data?.newVulnerabilities || []) : (reportData.vulnerabilities || []);
    const severityCounts = calculateSeverityCounts(vulnerabilities);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { display: flex; gap: 20px; margin-bottom: 30px; }
        .metric { padding: 15px; border-radius: 5px; text-align: center; }
        .metric.critical { background: #ffebee; border-left: 4px solid #f44336; }
        .metric.high { background: #fff3e0; border-left: 4px solid #ff9800; }
        .metric.medium { background: #fffde7; border-left: 4px solid #ffeb3b; }
        .metric.low { background: #e8f5e8; border-left: 4px solid #4caf50; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .severity-critical { background: #f44336; color: white; padding: 4px 8px; border-radius: 3px; }
        .severity-high { background: #ff9800; color: white; padding: 4px 8px; border-radius: 3px; }
        .severity-medium { background: #ffeb3b; color: black; padding: 4px 8px; border-radius: 3px; }
        .severity-low { background: #4caf50; color: white; padding: 4px 8px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${reportData.timestamp}</p>
    </div>
    
    <div class="metrics">
        <div class="metric critical">
            <strong>${severityCounts.CRITICAL}</strong><br>Critical
        </div>
        <div class="metric high">
            <strong>${severityCounts.HIGH}</strong><br>High
        </div>
        <div class="metric medium">
            <strong>${severityCounts.MEDIUM}</strong><br>Medium
        </div>
        <div class="metric low">
            <strong>${severityCounts.LOW}</strong><br>Low
        </div>
    </div>
    
    <h2>${isDelta ? 'New Vulnerabilities Detected' : 'Security Vulnerabilities'} (${vulnerabilities.length} total)</h2>
    
    ${vulnerabilities.length === 0 ? 
        '<p>No vulnerabilities found!</p>' :
        `<table>
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
                        <td>${escapeHtml(vuln.Package || '')}</td>
                        <td>${escapeHtml(vuln.Vulnerability || '')}</td>
                        <td><span class="severity-${(vuln.Severity || '').toLowerCase()}">${escapeHtml(vuln.Severity || '')}</span></td>
                        <td>${escapeHtml(vuln.CVSS || '')}</td>
                        <td>${escapeHtml(vuln.Description || '')}</td>
                        <td>${escapeHtml(vuln.File || '')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`
    }
    
    <div style="margin-top: 50px; text-align: center; color: #666;">
        <p><strong>OWASP Dependency Audit Tool</strong></p>
        <p>Contact: anna.salkovsky@imd-soft.com</p>
    </div>
</body>
</html>`;
}

// Handle email report
function handleEmailReport() {
    try {
        const reportData = getCurrentReportData();
        const subject = `OWASP ${reportData.type === 'delta' ? 'Delta' : 'Security'} Report - ${new Date().toLocaleDateString()}`;
        
        let body = `OWASP Security Report\n\nGenerated: ${reportData.timestamp}\n\n`;
        
        if (reportData.type === 'delta') {
            const data = reportData.data || {};
            body += `Delta Summary:\n`;
            body += `New Vulnerabilities: ${data.newVulnerabilities?.length || 0}\n`;
            body += `Fixed Vulnerabilities: ${data.fixedVulnerabilities?.length || 0}\n`;
            body += `Current Total: ${data.currentTotal || 0}\n`;
            body += `Baseline Total: ${data.baselineTotal || 0}\n\n`;
            
            if (data.newVulnerabilities?.length > 0) {
                body += `New Vulnerabilities:\n`;
                data.newVulnerabilities.forEach((vuln, index) => {
                    body += `${index + 1}. ${vuln.Package} - ${vuln.Vulnerability} (${vuln.Severity})\n`;
                });
            }
        } else {
            const vulnerabilities = reportData.vulnerabilities || [];
            const severityCounts = calculateSeverityCounts(vulnerabilities);
            
            body += `Total Vulnerabilities: ${vulnerabilities.length}\n`;
            body += `Critical: ${severityCounts.CRITICAL}\n`;
            body += `High: ${severityCounts.HIGH}\n`;
            body += `Medium: ${severityCounts.MEDIUM}\n`;
            body += `Low: ${severityCounts.LOW}\n\n`;
            
            if (vulnerabilities.length > 0) {
                body += `Top Vulnerabilities:\n`;
                vulnerabilities.slice(0, 10).forEach((vuln, index) => {
                    body += `${index + 1}. ${vuln.Package} - ${vuln.Vulnerability} (${vuln.Severity})\n`;
                });
            }
        }
        
        body += `\nFor detailed report, please use the Export function.\n\nContact: anna.salkovsky@imd-soft.com`;
        
        // Create mailto link
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        
        console.log('Email client opened with report summary');
        
    } catch (error) {
        console.error('Email failed:', error);
        alert('Email failed: ' + error.message);
    }
}

console.log('App loaded successfully');
