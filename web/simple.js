// Security Report Analyzer - OWASP & SonarQube
let allData = [];
let filteredData = [];
let owaspData = [];
let filteredOwaspData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Event listeners
    document.getElementById('htmlFile').addEventListener('change', handleSonarFileUpload);
    document.getElementById('owaspFile').addEventListener('change', handleOwaspFileUpload);
    document.getElementById('exportBtn').addEventListener('click', exportSonarToExcel);
    document.getElementById('owaspExportBtn').addEventListener('click', exportOwaspToExcel);
    
    // SonarQube filter event listeners
    document.getElementById('statusFilter').addEventListener('change', applySonarFilters);
    document.getElementById('projectFilter').addEventListener('change', applySonarFilters);
    document.getElementById('componentFilter').addEventListener('change', applySonarFilters);
    
    // OWASP filter event listeners
    document.getElementById('owaspSeverityFilter').addEventListener('change', applyOwaspFilters);
    
    // Hide results sections initially
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('owaspResults').style.display = 'none';
});

function handleSonarFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 SonarQube file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const htmlContent = e.target.result;
        processSonarHtmlFile(htmlContent);
    };
    
    reader.readAsText(file);
}

function handleOwaspFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 OWASP file selected:', file.name);
    
    // For demo - in real implementation, parse the actual file
    owaspData = [
        { component: 'Example.jar', vulnerability: 'CVE-2023-1234', severity: 'HIGH', description: 'Sample high severity vulnerability' },
        { component: 'Library.dll', vulnerability: 'CVE-2023-5678', severity: 'MEDIUM', description: 'Sample medium severity vulnerability' },
        { component: 'Framework.exe', vulnerability: 'CVE-2023-9012', severity: 'LOW', description: 'Sample low severity vulnerability' }
    ];
    
    applyOwaspFilters();
    displayOwaspResults();
}

function processSonarHtmlFile(htmlContent) {
    showLoading(true);
    
    setTimeout(() => {
        try {
            console.log('🔍 Processing SonarQube HTML content...');
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            const table = doc.querySelector('table');
            if (!table) {
                throw new Error('No table found in HTML file');
            }
            
            allData = parseTable(table);
            
            if (allData.length === 0) {
                throw new Error('No data found in table');
            }
            
            console.log(`✅ Successfully parsed ${allData.length} SonarQube items`);
            
            setupSonarFilters();
            applySonarFilters();
            displaySonarResults();
            
        } catch (error) {
            console.error('❌ Error processing SonarQube file:', error);
            showError('Error processing SonarQube file: ' + error.message);
        } finally {
            showLoading(false);
        }
    }, 500);
}

function parseTable(table) {
    const data = [];
    
    try {
        // Get headers
        const headers = [];
        const headerRow = table.querySelector('thead tr, tr:first-child');
        if (headerRow) {
            headerRow.querySelectorAll('th, td').forEach(header => {
                headers.push(header.textContent.trim().toLowerCase());
            });
        }
        
        console.log('📋 Table headers:', headers);
        
        // Determine table type and parse accordingly
        const isSecurityIssues = headers.includes('key') && headers.includes('project');
        const isSecurityRules = headers.includes('rule key') && headers.includes('language');
        
        if (isSecurityIssues) {
            return parseSecurityIssuesTable(table, headers);
        } else if (isSecurityRules) {
            return parseSecurityRulesTable(table, headers);
        } else {
            return parseGenericTable(table, headers);
        }
        
    } catch (error) {
        console.error('Error parsing table:', error);
        return [];
    }
}

function parseSecurityIssuesTable(table, headers) {
    const data = [];
    
    // Find column indices
    const keyIndex = findColumnIndex(headers, ['key']);
    const projectIndex = findColumnIndex(headers, ['project']);
    const componentIndex = findColumnIndex(headers, ['component']);
    const statusIndex = findColumnIndex(headers, ['status']);
    const resolutionIndex = findColumnIndex(headers, ['resolution']);
    const createdIndex = findColumnIndex(headers, ['created']);
    const updatedIndex = findColumnIndex(headers, ['updated']);
    const messageIndex = findColumnIndex(headers, ['message']);
    
    // Process data rows
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        // Skip header row if no thead
        if (index === 0 && !table.querySelector('thead')) return;
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        
        const item = {
            key: getCellText(cells, keyIndex) || `issue-${index}`,
            project: getCellText(cells, projectIndex) || 'Unknown',
            component: getCellText(cells, componentIndex) || 'Unknown',
            status: getCellText(cells, statusIndex) || 'UNKNOWN',
            resolution: getCellText(cells, resolutionIndex) || '',
            created: getCellText(cells, createdIndex) || '',
            updated: getCellText(cells, updatedIndex) || '',
            message: getCellText(cells, messageIndex) || 'No description',
            type: 'Security Issue'
        };
        
        data.push(item);
    });
    
    return data;
}

function parseSecurityRulesTable(table, headers) {
    const data = [];
    
    // Find column indices
    const typeIndex = findColumnIndex(headers, ['type']);
    const ruleKeyIndex = findColumnIndex(headers, ['rule key', 'rulekey']);
    const nameIndex = findColumnIndex(headers, ['name']);
    const languageIndex = findColumnIndex(headers, ['language', 'lang']);
    const severityIndex = findColumnIndex(headers, ['severity']);
    
    // Process data rows
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        // Skip header row if no thead
        if (index === 0 && !table.querySelector('thead')) return;
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        
        const item = {
            key: getCellText(cells, ruleKeyIndex) || `rule-${index}`,
            project: 'Security Rules',
            component: getCellText(cells, nameIndex) || 'Unknown Rule',
            status: 'ACTIVE',
            resolution: getCellText(cells, severityIndex) || 'UNKNOWN',
            created: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString().split('T')[0],
            message: `${getCellText(cells, typeIndex)} - ${getCellText(cells, nameIndex)} (${getCellText(cells, languageIndex)})`,
            type: 'Security Rule'
        };
        
        data.push(item);
    });
    
    return data;
}

function parseGenericTable(table, headers) {
    const data = [];
    
    // Process data rows
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        // Skip header row if no thead
        if (index === 0 && !table.querySelector('thead')) return;
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        
        const item = {
            key: getCellText(cells, 0) || `item-${index}`,
            project: getCellText(cells, 1) || 'Unknown',
            component: getCellText(cells, 2) || 'Unknown',
            status: getCellText(cells, 3) || 'UNKNOWN',
            resolution: getCellText(cells, 4) || '',
            created: getCellText(cells, 5) || '',
            updated: getCellText(cells, 6) || '',
            message: getCellText(cells, 7) || 'No description',
            type: 'Generic Item'
        };
        
        data.push(item);
    });
    
    return data;
}

function findColumnIndex(headers, possibleNames) {
    for (let name of possibleNames) {
        const index = headers.findIndex(header => header.includes(name));
        if (index !== -1) return index;
    }
    return -1;
}

function getCellText(cells, index) {
    if (index === -1 || index >= cells.length) return '';
    return cells[index].textContent.trim();
}

function setupSonarFilters() {
    // Get unique values for filters
    const projects = [...new Set(allData.map(item => item.project))].sort();
    const components = [...new Set(allData.map(item => item.component))].sort();
    
    // Populate project filter
    const projectFilter = document.getElementById('projectFilter');
    projectFilter.innerHTML = '<option value="">All Projects</option>';
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });
    
    // Populate component filter (limit to first 50 for performance)
    const componentFilter = document.getElementById('componentFilter');
    componentFilter.innerHTML = '<option value="">All Components</option>';
    components.slice(0, 50).forEach(component => {
        const option = document.createElement('option');
        option.value = component;
        option.textContent = component.length > 50 ? component.substring(0, 50) + '...' : component;
        componentFilter.appendChild(option);
    });
}

function applySonarFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const projectFilter = document.getElementById('projectFilter').value;
    const componentFilter = document.getElementById('componentFilter').value;
    
    filteredData = allData.filter(item => {
        return (!statusFilter || item.status === statusFilter) &&
               (!projectFilter || item.project === projectFilter) &&
               (!componentFilter || item.component === componentFilter);
    });
    
    updateSonarTable();
    updateSonarStats();
}

function applyOwaspFilters() {
    const severityFilter = document.getElementById('owaspSeverityFilter').value;
    
    filteredOwaspData = owaspData.filter(item => {
        return !severityFilter || item.severity === severityFilter;
    });
    
    updateOwaspStats();
}

function updateSonarTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    
    // Limit display to first 1000 rows for performance
    const displayData = filteredData.slice(0, 1000);
    
    displayData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.key)}</td>
            <td>${escapeHtml(item.project)}</td>
            <td title="${escapeHtml(item.component)}">${escapeHtml(truncateText(item.component, 40))}</td>
            <td><span class="status-${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td>
            <td>${escapeHtml(item.resolution)}</td>
            <td>${escapeHtml(item.created)}</td>
            <td>${escapeHtml(item.updated)}</td>
            <td title="${escapeHtml(item.message)}">${escapeHtml(truncateText(item.message, 60))}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Show info if data was truncated
    if (filteredData.length > 1000) {
        const infoRow = document.createElement('tr');
        infoRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #666; font-style: italic; padding: 20px;">
                Showing first 1000 of ${filteredData.length} items. Use filters to narrow down results.
            </td>
        `;
        tbody.appendChild(infoRow);
    }
}

function updateSonarStats() {
    const total = filteredData.length;
    const open = filteredData.filter(item => item.status === 'OPEN' || item.status === 'CONFIRMED').length;
    const resolved = filteredData.filter(item => item.status === 'RESOLVED' || item.status === 'CLOSED').length;
    const uniqueComponents = new Set(filteredData.map(item => item.component)).size;
    
    document.getElementById('totalIssues').textContent = total;
    document.getElementById('openIssues').textContent = open;
    document.getElementById('resolvedIssues').textContent = resolved;
    document.getElementById('components').textContent = uniqueComponents;
}

function updateOwaspStats() {
    const total = filteredOwaspData.length;
    const high = filteredOwaspData.filter(item => item.severity === 'HIGH').length;
    const medium = filteredOwaspData.filter(item => item.severity === 'MEDIUM').length;
    const low = filteredOwaspData.filter(item => item.severity === 'LOW').length;
    
    document.getElementById('owaspTotal').textContent = total;
    document.getElementById('owaspHigh').textContent = high;
    document.getElementById('owaspMedium').textContent = medium;
    document.getElementById('owaspLow').textContent = low;
}

function displaySonarResults() {
    document.getElementById('resultsSection').style.display = 'block';
}

function displayOwaspResults() {
    document.getElementById('owaspResults').style.display = 'block';
}

function showLoading(show) {
    document.getElementById('loadingSection').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    const content = document.querySelector('.content');
    content.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function exportSonarToExcel() {
    try {
        console.log('📊 Exporting SonarQube to Excel...');
        
        const exportData = filteredData.map(item => ({
            'Key': item.key,
            'Project': item.project,
            'Component': item.component,
            'Status': item.status,
            'Resolution': item.resolution,
            'Created': item.created,
            'Updated': item.updated,
            'Message': item.message,
            'Type': item.type || 'Security Issue'
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Enhanced column widths
        const colWidths = [
            { wch: 25 }, // Key
            { wch: 20 }, // Project  
            { wch: 50 }, // Component
            { wch: 15 }, // Status
            { wch: 20 }, // Resolution
            { wch: 15 }, // Created
            { wch: 15 }, // Updated
            { wch: 60 }, // Message
            { wch: 20 }  // Type
        ];
        ws['!cols'] = colWidths;
        
        // Apply header styling
        const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'];
        headerCells.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4472C4" } },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
                    border: {
                        top: { style: 'thin', color: { rgb: "000000" } },
                        bottom: { style: 'thin', color: { rgb: "000000" } },
                        left: { style: 'thin', color: { rgb: "000000" } },
                        right: { style: 'thin', color: { rgb: "000000" } }
                    }
                };
            }
        });
        
        // Apply data cell formatting and conditional formatting for status
        for (let row = 2; row <= exportData.length + 1; row++) {
            // Status column (D) conditional formatting
            const statusCell = `D${row}`;
            if (ws[statusCell]) {
                const status = ws[statusCell].v;
                let cellStyle = {
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: "CCCCCC" } },
                        bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                        left: { style: 'thin', color: { rgb: "CCCCCC" } },
                        right: { style: 'thin', color: { rgb: "CCCCCC" } }
                    }
                };
                
                if (status === 'OPEN' || status === 'CONFIRMED') {
                    cellStyle.fill = { fgColor: { rgb: "FFEBEE" } };
                    cellStyle.font = { color: { rgb: "C62828" }, bold: true };
                } else if (status === 'RESOLVED' || status === 'CLOSED') {
                    cellStyle.fill = { fgColor: { rgb: "E8F5E8" } };
                    cellStyle.font = { color: { rgb: "2E7D32" }, bold: true };
                } else if (status === 'TO_REVIEW' || status === 'REVIEWED') {
                    cellStyle.fill = { fgColor: { rgb: "FFF3E0" } };
                    cellStyle.font = { color: { rgb: "F57C00" }, bold: true };
                }
                
                ws[statusCell].s = cellStyle;
            }
            
            // Apply borders to all data cells
            const dataCells = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I'];
            dataCells.forEach(col => {
                const cell = `${col}${row}`;
                if (ws[cell]) {
                    ws[cell].s = {
                        alignment: { vertical: 'top', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: "CCCCCC" } },
                            bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                            left: { style: 'thin', color: { rgb: "CCCCCC" } },
                            right: { style: 'thin', color: { rgb: "CCCCCC" } }
                        }
                    };
                }
            });
        }
        
        // Add autofilter
        ws['!autofilter'] = { ref: `A1:I${exportData.length + 1}` };
        
        // Freeze header row
        ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
        
        XLSX.utils.book_append_sheet(wb, ws, 'SonarQube Security Report');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `SonarQube_Security_Report_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ SonarQube Excel file exported: ${filename}`);
        showSuccessMessage(`✅ Exported ${filteredData.length} SonarQube items to formatted Excel with filters and styling`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showError('Export failed: ' + error.message);
    }
}

function exportOwaspToExcel() {
    try {
        console.log('📊 Exporting OWASP to Excel...');
        
        const exportData = filteredOwaspData.map(item => ({
            'Component': item.component,
            'Vulnerability': item.vulnerability,
            'Severity': item.severity,
            'Description': item.description
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Enhanced column widths
        const colWidths = [
            { wch: 50 }, // Component
            { wch: 25 }, // Vulnerability
            { wch: 15 }, // Severity
            { wch: 70 }  // Description
        ];
        ws['!cols'] = colWidths;
        
        // Apply header styling
        const headerCells = ['A1', 'B1', 'C1', 'D1'];
        headerCells.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "FF9800" } },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
                    border: {
                        top: { style: 'thin', color: { rgb: "000000" } },
                        bottom: { style: 'thin', color: { rgb: "000000" } },
                        left: { style: 'thin', color: { rgb: "000000" } },
                        right: { style: 'thin', color: { rgb: "000000" } }
                    }
                };
            }
        });
        
        // Apply data cell formatting and conditional formatting for severity
        for (let row = 2; row <= exportData.length + 1; row++) {
            // Severity column (C) conditional formatting
            const severityCell = `C${row}`;
            if (ws[severityCell]) {
                const severity = ws[severityCell].v;
                let cellStyle = {
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { bold: true },
                    border: {
                        top: { style: 'thin', color: { rgb: "CCCCCC" } },
                        bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                        left: { style: 'thin', color: { rgb: "CCCCCC" } },
                        right: { style: 'thin', color: { rgb: "CCCCCC" } }
                    }
                };
                
                if (severity === 'HIGH') {
                    cellStyle.fill = { fgColor: { rgb: "FFEBEE" } };
                    cellStyle.font = { color: { rgb: "C62828" }, bold: true };
                } else if (severity === 'MEDIUM') {
                    cellStyle.fill = { fgColor: { rgb: "FFF3E0" } };
                    cellStyle.font = { color: { rgb: "F57C00" }, bold: true };
                } else if (severity === 'LOW') {
                    cellStyle.fill = { fgColor: { rgb: "E8F5E8" } };
                    cellStyle.font = { color: { rgb: "2E7D32" }, bold: true };
                }
                
                ws[severityCell].s = cellStyle;
            }
            
            // Apply borders to other data cells
            const dataCells = ['A', 'B', 'D'];
            dataCells.forEach(col => {
                const cell = `${col}${row}`;
                if (ws[cell]) {
                    ws[cell].s = {
                        alignment: { vertical: 'top', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: "CCCCCC" } },
                            bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                            left: { style: 'thin', color: { rgb: "CCCCCC" } },
                            right: { style: 'thin', color: { rgb: "CCCCCC" } }
                        }
                    };
                }
            });
        }
        
        // Add autofilter
        ws['!autofilter'] = { ref: `A1:D${exportData.length + 1}` };
        
        // Freeze header row
        ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
        
        XLSX.utils.book_append_sheet(wb, ws, 'OWASP Vulnerabilities');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `OWASP_Vulnerabilities_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ OWASP Excel file exported: ${filename}`);
        showSuccessMessage(`✅ Exported ${filteredOwaspData.length} OWASP vulnerabilities to formatted Excel with filters and styling`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showError('Export failed: ' + error.message);
    }
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 500;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}