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
    // Set up file input listeners
    setupFileInput('report-file', 'report', 'report-progress');
    setupFileInput('suppressions-file', 'suppressions', 'suppressions-progress');
    setupFileInput('baseline-report-file', 'baseline-report', 'baseline-progress');
    setupFileInput('baseline-suppressions-file', 'baseline-suppressions', 'baseline-suppressions-progress');
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
    console.log('Uploading file:', file.name, 'Type:', type);
    
    // Show progress bar
    const progressBar = document.getElementById(progressId);
    if (progressBar) {
        progressBar.style.display = 'block';
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        
        if (progressText) {
            progressText.textContent = 'Loading 0%';
        }
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
                alert('Delta report generation - functionality will be implemented');
            } else {
                if (!dependencyXml) {
                    alert('Please upload a dependency report first');
                    return;
                }
                alert('Audit report generation - functionality will be implemented');
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            alert('Export functionality will be implemented');
        });
    }
    
    if (emailBtn) {
        emailBtn.addEventListener('click', function() {
            alert('Email functionality will be implemented');
        });
    }
}

console.log('App loaded successfully');
