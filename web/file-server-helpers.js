// Additional File Server Helper Functions for Manual Upload Areas
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
        // Try to open Windows Explorer to the path
        const explorerPath = path.replace(/\\\\\\\\/g, '\\').replace(/\\/g, '/');
        const fileUrl = `file:///${explorerPath.replace(/^\\/, '')}`;
        window.open(fileUrl, '_blank');
        
        setTimeout(() => {
            alert(`📂 Opening file server for CURRENT report:\n\n${path}\n\n📋 Look for: dependency-check-report.xml\n✅ Drag the file to the GREEN highlighted area\n\n💡 If folder didn't open automatically:\n1. Press Windows+R\n2. Type: ${path}\n3. Press Enter`);
        }, 500);
        
    } catch (error) {
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📋 Find dependency-check-report.xml and upload to the current report area`);
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
    
    // Show the baseline section if hidden
    const deltaSection = document.getElementById('delta-uploads');
    if (deltaSection && deltaSection.style.display === 'none') {
        deltaSection.style.display = 'block';
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
        // Try to open Windows Explorer to the path
        const explorerPath = path.replace(/\\\\\\\\/g, '\\').replace(/\\/g, '/');
        const fileUrl = `file:///${explorerPath.replace(/^\\/, '')}`;
        window.open(fileUrl, '_blank');
        
        setTimeout(() => {
            alert(`📂 Opening file server for BASELINE report:\n\n${path}\n\n📊 Look for: dependency-check-report.xml (from previous build)\n✅ Drag the file to the ORANGE highlighted area\n\n💡 If folder didn't open automatically:\n1. Press Windows+R\n2. Type: ${path}\n3. Press Enter`);
        }, 500);
        
    } catch (error) {
        alert(`Please open Windows Explorer and navigate to:\n\n${path}\n\n📊 Find dependency-check-report.xml from previous build and upload to the baseline area`);
    }
}