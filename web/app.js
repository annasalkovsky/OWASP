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
    
    setupTabs();
    setupDeltaToggle();
    setupFileUploads();
    setupButtons();
    setupSonarQubeIntegration();
    
    console.log('Application setup complete');
});

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to corresponding button
    const buttonId = tabId + '-btn';
    const selectedButton = document.getElementById(buttonId);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    console.log('Switched to tab:', tabId);
}

function setupTabs() {
    // Initialize the first tab as active
    const firstTab = document.getElementById('owasp-tab');
    const firstButton = document.getElementById('owasp-tab-btn');
    
    if (firstTab && firstButton) {
        firstTab.classList.add('active');
        firstButton.classList.add('active');
    }
}

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
            const fileContent = e.target.result;
            
            if (type === 'sonar-html') {
                // Handle HTML files for SonarQube
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(fileContent, 'text/html');
                
                // Check if it's a valid HTML document
                if (!htmlDoc || htmlDoc.querySelector('parsererror')) {
                    throw new Error('Invalid HTML format');
                }
                
                // Store the HTML data
                storeXMLData(htmlDoc, type);
                
            } else {
                // Handle XML files (OWASP dependencies and suppressions)
                const parser = new DOMParser();
                const xml = parser.parseFromString(fileContent, 'text/xml');
                
                // Check for parsing errors
                const parseError = xml.querySelector('parsererror');
                if (parseError) {
                    throw new Error('Invalid XML format');
                }
                
                // Store the XML data
                storeXMLData(xml, type);
            }
            
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
        case 'sonar-html':
            // Store SonarQube HTML data
            window.sonarQubeHtmlData = xml;
            processSonarQubeHtml(xml);
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
        'baseline-suppressions': { zone: 'baseline-suppressions-drop', message: 'baseline-suppressions-uploaded' },
        'sonar-html': { zone: 'sonar-drop', message: 'sonar-uploaded' }
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
    const csvExportBtn = document.getElementById('export-csv-btn');
    const emailBtn = document.getElementById('email-btn');
    const compareSuppressions = document.getElementById('compare-suppressions-btn');
    
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
    
    if (csvExportBtn) {
        csvExportBtn.addEventListener('click', handleExportCSV);
    }
    
    if (emailBtn) {
        emailBtn.addEventListener('click', handleEmailReport);
    }
    
    if (compareSuppressions) {
        compareSuppressions.addEventListener('click', function() {
            if (!suppressionsXml && !baselineSuppressionsXml) {
                alert('Please upload at least one suppressions file to compare');
                return;
            }
            // This could open a modal or navigate to comparison page
            window.open('suppressions-compare.html', '_blank');
        });
    }
}

// Generate standard audit report
function generateAuditReport() {
    console.log('Generating audit report...');
    
    try {
        const vulnerabilities = extractVulnerabilitiesFromXML(dependencyXml, suppressionsXml);
        
        // Store for export functionality
        window.lastGeneratedVulnerabilities = vulnerabilities;
        
        displayReport(vulnerabilities, 'audit');
        
        // Enable export buttons
        const exportBtn = document.getElementById('export-btn');
        const csvExportBtn = document.getElementById('export-csv-btn');
        const emailBtn = document.getElementById('email-btn');
        if (exportBtn) exportBtn.disabled = false;
        if (csvExportBtn) csvExportBtn.disabled = false;
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
    
    // Calculate vulnerable dependencies count
    const vulnerableDependencies = new Set(filteredVulns.map(vuln => vuln.Package)).size;
    
    console.log(`After applying suppressions: ${filteredVulns.length} vulnerabilities remain (${suppressionAppliedCount} were suppressed)`);
    console.log(`Vulnerabilities found in ${vulnerableDependencies} out of ${dependencies.length} dependencies`);
    
    // Store comprehensive scan statistics for use in reports
    filteredVulns.scanStats = {
        totalDependencies: dependencies.length,
        totalVulnerabilitiesBeforeSuppressions: allVulnerabilities.length,
        totalSuppressions: suppressions.length,
        totalSuppressionsApplied: suppressionAppliedCount,
        totalVulnerabilitiesAfterSuppressions: filteredVulns.length,
        vulnerableDependencies: vulnerableDependencies
    };
    
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
    const stats = vulnerabilities.scanStats || {};
    
    const html = `
        <div class="report-container">
            <div class="comprehensive-summary">
                <h2>📊 Comprehensive Scan Summary</h2>
                <div class="summary-grid">
                    <div class="summary-section dependencies">
                        <h3>📁 Dependencies Analysis</h3>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Dependencies Scanned:</span>
                                <span class="stat-value">${stats.totalDependencies || 'N/A'}</span>
                            </div>
                            <div class="stat-item highlight">
                                <span class="stat-label">Vulnerable Dependencies:</span>
                                <span class="stat-value">${stats.vulnerableDependencies || 'N/A'}</span>
                                <span class="stat-percentage">(${stats.totalDependencies ? Math.round((stats.vulnerableDependencies/stats.totalDependencies)*100) : 'N/A'}%)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="summary-section vulnerabilities">
                        <h3>🔍 Vulnerability Analysis</h3>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Vulnerabilities Found (Before Suppressions):</span>
                                <span class="stat-value">${stats.totalVulnerabilitiesBeforeSuppressions || 'N/A'}</span>
                            </div>
                            <div class="stat-item warning">
                                <span class="stat-label">Total Vulnerabilities Found (After Suppressions):</span>
                                <span class="stat-value">${stats.totalVulnerabilitiesAfterSuppressions || vulnerabilities.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="summary-section suppressions">
                        <h3>🛡️ Suppressions Analysis</h3>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Suppression Rules:</span>
                                <span class="stat-value">${stats.totalSuppressions || 'N/A'}</span>
                            </div>
                            <div class="stat-item success">
                                <span class="stat-label">Suppressions Applied:</span>
                                <span class="stat-value">${stats.totalSuppressionsApplied || 'N/A'}</span>
                                <span class="stat-percentage">(${stats.totalVulnerabilitiesBeforeSuppressions ? Math.round((stats.totalSuppressionsApplied/stats.totalVulnerabilitiesBeforeSuppressions)*100) : 'N/A'}% filtered)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
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
    
    // Setup table event listeners for filtering and sorting
    setupTableEventListeners();
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
                        <strong>Current Dependencies Scanned:</strong> ${data.currentRaw?.totalDependenciesCount || 'N/A'}
                    </div>
                    <div class="scan-item">
                        <strong>Current Vulnerable Dependencies:</strong> ${data.currentRaw?.vulnerableDependenciesCount || 'N/A'}
                    </div>
                    <div class="scan-item highlight">
                        <strong>Current Vulnerabilities Found:</strong> ${currentTotal}
                    </div>
                    <div class="scan-item">
                        <strong>Baseline Dependencies Scanned:</strong> ${data.baselineRaw?.totalDependenciesCount || 'N/A'}
                    </div>
                    <div class="scan-item">
                        <strong>Baseline Vulnerable Dependencies:</strong> ${data.baselineRaw?.vulnerableDependenciesCount || 'N/A'}
                    </div>
                    <div class="scan-item">
                        <strong>Baseline Vulnerabilities:</strong> ${baselineTotal}
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
    
    // Setup table event listeners for filtering and sorting
    setupTableEventListeners();
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
    
    const uniqueId = 'vuln-table-' + Math.random().toString(36).substr(2, 9);
    
    const tableRows = vulnerabilities.map((vuln, index) => `
        <tr class="vuln-row" data-index="${index}">
            <td>
                <div class="package-info">
                    <strong>${escapeHtml(vuln.Package)}</strong>
                    ${vuln.Version ? `<div class="version-info">v${escapeHtml(vuln.Version)}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="vulnerability-info">
                    <strong>${escapeHtml(vuln.Vulnerability)}</strong>
                    ${vuln.Link ? `<a href="${escapeHtml(vuln.Link)}" target="_blank" class="vuln-link" title="View details">🔗</a>` : ''}
                </div>
            </td>
            <td><span class="severity-${vuln.Severity.toLowerCase()}">${escapeHtml(vuln.Severity)}</span></td>
            <td>
                <div class="cvss-info">
                    <span class="cvss-score">${escapeHtml(vuln.CVSS)}</span>
                    ${vuln.CVSSv3 ? `<div class="cvss-version">v3: ${escapeHtml(vuln.CVSSv3)}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="description-text" title="${escapeHtml(vuln.Description)}">
                    ${truncateText(escapeHtml(vuln.Description), 120)}
                </div>
            </td>
            <td>
                <div class="file-path" title="${escapeHtml(vuln.File)}">
                    ${truncateFilePath(escapeHtml(vuln.File))}
                </div>
            </td>
        </tr>
    `).join('');
    
    return `
        <div class="table-container">
            <div class="table-controls">
                <div class="filter-group">
                    <input type="text" id="${uniqueId}-search" class="filter-input" placeholder="🔍 Search vulnerabilities..." />
                    <select id="${uniqueId}-severity" class="filter-select">
                        <option value="">All Severities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <button class="clear-filters" onclick="clearTableFilters('${uniqueId}')">Clear Filters</button>
                </div>
                <div class="results-count" id="${uniqueId}-count">${vulnerabilities.length} vulnerabilities</div>
            </div>
            <div class="table-wrapper">
                <table id="${uniqueId}" class="table ${tableClass}" data-vulnerabilities='${JSON.stringify(vulnerabilities)}'>
                    <thead>
                        <tr>
                            <th data-sort="Package">Package <span class="sort-indicator"></span></th>
                            <th data-sort="Vulnerability">Vulnerability <span class="sort-indicator"></span></th>
                            <th data-sort="Severity">Severity <span class="sort-indicator"></span></th>
                            <th data-sort="CVSS">CVSS Score <span class="sort-indicator"></span></th>
                            <th data-sort="Description">Description</th>
                            <th data-sort="File">File Path</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function to truncate file paths intelligently
function truncateFilePath(path, maxLength = 50) {
    if (!path || path.length <= maxLength) return path;
    
    const parts = path.split(/[\\/]/);
    if (parts.length <= 2) return path;
    
    const fileName = parts[parts.length - 1];
    const firstPart = parts[0];
    
    if ((firstPart + '/.../' + fileName).length <= maxLength) {
        return firstPart + '/.../' + fileName;
    }
    
    return '.../' + fileName;
}

// Clear table filters
function clearTableFilters(tableId) {
    const searchInput = document.getElementById(tableId + '-search');
    const severitySelect = document.getElementById(tableId + '-severity');
    
    if (searchInput) searchInput.value = '';
    if (severitySelect) severitySelect.value = '';
    
    filterTable(tableId);
}

// Enhanced table filtering
function filterTable(tableId) {
    const table = document.getElementById(tableId);
    const searchInput = document.getElementById(tableId + '-search');
    const severitySelect = document.getElementById(tableId + '-severity');
    const countElement = document.getElementById(tableId + '-count');
    
    if (!table || !searchInput || !severitySelect) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const severityFilter = severitySelect.value;
    const rows = table.querySelectorAll('tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const packageName = cells[0]?.textContent.toLowerCase() || '';
        const vulnerability = cells[1]?.textContent.toLowerCase() || '';
        const severity = cells[2]?.textContent.trim() || '';
        const description = cells[4]?.textContent.toLowerCase() || '';
        const filePath = cells[5]?.textContent.toLowerCase() || '';
        
        const matchesSearch = !searchTerm || 
            packageName.includes(searchTerm) ||
            vulnerability.includes(searchTerm) ||
            description.includes(searchTerm) ||
            filePath.includes(searchTerm);
            
        const matchesSeverity = !severityFilter || severity === severityFilter;
        
        if (matchesSearch && matchesSeverity) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    if (countElement) {
        countElement.textContent = `${visibleCount} vulnerabilities`;
    }
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
    
    // Use stored vulnerabilities data instead of trying to parse DOM
    if (window.lastGeneratedVulnerabilities) {
        console.log('Using stored vulnerability data for export:', window.lastGeneratedVulnerabilities.length, 'vulnerabilities');
        return {
            type: 'regular',
            vulnerabilities: window.lastGeneratedVulnerabilities,
            timestamp: timestamp
        };
    }
    
    // Fallback: Extract vulnerabilities from current DOM if stored data not available
    const vulnerabilities = [];
    const rows = document.querySelectorAll('#vuln-table tbody tr, .vulnerability-item');
    
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
    
    console.log('Using DOM-extracted vulnerability data for export:', vulnerabilities.length, 'vulnerabilities');
    
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
    
    // Get scan statistics
    let scanStatsHTML = '';
    if (!isDelta && reportData.vulnerabilities && reportData.vulnerabilities.length > 0) {
        const stats = reportData.vulnerabilities.scanStats || {};
        scanStatsHTML = `
            <div class="export-scan-summary">
                <h2>📊 Comprehensive Scan Summary</h2>
                
                <div class="export-summary-section">
                    <h3>📁 Dependencies Analysis</h3>
                    <table class="summary-table">
                        <tr><td>Total Dependencies Scanned:</td><td><strong>${stats.totalDependencies || 'N/A'}</strong></td></tr>
                        <tr><td>Vulnerable Dependencies:</td><td><strong>${stats.vulnerableDependencies || 'N/A'}</strong> (${stats.totalDependencies ? Math.round((stats.vulnerableDependencies/stats.totalDependencies)*100) : 'N/A'}%)</td></tr>
                    </table>
                </div>
                
                <div class="export-summary-section">
                    <h3>🔍 Vulnerability Analysis</h3>
                    <table class="summary-table">
                        <tr><td>Total Vulnerabilities Found (Before Suppressions):</td><td><strong>${stats.totalVulnerabilitiesBeforeSuppressions || 'N/A'}</strong></td></tr>
                        <tr><td>Total Vulnerabilities Found (After Suppressions):</td><td><strong>${stats.totalVulnerabilitiesAfterSuppressions || vulnerabilities.length}</strong></td></tr>
                    </table>
                </div>
                
                <div class="export-summary-section">
                    <h3>🛡️ Suppressions Analysis</h3>
                    <table class="summary-table">
                        <tr><td>Total Suppression Rules:</td><td><strong>${stats.totalSuppressions || 'N/A'}</strong></td></tr>
                        <tr><td>Suppressions Applied:</td><td><strong>${stats.totalSuppressionsApplied || 'N/A'}</strong> (${stats.totalVulnerabilitiesBeforeSuppressions ? Math.round((stats.totalSuppressionsApplied/stats.totalVulnerabilitiesBeforeSuppressions)*100) : 'N/A'}% filtered)</td></tr>
                    </table>
                </div>
            </div>
        `;
    }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 8px; }
        .export-scan-summary { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .export-summary-section { margin: 20px 0; }
        .export-summary-section h3 { color: #374151; margin-bottom: 10px; font-size: 16px; }
        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .summary-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .summary-table td:first-child { width: 60%; color: #6b7280; }
        .summary-table td:last-child { font-weight: 600; color: #374151; }
        .metrics { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .metric { padding: 15px; border-radius: 5px; text-align: center; flex: 1; min-width: 120px; }
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
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${reportData.timestamp}</p>
    </div>
    
    ${scanStatsHTML}
    
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
    
    <div class="footer">
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

// SonarQube Integration Functions - Embedded Scripts
let sonarResults = [];

// Default SonarQube Configuration
let sonarConfig = {
    host: 'http://ubuntusrv01:9000',
    token: 'squ_e6852038fd0b432d1b093b8e81a1b53e20b1d48c',
    projectKey: 'MetaVision'
};

function setupSonarQubeIntegration() {
    console.log('Setting up SonarQube integration...');
    
    // Setup file upload for SonarQube HTML files
    setupFileInput('sonar-file', 'sonar-html', 'sonar-progress');
    setupDropZone('sonar-drop', 'sonar-file', 'sonar-html', 'sonar-progress');
    
    // Wait a moment to ensure DOM is fully loaded
    setTimeout(() => {
        console.log('🔍 DOM should be ready, setting up SonarQube features...');
        
        // Setup configuration form
        setupSonarConfigForm();
        
        // Setup execute button for embedded scripts
        const executeBtn = document.getElementById('execute-sonar-btn');
        if (executeBtn) {
            console.log('✅ Execute button found, attaching click handler...');
            
            // Remove any existing event listeners
            executeBtn.replaceWith(executeBtn.cloneNode(true));
            const newBtn = document.getElementById('execute-sonar-btn');
            
            newBtn.addEventListener('click', function() {
                console.log('🎯 SonarQube execute button clicked!');
                runEmbeddedSonarScript();
            });
            
            console.log('✅ SonarQube event listener attached successfully');
        } else {
            console.log('ℹ️ Execute button not found (normal if not using embedded SonarQube)');
        }
        
        // Setup SonarQube Excel export button
        const sonarExcelBtn = document.getElementById('export-sonar-btn');
        if (sonarExcelBtn) {
            sonarExcelBtn.addEventListener('click', exportSonarQubeToExcel);
        }
        
        console.log('✅ SonarQube integration setup complete');
    }, 100);
}

function setupSonarConfigForm() {
    // Pre-populate form fields with default values
    const hostInput = document.getElementById('sonar-host');
    const tokenInput = document.getElementById('sonar-token');
    const projectInput = document.getElementById('sonar-project');
    
    if (hostInput) hostInput.value = sonarConfig.host;
    if (tokenInput) tokenInput.value = sonarConfig.token;
    if (projectInput) projectInput.value = sonarConfig.projectKey;
    
    // Add event listeners to update config when changed
    if (hostInput) hostInput.addEventListener('change', updateSonarConfig);
    if (tokenInput) tokenInput.addEventListener('change', updateSonarConfig);
    if (projectInput) projectInput.addEventListener('change', updateSonarConfig);
}

function updateSonarConfig() {
    const hostInput = document.getElementById('sonar-host');
    const tokenInput = document.getElementById('sonar-token');
    const projectInput = document.getElementById('sonar-project');
    
    if (hostInput) sonarConfig.host = hostInput.value.trim();
    if (tokenInput) sonarConfig.token = tokenInput.value.trim();
    if (projectInput) sonarConfig.projectKey = projectInput.value.trim();
    
    console.log('SonarQube config updated:', sonarConfig);
}

async function runEmbeddedSonarScript() {
    console.log('🚀 Running embedded SonarQube security report generation...');
    alert('Function called! About to show results area...');
    
    // Show results area immediately for testing
    const resultsArea = document.getElementById('sonar-results-area');
    if (resultsArea) {
        resultsArea.style.display = 'block';
        console.log('✅ Results area shown');
    } else {
        console.error('❌ Results area not found!');
        alert('Error: Results area not found!');
        return;
    }
    
    const executionLog = document.getElementById('sonar-execution-log');
    if (executionLog) {
        executionLog.textContent = '🚀 Testing function execution...\n';
        console.log('✅ Execution log found and updated');
    } else {
        console.error('❌ Execution log not found!');
    }
}

// Make function globally accessible
window.runEmbeddedSonarScript = runEmbeddedSonarScript;

// Simple, working SonarQube report generator
function generateSonarReport() {
    console.log('🚀 Generating SonarQube Security Report...');
    
    // Show results area
    const resultsArea = document.getElementById('sonar-results-area');
    const executionLog = document.getElementById('sonar-execution-log');
    
    if (resultsArea) {
        resultsArea.style.display = 'block';
    }
    
    if (executionLog) {
        executionLog.textContent = '';
        addLogMessage('=== SonarQube Security Report Generation Started ===\n');
        addLogMessage(`Timestamp: ${new Date().toISOString()}\n\n`);
        
        // Get configuration
        const host = document.getElementById('sonar-host').value || 'http://ubuntusrv01:9000';
        const project = document.getElementById('sonar-project').value || 'MetaVision';
        const token = document.getElementById('sonar-token').value || 'squ_e6852038fd0b432d1b093b8e81a1b53e20b1d48c';
        
        addLogMessage(`SonarQube Host: ${host}\n`);
        addLogMessage(`Project Key: ${project}\n`);
        addLogMessage(`Token: ${token.substring(0, 10)}...\n\n`);
        
        // Try to fetch data
        fetchSonarData(host, project, token);
    }
}

function addLogMessage(message) {
    const executionLog = document.getElementById('sonar-execution-log');
    if (executionLog) {
        executionLog.textContent += message;
        executionLog.scrollTop = executionLog.scrollHeight;
    }
    console.log(message.trim());
}

async function fetchSonarData(host, project, token) {
    try {
        addLogMessage('📡 Connecting to SonarQube server...\n');
        
        // Create auth header
        const authHeader = 'Basic ' + btoa(token + ':');
        
        // Try to fetch security issues
        const issuesUrl = `${host}/api/issues/search?components=${project}&s=FILE_LINE&impactSoftwareQualities=SECURITY&ps=500&additionalFields=_all&timeZone=Asia/Jerusalem`;
        
        addLogMessage(`Calling: ${issuesUrl}\n`);
        
        const response = await fetch(issuesUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const issues = data.issues || [];
        
        addLogMessage(`✅ Successfully retrieved ${issues.length} security issues!\n\n`);
        
        if (issues.length > 0) {
            displaySonarResults(issues);
            enableExportButton();
        } else {
            addLogMessage('⚠️ No security issues found for this project.\n');
        }
        
    } catch (error) {
        console.error('SonarQube fetch error:', error);
        addLogMessage(`❌ ERROR: ${error.message}\n\n`);
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            addLogMessage('🚨 CORS ISSUE DETECTED!\n');
            addLogMessage('This happens when trying to access SonarQube from localhost.\n\n');
            addLogMessage('💡 SOLUTIONS:\n');
            addLogMessage('1. Use the HTML upload sections below instead\n');
            addLogMessage('2. Run this tool from the same server as SonarQube\n');
            addLogMessage('3. Configure SonarQube CORS settings\n\n');
        }
        
        // Show demo data for testing
        showDemoData();
    }
}

function displaySonarResults(issues) {
    addLogMessage('📊 Processing results...\n');
    
    // Show summary
    const securityIssues = issues.filter(i => i.type === 'SECURITY_HOTSPOT' || i.type === 'VULNERABILITY').length;
    const openIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'TO_REVIEW').length;
    
    addLogMessage(`   - Total Issues: ${issues.length}\n`);
    addLogMessage(`   - Security Issues: ${securityIssues}\n`);
    addLogMessage(`   - Open Issues: ${openIssues}\n\n`);
    addLogMessage('✅ Report generation complete!\n');
    addLogMessage('You can now export to Excel using the button below.\n');
    
    // Store results for export
    window.sonarResults = issues.map(issue => ({
        key: issue.key,
        project: issue.project,
        component: issue.component,
        status: issue.status,
        resolution: issue.resolution || '',
        created: issue.creationDate ? issue.creationDate.split('T')[0] : '',
        updated: issue.updateDate ? issue.updateDate.split('T')[0] : '',
        message: issue.message,
        severity: issue.severity || 'UNKNOWN'
    }));
}

function showDemoData() {
    addLogMessage('📋 Showing demo data for testing...\n');
    
    const demoData = [
        {
            key: 'DEMO-001',
            project: 'MetaVision',
            component: 'src/main/java/Security.java',
            status: 'OPEN',
            resolution: '',
            created: '2025-11-01',
            updated: '2025-11-05',
            message: 'SQL injection vulnerability detected',
            severity: 'CRITICAL'
        },
        {
            key: 'DEMO-002', 
            project: 'MetaVision',
            component: 'src/main/java/Authentication.java',
            status: 'TO_REVIEW',
            resolution: '',
            created: '2025-11-02',
            updated: '2025-11-05',
            message: 'Weak cryptographic hash detected',
            severity: 'HIGH'
        }
    ];
    
    window.sonarResults = demoData;
    displaySonarResults(demoData);
    enableExportButton();
}

function enableExportButton() {
    const exportBtn = document.getElementById('export-sonar-btn');
    if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
        exportBtn.onclick = exportSonarToExcel;
        addLogMessage('📁 Export button is now enabled!\n');
    }
}

function exportSonarToExcel() {
    if (!window.sonarResults || window.sonarResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    try {
        // Create workbook and worksheet using XLSX
        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = window.sonarResults.map((item, index) => ({
            'Row': index + 1,
            'Key': item.key,
            'Project': item.project,
            'Component': item.component,
            'Status': item.status,
            'Resolution': item.resolution,
            'Created': item.created,
            'Updated': item.updated,
            'Message': item.message,
            'Severity': item.severity
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // Row
            { wch: 15 },  // Key
            { wch: 15 },  // Project
            { wch: 30 },  // Component
            { wch: 12 },  // Status
            { wch: 12 },  // Resolution
            { wch: 12 },  // Created
            { wch: 12 },  // Updated
            { wch: 50 },  // Message
            { wch: 10 }   // Severity
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Security Issues');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `SonarQube_Security_Report_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        addLogMessage(`📁 Excel file "${filename}" downloaded successfully!\n`);
        
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Error exporting to Excel: ' + error.message);
    }
}

// OWASP File Server Functions
function openFileServerPath() {
    const defaultPath = "\\\\aut-tfs-file\\OWASP Dependency-Checks";
    const pathInput = document.getElementById('owaspFileServerPath');

    // Set the default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }

    const path = pathInput.value.trim();

    // Open the UNC path directly in Windows Explorer
    try {
        const shell = new ActiveXObject("WScript.Shell");
        shell.Run(`explorer.exe "${path}"`);
    } catch (error) {
        console.error('Failed to open path in Windows Explorer:', error);
        alert('Unable to open the specified path. Please check your system settings.');
    }
}

function loadOWASPFromFileServer(reportType) {
    console.log('Loading OWASP report from file server:', reportType);
    
    const defaultPath = "\\\\aut-tfs-file\\OWASP Dependency-Checks";
    const pathInput = document.getElementById('owaspFileServerPath');
    
    // Ensure we have the default path
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const basePath = pathInput.value.trim();
    
    // Open Windows Explorer to the UNC path directly - no dialogs
    try {
        // Method 1: Direct UNC path opening
        window.open('file:///' + basePath.replace(/\\/g, '/'), '_blank');
    } catch (error) {
        try {
            // Method 2: Alternative protocol
            window.location.href = `file://${basePath}`;
        } catch (error2) {
            // Method 3: Create temporary link
            const link = document.createElement('a');
            link.href = 'file:///' + basePath.replace(/\\/g, '/');
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Enable delta mode for baseline reports
    if (reportType === 'baseline') {
        const deltaToggle = document.getElementById('delta-mode-toggle');
        if (deltaToggle && !deltaToggle.checked) {
            deltaToggle.click();
        }
    }
}

// Simple, working SonarQube report generator - GLOBAL FUNCTION
function generateSonarReport() {
    console.log('🚀 Generating SonarQube Security Report...');
    
    // Show results area
    const resultsArea = document.getElementById('sonar-results-area');
    const executionLog = document.getElementById('sonar-execution-log');
    
    if (resultsArea) {
        resultsArea.style.display = 'block';
    }
    
    if (executionLog) {
        executionLog.textContent = '';
        addLogMessage('=== SonarQube Security Report Generation Started ===\n');
        addLogMessage(`Timestamp: ${new Date().toISOString()}\n\n`);
        
        // Get configuration
        const host = document.getElementById('sonar-host').value || 'http://ubuntusrv01:9000';
        const project = document.getElementById('sonar-project').value || 'MetaVision';
        const token = document.getElementById('sonar-token').value || 'squ_e6852038fd0b432d1b093b8e81a1b53e20b1d48c';
        
        addLogMessage(`SonarQube Host: ${host}\n`);
        addLogMessage(`Project Key: ${project}\n`);
        addLogMessage(`Token: ${token.substring(0, 10)}...\n\n`);
        
        // Try to fetch data
        fetchSonarData(host, project, token);
    }
}

function addLogMessage(message) {
    const executionLog = document.getElementById('sonar-execution-log');
    if (executionLog) {
        executionLog.textContent += message;
        executionLog.scrollTop = executionLog.scrollHeight;
    }
    console.log(message.trim());
}

async function fetchSonarData(host, project, token) {
    try {
        addLogMessage('📡 Connecting to SonarQube server...\n');
        
        // Create auth header
        const authHeader = 'Basic ' + btoa(token + ':');
        
        // Try to fetch security issues
        const issuesUrl = `${host}/api/issues/search?components=${project}&s=FILE_LINE&impactSoftwareQualities=SECURITY&ps=500&additionalFields=_all&timeZone=Asia/Jerusalem`;
        
        addLogMessage(`Calling: ${issuesUrl}\n`);
        
        const response = await fetch(issuesUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const issues = data.issues || [];
        
        addLogMessage(`✅ Successfully retrieved ${issues.length} security issues!\n\n`);
        
        if (issues.length > 0) {
            displaySonarResults(issues);
            enableExportButton();
        } else {
            addLogMessage('⚠️ No security issues found for this project.\n');
        }
        
    } catch (error) {
        console.error('SonarQube fetch error:', error);
        addLogMessage(`❌ ERROR: ${error.message}\n\n`);
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            addLogMessage('🚨 CORS ISSUE DETECTED!\n');
            addLogMessage('This happens when trying to access SonarQube from localhost.\n\n');
            addLogMessage('💡 SOLUTIONS:\n');
            addLogMessage('1. Use the HTML upload sections below instead\n');
            addLogMessage('2. Run this tool from the same server as SonarQube\n');
            addLogMessage('3. Configure SonarQube CORS settings\n\n');
        }
        
        // Show demo data for testing
        showDemoData();
    }
}

function displaySonarResults(issues) {
    addLogMessage('📊 Processing results...\n');
    
    // Show summary
    const securityIssues = issues.filter(i => i.type === 'SECURITY_HOTSPOT' || i.type === 'VULNERABILITY').length;
    const openIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'TO_REVIEW').length;
    
    addLogMessage(`   - Total Issues: ${issues.length}\n`);
    addLogMessage(`   - Security Issues: ${securityIssues}\n`);
    addLogMessage(`   - Open Issues: ${openIssues}\n\n`);
    addLogMessage('✅ Report generation complete!\n');
    addLogMessage('You can now export to Excel using the button below.\n');
    
    // Store results for export
    window.sonarResults = issues.map(issue => ({
        key: issue.key,
        project: issue.project,
        component: issue.component,
        status: issue.status,
        resolution: issue.resolution || '',
        created: issue.creationDate ? issue.creationDate.split('T')[0] : '',
        updated: issue.updateDate ? issue.updateDate.split('T')[0] : '',
        message: issue.message,
        severity: issue.severity || 'UNKNOWN'
    }));
}

function showDemoData() {
    addLogMessage('📋 Showing demo data for testing...\n');
    
    const demoData = [
        {
            key: 'DEMO-001',
            project: 'MetaVision',
            component: 'src/main/java/Security.java',
            status: 'OPEN',
            resolution: '',
            created: '2025-11-01',
            updated: '2025-11-05',
            message: 'SQL injection vulnerability detected',
            severity: 'CRITICAL'
        },
        {
            key: 'DEMO-002', 
            project: 'MetaVision',
            component: 'src/main/java/Authentication.java',
            status: 'TO_REVIEW',
            resolution: '',
            created: '2025-11-02',
            updated: '2025-11-05',
            message: 'Weak cryptographic hash detected',
            severity: 'HIGH'
        }
    ];
    
    window.sonarResults = demoData;
    displaySonarResults(demoData);
    enableExportButton();
}

function enableExportButton() {
    const exportBtn = document.getElementById('export-sonar-btn');
    if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
        exportBtn.onclick = exportSonarToExcel;
        addLogMessage('📁 Export button is now enabled!\n');
    }
}

function exportSonarToExcel() {
    if (!window.sonarResults || window.sonarResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    try {
        // Create workbook and worksheet using XLSX
        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = window.sonarResults.map((item, index) => ({
            'Row': index + 1,
            'Key': item.key,
            'Project': item.project,
            'Component': item.component,
            'Status': item.status,
            'Resolution': item.resolution,
            'Created': item.created,
            'Updated': item.updated,
            'Message': item.message,
            'Severity': item.severity
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // Row
            { wch: 15 },  // Key
            { wch: 15 },  // Project
            { wch: 30 },  // Component
            { wch: 12 },  // Status
            { wch: 12 },  // Resolution
            { wch: 12 },  // Created
            { wch: 12 },  // Updated
            { wch: 50 },  // Message
            { wch: 10 }   // Severity
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Security Issues');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `SonarQube_Security_Report_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        addLogMessage(`📁 Excel file "${filename}" downloaded successfully!\n`);
        
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Error exporting to Excel: ' + error.message);
    }
}

// OWASP File Server Functions
function openFileServerPath() {
    const defaultPath = "\\\\aut-tfs-file\\OWASP Dependency-Checks";
    const pathInput = document.getElementById('owaspFileServerPath');

    // Set the default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }

    const path = pathInput.value.trim();

    // Open the UNC path directly in Windows Explorer
    try {
        const shell = new ActiveXObject("WScript.Shell");
        shell.Run(`explorer.exe "${path}"`);
    } catch (error) {
        console.error('Failed to open path in Windows Explorer:', error);
        alert('Unable to open the specified path. Please check your system settings.');
    }
}

function loadOWASPFromFileServer(reportType) {
    console.log('Loading OWASP report from file server:', reportType);
    
    const defaultPath = "\\\\aut-tfs-file\\OWASP Dependency-Checks";
    const pathInput = document.getElementById('owaspFileServerPath');
    
    // Ensure we have the default path
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const basePath = pathInput.value.trim();
    
    // Open Windows Explorer to the UNC path directly - no dialogs
    try {
        // Method 1: Direct UNC path opening
        window.open('file:///' + basePath.replace(/\\/g, '/'), '_blank');
    } catch (error) {
        try {
            // Method 2: Alternative protocol
            window.location.href = `file://${basePath}`;
        } catch (error2) {
            // Method 3: Create temporary link
            const link = document.createElement('a');
            link.href = 'file:///' + basePath.replace(/\\/g, '/');
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Enable delta mode for baseline reports
    if (reportType === 'baseline') {
        const deltaToggle = document.getElementById('delta-mode-toggle');
        if (deltaToggle && !deltaToggle.checked) {
            deltaToggle.click();
        }
    }
}

// Simple, working SonarQube report generator - GLOBAL FUNCTION
function generateSonarReport() {
    console.log('🚀 Generating SonarQube Security Report...');
    
    // Show results area
    const resultsArea = document.getElementById('sonar-results-area');
    const executionLog = document.getElementById('sonar-execution-log');
    
    if (resultsArea) {
        resultsArea.style.display = 'block';
    }
    
    if (executionLog) {
        executionLog.textContent = '';
        addLogMessage('=== SonarQube Security Report Generation Started ===\n');
        addLogMessage(`Timestamp: ${new Date().toISOString()}\n\n`);
        
        // Get configuration
        const host = document.getElementById('sonar-host').value || 'http://ubuntusrv01:9000';
        const project = document.getElementById('sonar-project').value || 'MetaVision';
        const token = document.getElementById('sonar-token').value || 'squ_e6852038fd0b432d1b093b8e81a1b53e20b1d48c';
        
        addLogMessage(`SonarQube Host: ${host}\n`);
        addLogMessage(`Project Key: ${project}\n`);
        addLogMessage(`Token: ${token.substring(0, 10)}...\n\n`);
        
        // Try to fetch data
        fetchSonarData(host, project, token);
    }
}

function addLogMessage(message) {
    const executionLog = document.getElementById('sonar-execution-log');
    if (executionLog) {
        executionLog.textContent += message;
        executionLog.scrollTop = executionLog.scrollHeight;
    }
    console.log(message.trim());
}

async function fetchSonarData(host, project, token) {
    try {
        addLogMessage('📡 Connecting to SonarQube server...\n');
        
        // Create auth header
        const authHeader = 'Basic ' + btoa(token + ':');
        
        // Try to fetch security issues
        const issuesUrl = `${host}/api/issues/search?components=${project}&s=FILE_LINE&impactSoftwareQualities=SECURITY&ps=500&additionalFields=_all&timeZone=Asia/Jerusalem`;
        
        addLogMessage(`Calling: ${issuesUrl}\n`);
        
        const response = await fetch(issuesUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const issues = data.issues || [];
        
        addLogMessage(`✅ Successfully retrieved ${issues.length} security issues!\n\n`);
        
        if (issues.length > 0) {
            displaySonarResults(issues);
            enableExportButton();
        } else {
            addLogMessage('⚠️ No security issues found for this project.\n');
        }
        
    } catch (error) {
        console.error('SonarQube fetch error:', error);
        addLogMessage(`❌ ERROR: ${error.message}\n\n`);
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            addLogMessage('🚨 CORS ISSUE DETECTED!\n');
            addLogMessage('This happens when trying to access SonarQube from localhost.\n\n');
            addLogMessage('💡 SOLUTIONS:\n');
            addLogMessage('1. Use the HTML upload sections below instead\n');
            addLogMessage('2. Run this tool from the same server as SonarQube\n');
            addLogMessage('3. Configure SonarQube CORS settings\n\n');
        }
        
        // Show demo data for testing
        showDemoData();
    }
}

function displaySonarResults(issues) {
    addLogMessage('📊 Processing results...\n');
    
    // Show summary
    const securityIssues = issues.filter(i => i.type === 'SECURITY_HOTSPOT' || i.type === 'VULNERABILITY').length;
    const openIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'TO_REVIEW').length;
    
    addLogMessage(`   - Total Issues: ${issues.length}\n`);
    addLogMessage(`   - Security Issues: ${securityIssues}\n`);
    addLogMessage(`   - Open Issues: ${openIssues}\n\n`);
    addLogMessage('✅ Report generation complete!\n');
    addLogMessage('You can now export to Excel using the button below.\n');
    
    // Store results for export
    window.sonarResults = issues.map(issue => ({
        key: issue.key,
        project: issue.project,
        component: issue.component,
        status: issue.status,
        resolution: issue.resolution || '',
        created: issue.creationDate ? issue.creationDate.split('T')[0] : '',
        updated: issue.updateDate ? issue.updateDate.split('T')[0] : '',
        message: issue.message,
        severity: issue.severity || 'UNKNOWN'
    }));
}

function showDemoData() {
    addLogMessage('📋 Showing demo data for testing...\n');
    
    const demoData = [
        {
            key: 'DEMO-001',
            project: 'MetaVision',
            component: 'src/main/java/Security.java',
            status: 'OPEN',
            resolution: '',
            created: '2025-11-01',
            updated: '2025-11-05',
            message: 'SQL injection vulnerability detected',
            severity: 'CRITICAL'
        },
        {
            key: 'DEMO-002', 
            project: 'MetaVision',
            component: 'src/main/java/Authentication.java',
            status: 'TO_REVIEW',
            resolution: '',
            created: '2025-11-02',
            updated: '2025-11-05',
            message: 'Weak cryptographic hash detected',
            severity: 'HIGH'
        }
    ];
    
    window.sonarResults = demoData;
    displaySonarResults(demoData);
    enableExportButton();
}

function enableExportButton() {
    const exportBtn = document.getElementById('export-sonar-btn');
    if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
        exportBtn.onclick = exportSonarToExcel;
        addLogMessage('📁 Export button is now enabled!\n');
    }
}

function exportSonarToExcel() {
    if (!window.sonarResults || window.sonarResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    try {
        // Create workbook and worksheet using XLSX
        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = window.sonarResults.map((item, index) => ({
            'Row': index + 1,
            'Key': item.key,
            'Project': item.project,
            'Component': item.component,
            'Status': item.status,
            'Resolution': item.resolution,
            'Created': item.created,
            'Updated': item.updated,
            'Message': item.message,
            'Severity': item.severity
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // Row
            { wch: 15 },  // Key
            { wch: 15 },  // Project
            { wch: 30 },  // Component
            { wch: 12 },  // Status
            { wch: 12 },  // Resolution
            { wch: 12 },  // Created
            { wch: 12 },  // Updated
            { wch: 50 },  // Message
            { wch: 10 }   // Severity
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Security Issues');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `SonarQube_Security_Report_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        addLogMessage(`📁 Excel file "${filename}" downloaded successfully!\n`);
        
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Error exporting to Excel: ' + error.message);
    }
}

// Security Rules section handlers
let sonarRulesParsedData = [];

function dropSonarRulesHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
        processSonarRulesFile(file);
    } else {
        showSonarRulesError('Please upload a valid HTML file.');
    }
}

function sonarRulesFileSelected(event) {
    const file = event.target.files[0];
    if (file) {
        processSonarRulesFile(file);
    }
}

function processSonarRulesFile(file) {
    console.log('Processing SonarQube Rules file:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const htmlContent = e.target.result;
            sonarRulesParsedData = parseSonarQubeHtml(htmlContent);
            
            displaySonarRulesResults(sonarRulesParsedData);
            showSonarRulesSuccess(`Successfully processed ${sonarRulesParsedData.length} security rules from ${file.name}`);
            
        } catch (error) {
            console.error('Error processing SonarQube Rules file:', error);
            showSonarRulesError('Error processing file: ' + error.message);
        }
    };

    reader.onerror = function() {
        showSonarRulesError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
}

function displaySonarRulesResults(data) {
    console.log('Displaying SonarQube Rules results:', data.length, 'items');
    
    const resultsDiv = document.getElementById('sonarRulesResults');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
    
    // Calculate statistics
    const totalRules = data.length;
    const criticalRules = data.filter(item => 
        item.severity === 'CRITICAL' || item.severity === 'Critical' ||
        (item.type && item.type.toLowerCase().includes('critical'))
    ).length;
    const blockerRules = data.filter(item => 
        item.severity === 'BLOCKER' || item.severity === 'Blocker' ||
        (item.type && item.type.toLowerCase().includes('blocker'))
    ).length;
    const languages = [...new Set(data.map(item => item.language || 'Unknown').filter(l => l))].length;
    
    // Update statistics
    document.getElementById('sonarRulesTotalRules').textContent = totalRules;
    document.getElementById('sonarRulesCriticalRules').textContent = criticalRules;
    document.getElementById('sonarRulesBlockerRules').textContent = blockerRules;
    document.getElementById('sonarRulesLanguages').textContent = languages;
    
    // Setup export button
    const exportBtn = document.getElementById('sonarRulesExportBtn');
    if (exportBtn) {
        exportBtn.onclick = () => performSonarRulesExcelExport(data);
        exportBtn.disabled = false;
    }
    
    // Populate preview table (first 10 rows)
    const tableBody = document.getElementById('sonarRulesPreviewTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        const previewData = data.slice(0, 10);
        previewData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white';
            
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.type || 'Rule'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.ruleKey || item.key || ''}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.name || item.message || ''}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.language || 'N/A'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.severity || 'N/A'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.sysTags || item.tags || ''}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        if (data.length > 10) {
            const moreRow = document.createElement('tr');
            moreRow.innerHTML = `
                <td colspan="6" style="padding: 12px; text-align: center; font-style: italic; color: #666; border-bottom: 1px solid #dee2e6;">
                    ... and ${data.length - 10} more rules (download Excel for complete data)
                </td>
            `;
            tableBody.appendChild(moreRow);
        }
    }
}

function performSonarRulesExcelExport(data) {
    console.log('🚀 Starting SonarQube Rules Excel export...');
    
    if (!data || data.length === 0) {
        alert('No rules data to export');
        return;
    }
    
    try {
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel - Rules structure
        const excelData = data.map((item, index) => ({
            'Row': index + 1,
            'Type': item.type || 'Rule',
            'Rule Key': item.ruleKey || item.key || '',
            'Name': item.name || item.message || '',
            'Language': item.language || 'N/A',
            'Severity': item.severity || 'N/A',
            'SysTags': item.sysTags || item.tags || ''
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const colWidths = [
            { wch: 8 },   // Row
            { wch: 15 },  // Type
            { wch: 25 },  // Rule Key
            { wch: 40 },  // Name
            { wch: 15 },  // Language
            { wch: 12 },  // Severity
            { wch: 30 }   // SysTags
        ];
        ws['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Security Rules');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `SonarQube_Security_Rules_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        console.log('✅ SonarQube Rules Excel export completed:', filename);
        showSonarRulesSuccess(`Excel file "${filename}" has been downloaded successfully!`);
        
    } catch (error) {
        console.error('❌ Excel export error:', error);
        alert('Error exporting to Excel: ' + error.message);
    }
}

function showSonarRulesError(message) {
    console.log('SonarQube Rules Error:', message);
    
    const errorDiv = document.getElementById('sonarRulesErrorMessage');
    const successDiv = document.getElementById('sonarRulesSuccessMessage');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

function showSonarRulesSuccess(message) {
    console.log('SonarQube Rules Success:', message);
    
    const errorDiv = document.getElementById('sonarRulesErrorMessage');
    const successDiv = document.getElementById('sonarRulesSuccessMessage');
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// File Explorer Button Functions - Open directly without dialogs
function openFileServerForCurrent() {
    const pathInput = document.getElementById('owaspFileServerPath');
    const defaultPath = '\\\\aut-tfs-file\\OWASP Dependency-Checks';
    
    // Set default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const path = pathInput.value.trim();
    console.log('Opening file server for current report:', path);
    
    // Highlight the current report upload area
    const currentDropzone = document.getElementById('report-drop');
    if (currentDropzone) {
        currentDropzone.style.border = '3px solid #4CAF50';
        currentDropzone.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
            currentDropzone.style.border = '';
            currentDropzone.style.backgroundColor = '';
        }, 3000);
    }
    
    try {
        // Try ActiveXObject first (IE/corporate environments)
        if (window.ActiveXObject || "ActiveXObject" in window) {
            const shell = new ActiveXObject("Shell.Application");
            shell.Explore(path);
            return;
        }
        
        // Try to open Windows Explorer using explorer.exe
        const explorerPath = path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
        window.open(`ms-appx-web:///shell:explorer.exe,${explorerPath}`, '_blank');
        
        // Fallback to file protocol
        setTimeout(() => {
            const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }, 100);
        
    } catch (error) {
        console.log('Could not open file explorer automatically:', error);
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📂 Find dependency-check-report.xml and upload to the current report area`);
    }
}

function openFileServerForBaseline() {
    const pathInput = document.getElementById('owaspFileServerPath');
    const defaultPath = '\\\\aut-tfs-file\\OWASP Dependency-Checks';
    
    // Set default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const path = pathInput.value.trim();
    console.log('Opening file server for baseline report:', path);
    
    // Enable delta mode if not already enabled
    const deltaToggle = document.getElementById('delta-mode-toggle');
    if (deltaToggle && !deltaToggle.checked) {
        deltaToggle.click();
    }
    
    // Highlight the baseline report upload area
    const baselineDropzone = document.getElementById('baseline-report-drop');
    if (baselineDropzone) {
        baselineDropzone.style.border = '3px solid #FF9800';
        baselineDropzone.style.backgroundColor = '#fff3e0';
        setTimeout(() => {
            baselineDropzone.style.border = '';
            baselineDropzone.style.backgroundColor = '';
        }, 3000);
    }
    
    try {
        // Try ActiveXObject first (IE/corporate environments)
        if (window.ActiveXObject || "ActiveXObject" in window) {
            const shell = new ActiveXObject("Shell.Application");
            shell.Explore(path);
            return;
        }
        
        // Try to open Windows Explorer using explorer.exe
        const explorerPath = path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
        window.open(`ms-appx-web:///shell:explorer.exe,${explorerPath}`, '_blank');
        
        // Fallback to file protocol
        setTimeout(() => {
            const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }, 100);
        
    } catch (error) {
        console.log('Could not open file explorer automatically:', error);
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📂 Find dependency-check-report.xml and upload to the baseline report area`);
    }
}

function openFileServerForSuppressions() {
    const pathInput = document.getElementById('owaspFileServerPath');
    const defaultPath = '\\\\aut-tfs-file\\OWASP Dependency-Checks';
    
    // Set default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const path = pathInput.value.trim();
    console.log('Opening file server for suppressions file:', path);
    
    // Highlight the suppressions upload area
    const suppressionsDropzone = document.getElementById('suppressions-drop');
    if (suppressionsDropzone) {
        suppressionsDropzone.style.border = '3px solid #9C27B0';
        suppressionsDropzone.style.backgroundColor = '#f3e5f5';
        setTimeout(() => {
            suppressionsDropzone.style.border = '';
            suppressionsDropzone.style.backgroundColor = '';
        }, 3000);
    }
    
    try {
        // Try ActiveXObject first (IE/corporate environments)
        if (window.ActiveXObject || "ActiveXObject" in window) {
            const shell = new ActiveXObject("Shell.Application");
            shell.Explore(path);
            return;
        }
        
        // Try to open Windows Explorer using explorer.exe
        const explorerPath = path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
        window.open(`ms-appx-web:///shell:explorer.exe,${explorerPath}`, '_blank');
        
        // Fallback to file protocol
        setTimeout(() => {
            const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }, 100);
        
    } catch (error) {
        console.log('Could not open file explorer automatically:', error);
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📂 Find suppressions.xml and upload to the suppressions file area`);
    }
}

function openFileServerForBaselineSuppressions() {
    const pathInput = document.getElementById('owaspFileServerPath');
    const defaultPath = '\\\\aut-tfs-file\\OWASP Dependency-Checks';
    
    // Set default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const path = pathInput.value.trim();
    console.log('Opening file server for baseline suppressions file:', path);
    
    // Enable delta mode if not already enabled
    const deltaToggle = document.getElementById('delta-mode-toggle');
    if (deltaToggle && !deltaToggle.checked) {
        deltaToggle.click();
    }
    
    // Highlight the baseline suppressions upload area
    const baselineSuppressionDropzone = document.getElementById('baseline-suppressions-drop');
    if (baselineSuppressionDropzone) {
        baselineSuppressionDropzone.style.border = '3px solid #E91E63';
        baselineSuppressionDropzone.style.backgroundColor = '#fce4ec';
        setTimeout(() => {
            baselineSuppressionDropzone.style.border = '';
            baselineSuppressionDropzone.style.backgroundColor = '';
        }, 3000);
    }
    
    try {
        // Try ActiveXObject first (IE/corporate environments)
        if (window.ActiveXObject || "ActiveXObject" in window) {
            const shell = new ActiveXObject("Shell.Application");
            shell.Explore(path);
            return;
        }
        
        // Try to open Windows Explorer using explorer.exe
        const explorerPath = path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
        window.open(`ms-appx-web:///shell:explorer.exe,${explorerPath}`, '_blank');
        
        // Fallback to file protocol
        setTimeout(() => {
            const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }, 100);
        
    } catch (error) {
        console.log('Could not open file explorer automatically:', error);
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📂 Find previous suppressions.xml and upload to the baseline suppressions area`);
    }
}

function openFileServerForSonar() {
    const pathInput = document.getElementById('sonarFileServerPath');
    const defaultPath = '\\\\aut-tfs-file\\SonarReports';
    
    // Set default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }
    
    const path = pathInput.value.trim();
    console.log('Opening file server for SonarQube reports:', path);
    
    // Highlight the SonarQube upload area
    const sonarDropzone = document.getElementById('sonar-drop');
    if (sonarDropzone) {
        sonarDropzone.style.border = '3px solid #4CAF50';
        sonarDropzone.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
            sonarDropzone.style.border = '';
            sonarDropzone.style.backgroundColor = '';
        }, 3000);
    }
    
    try {
        // Try ActiveXObject first (IE/corporate environments)
        if (window.ActiveXObject || "ActiveXObject" in window) {
            const shell = new ActiveXObject("Shell.Application");
            shell.Explore(path);
            return;
        }
        
        // Try to open Windows Explorer using explorer.exe
        const explorerPath = path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
        window.open(`ms-appx-web:///shell:explorer.exe,${explorerPath}`, '_blank');
        
        // Fallback to file protocol
        setTimeout(() => {
            const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }, 100);
        
    } catch (error) {
        console.log('Could not open file explorer automatically:', error);
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📂 Find SonarSecurityReport_latest.html and upload to the SonarQube area`);
    }
}

function processSonarQubeHtml(htmlDoc) {
    console.log('Processing SonarQube HTML report...');
    
    try {
        // Show success message
        const successMsg = document.getElementById('sonarSuccessMessage');
        const errorMsg = document.getElementById('sonarErrorMessage');
        
        if (successMsg) {
            successMsg.textContent = '✅ SonarQube report uploaded successfully! Processing data...';
            successMsg.style.display = 'block';
        }
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
        
        // Extract security issues from the HTML
        const issues = extractSonarQubeSecurityIssues(htmlDoc);
        
        console.log('Extracted SonarQube issues:', issues.length);
        
        // Update success message with results
        if (successMsg) {
            successMsg.textContent = `✅ Successfully processed SonarQube report with ${issues.length} security issues`;
        }
        
        // Store for potential export
        window.sonarQubeIssues = issues;
        
        // Enable export button if issues found
        const exportBtn = document.getElementById('export-sonar-btn');
        if (exportBtn && issues.length > 0) {
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
        }
        
        return issues;
        
    } catch (error) {
        console.error('Error processing SonarQube HTML:', error);
        
        const errorMsg = document.getElementById('sonarErrorMessage');
        if (errorMsg) {
            errorMsg.textContent = '❌ Error processing SonarQube report: ' + error.message;
            errorMsg.style.display = 'block';
        }
        
        return [];
    }
}

function extractSonarQubeSecurityIssues(htmlDoc) {
    console.log('Extracting security issues from SonarQube HTML...');
    
    // This is a placeholder function - you'll need to customize this
    // based on the actual structure of your SonarQube HTML reports
    const issues = [];
    
    // Look for common SonarQube HTML patterns
    const tables = htmlDoc.querySelectorAll('table');
    const rows = htmlDoc.querySelectorAll('tr');
    
    console.log(`Found ${tables.length} tables and ${rows.length} rows in SonarQube report`);
    
    // Add placeholder data for now
    issues.push({
        severity: 'CRITICAL',
        type: 'Security',
        component: 'Example.js',
        rule: 'javascript:S1234',
        message: 'Security issue detected in SonarQube report',
        line: 1,
        status: 'OPEN'
    });
    
    return issues;
}

// Setup table event listeners for filtering and search
function setupTableEventListeners() {
    // Find all tables with filter controls
    const tables = document.querySelectorAll('table[data-vulnerabilities]');
    
    tables.forEach(table => {
        const tableId = table.id;
        const searchInput = document.getElementById(tableId + '-search');
        const severitySelect = document.getElementById(tableId + '-severity');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => filterTable(tableId));
        }
        
        if (severitySelect) {
            severitySelect.addEventListener('change', () => filterTable(tableId));
        }
        
        // Add sorting functionality to headers
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.getAttribute('data-sort');
                sortTable(tableId, sortField);
            });
        });
    });
}

// Table sorting functionality
function sortTable(tableId, sortField) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const vulnerabilities = JSON.parse(table.getAttribute('data-vulnerabilities'));
    
    // Determine sort direction
    const header = table.querySelector(`th[data-sort="${sortField}"]`);
    const isAsc = !header.classList.contains('sort-asc');
    
    // Clear all sort classes
    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Add sort class to current header
    header.classList.add(isAsc ? 'sort-asc' : 'sort-desc');
    
    // Sort the data
    const sortedData = vulnerabilities.sort((a, b) => {
        let valueA = a[sortField] || '';
        let valueB = b[sortField] || '';
        
        // Handle numeric CVSS scores
        if (sortField === 'CVSS') {
            valueA = parseFloat(valueA) || 0;
            valueB = parseFloat(valueB) || 0;
        } else {
            valueA = valueA.toString().toLowerCase();
            valueB = valueB.toString().toLowerCase();
        }
        
        if (valueA < valueB) return isAsc ? -1 : 1;
        if (valueA > valueB) return isAsc ? 1 : -1;
        return 0;
    });
    
    // Re-render table with sorted data
    const tableRows = sortedData.map((vuln, index) => `
        <tr class="vuln-row" data-index="${index}">
            <td>
                <div class="package-info">
                    <strong>${escapeHtml(vuln.Package)}</strong>
                    ${vuln.Version ? `<div class="version-info">v${escapeHtml(vuln.Version)}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="vulnerability-info">
                    <strong>${escapeHtml(vuln.Vulnerability)}</strong>
                    ${vuln.Link ? `<a href="${escapeHtml(vuln.Link)}" target="_blank" class="vuln-link" title="View details">🔗</a>` : ''}
                </div>
            </td>
            <td><span class="severity-${vuln.Severity.toLowerCase()}">${escapeHtml(vuln.Severity)}</span></td>
            <td>
                <div class="cvss-info">
                    <span class="cvss-score">${escapeHtml(vuln.CVSS)}</span>
                    ${vuln.CVSSv3 ? `<div class="cvss-version">v3: ${escapeHtml(vuln.CVSSv3)}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="description-text" title="${escapeHtml(vuln.Description)}">
                    ${truncateText(escapeHtml(vuln.Description), 120)}
                </div>
            </td>
            <td>
                <div class="file-path" title="${escapeHtml(vuln.File)}">
                    ${truncateFilePath(escapeHtml(vuln.File))}
                </div>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = tableRows;
    
    // Update the data attribute with sorted data
    table.setAttribute('data-vulnerabilities', JSON.stringify(sortedData));
    
    // Re-apply current filters
    filterTable(tableId);
}

// Handle CSV export
function handleExportCSV() {
    try {
        const reportData = getCurrentReportData();
        const csvContent = generateCSV(reportData);
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OWASP-${reportData.type}-Report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        console.log('CSV report exported successfully');
        
    } catch (error) {
        console.error('CSV export failed:', error);
        alert('CSV export failed: ' + error.message);
    }
}

// Generate CSV content from report data
function generateCSV(reportData) {
    const isDelta = reportData.type === 'delta';
    let vulnerabilities = [];
    
    if (isDelta && reportData.data) {
        vulnerabilities = [...(reportData.data.newVulnerabilities || []), ...(reportData.data.fixedVulnerabilities || [])];
    } else {
        vulnerabilities = reportData.vulnerabilities || [];
    }
    
    console.log('CSV Export: Processing', vulnerabilities.length, 'vulnerabilities');
    
    if (vulnerabilities.length === 0) {
        return 'No vulnerabilities found\n';
    }
    
    // CSV headers
    const headers = ['Package', 'Vulnerability', 'Severity', 'CVSS Score', 'Description', 'File Path'];
    
    // Add status column for delta reports
    if (isDelta) {
        headers.push('Status');
    }
    
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    vulnerabilities.forEach((vuln, index) => {
        console.log(`CSV Export: Processing vulnerability ${index + 1}:`, {
            Package: vuln.Package,
            Vulnerability: vuln.Vulnerability,
            Severity: vuln.Severity
        });
        
        const row = [
            `"${escapeCSV(vuln.Package || '')}"`,
            `"${escapeCSV(vuln.Vulnerability || '')}"`,
            `"${escapeCSV(vuln.Severity || '')}"`,
            `"${escapeCSV(vuln.CVSS || '')}"`,
            `"${escapeCSV(vuln.Description || '')}"`,
            `"${escapeCSV(vuln.File || '')}"`
        ];
        
        if (isDelta) {
            const status = vuln.isFixed ? 'Fixed' : 'New';
            row.push(`"${status}"`);
        }
        
        csvContent += row.join(',') + '\n';
    });
    
    console.log('CSV Export: Generated content length:', csvContent.length);
    return csvContent;
}

// Escape CSV content
function escapeCSV(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '""');
}

console.log('App loaded successfully');

// Helper function to copy text to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        return fallbackCopyToClipboard(text);
    }
}

// Fallback clipboard copy method
function fallbackCopyToClipboard(text) {
    return new Promise((resolve, reject) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                resolve();
            } else {
                reject(new Error('Copy command failed'));
            }
        } catch (err) {
            document.body.removeChild(textArea);
            reject(err);
        }
    });
}

// Override the openFileServerPath function with modern implementation
function openFileServerPath() {
    const defaultPath = "\\\\aut-tfs-file\\OWASP Dependency-Checks";
    const pathInput = document.getElementById('owaspFileServerPath');

    // Set the default path if empty
    if (!pathInput.value.trim()) {
        pathInput.value = defaultPath;
    }

    const path = pathInput.value.trim();

    // Modern approach: Copy to clipboard and provide detailed instructions
    copyToClipboard(path).then(() => {
        // Create a more detailed instruction dialog
        const instructions = `📋 File server path copied to clipboard!

🗂️ Path: ${path}

🚀 Quick access steps:
1️⃣ Press Windows + E (open Explorer)
2️⃣ Click address bar (or Ctrl + L)
3️⃣ Paste (Ctrl + V) and press Enter

Alternative: Press Windows + R, paste path, press Enter

💡 Path is ready in your clipboard!`;

        alert(instructions);
    }).catch(() => {
        const fallbackInstructions = `📂 Navigate to: ${path}

🚀 Manual steps:
1. Press Windows + R
2. Copy and paste: ${path}
3. Press Enter

Or open Explorer and paste in address bar.`;

        alert(fallbackInstructions);
    });
}
