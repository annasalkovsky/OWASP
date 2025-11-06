// OWASP Dependency Audit Tool - Delta Toggle Fix

console.log('App loading...');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready - setting up delta toggle');
    
    const deltaToggle = document.getElementById('delta-mode-toggle');
    const generateBtn = document.getElementById('generate-btn');
    
    if (deltaToggle) {
        function updateDeltaMode() {
            const isDeltaMode = deltaToggle.checked;
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
    
    // Add basic button handlers
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            alert('Generate button clicked - functionality to be implemented');
        });
    }
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            alert('Export button clicked - functionality to be implemented');
        });
    }
});

console.log('App loaded successfully');
