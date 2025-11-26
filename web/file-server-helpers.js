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
    
    // Simply open Windows Explorer to the path
    try {
        // Method 1: Use Windows Shell if available (IE/Edge)
        try {
            const shell = new ActiveXObject("WScript.Shell");
            shell.Run(`explorer.exe "${path}"`);
            return;
        } catch (activexError) {
            console.log('ActiveX not available, using file protocol');
        }
        
        // Method 2: Use file protocol as fallback
        const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
        window.open(fileUrl, '_blank');
        
    } catch (error) {
        console.log('Could not open file explorer automatically');
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
    
    // Simply open Windows Explorer to the path
    try {
        // Method 1: Use Windows Shell if available (IE/Edge)
        try {
            const shell = new ActiveXObject("WScript.Shell");
            shell.Run(`explorer.exe "${path}"`);
            return;
        } catch (activexError) {
            console.log('ActiveX not available, using file protocol');
        }
        
        // Method 2: Use file protocol as fallback
        const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
        window.open(fileUrl, '_blank');
        
    } catch (error) {
        console.log('Could not open file explorer automatically');
    }
}