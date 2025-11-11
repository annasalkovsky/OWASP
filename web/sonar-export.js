// SonarQube HTML Report to Excel Converter
// Clean implementation focused on parsing SonarQube HTML and exporting to Excel

let parsedData = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
}

// Drag and drop handlers
function dropHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
        processFile(file);
    } else {
        showError('Please upload a valid HTML file.');
    }
}

function dragOverHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function dragLeaveHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

// File selection handler
function fileSelected(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    showLoading(true);
    hideMessages();

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const htmlContent = e.target.result;
            parsedData = parseSonarQubeHtml(htmlContent);
            
            if (parsedData.length === 0) {
                throw new Error('No security issues found in the HTML file. Please ensure this is a valid SonarQube report.');
            }

            displayResults(parsedData);
            showSuccess(`Successfully processed ${parsedData.length} security issues from ${file.name}`);
            
        } catch (error) {
            console.error('Error processing file:', error);
            showError('Error processing file: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    reader.onerror = function() {
        showLoading(false);
        showError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
}

function parseSonarQubeHtml(htmlContent) {
    console.log('🔍 Parsing SonarQube HTML content...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find all tables in the document
    const tables = doc.querySelectorAll('table');
    console.log(`📊 Found ${tables.length} tables in HTML`);
    
    if (tables.length === 0) {
        throw new Error('No tables found in HTML file');
    }

    let allData = [];
    
    // Process each table to find the one with security issues
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex];
        const rows = table.querySelectorAll('tr');
        
        console.log(`📋 Table ${tableIndex + 1}: ${rows.length} rows`);
        
        if (rows.length < 2) {
            console.log(`⏭️ Skipping table ${tableIndex + 1}: insufficient rows`);
            continue;
        }

        // Get headers to understand table structure
        const headerRow = rows[0];
        const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => 
            cell.textContent.trim().toLowerCase()
        );
        
        console.log(`📋 Table ${tableIndex + 1} headers:`, headers);

        // Check if this table contains security issues data
        const hasSecurityColumns = headers.some(header => 
            header.includes('key') || header.includes('status') || header.includes('component') || 
            header.includes('project') || header.includes('message') || header.includes('description')
        );

        if (!hasSecurityColumns) {
            console.log(`⏭️ Skipping table ${tableIndex + 1}: doesn't contain security issue columns`);
            continue;
        }

        console.log(`✅ Processing table ${tableIndex + 1} as security issues table`);

        // Find column indices
        const columnMap = {
            key: findColumnIndex(headers, ['key']),
            project: findColumnIndex(headers, ['project']),
            component: findColumnIndex(headers, ['component', 'file', 'path']),
            status: findColumnIndex(headers, ['status', 'state']),
            resolution: findColumnIndex(headers, ['resolution']),
            created: findColumnIndex(headers, ['created', 'date']),
            updated: findColumnIndex(headers, ['updated', 'last updated']),
            message: findColumnIndex(headers, ['message', 'description', 'summary', 'rule'])
        };

        console.log(`📍 Table ${tableIndex + 1} column mapping:`, columnMap);

        // Process data rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td, th');
            
            if (cells.length < 3) continue; // Skip invalid rows

            const issue = {
                key: getCellText(cells, columnMap.key) || `ISSUE-${allData.length + 1}`,
                project: getCellText(cells, columnMap.project) || 'Unknown',
                component: getCellText(cells, columnMap.component) || 'Unknown',
                status: getCellText(cells, columnMap.status) || 'UNKNOWN',
                resolution: getCellText(cells, columnMap.resolution) || '',
                created: getCellText(cells, columnMap.created) || '',
                updated: getCellText(cells, columnMap.updated) || '',
                message: getCellText(cells, columnMap.message) || 'No description available'
            };

            // Clean and normalize the data
            issue.status = issue.status.toUpperCase();
            issue.component = truncateText(issue.component, 100);
            issue.message = truncateText(issue.message, 200);

            allData.push(issue);
        }
        
        console.log(`✅ Table ${tableIndex + 1}: parsed ${rows.length - 1} rows, total data: ${allData.length}`);
    }

    if (allData.length === 0) {
        throw new Error('No security issues data found in any table');
    }

    console.log(`🎉 Successfully parsed ${allData.length} total security issues from ${tables.length} tables`);
    return allData;
}

function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(header => header.includes(name));
        if (index !== -1) return index;
    }
    return -1;
}

function getCellText(cells, index) {
    if (index === -1 || index >= cells.length) return '';
    return cells[index].textContent.trim();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function displayResults(data) {
    // Update statistics
    updateStatistics(data);
    
    // Update preview table
    updatePreviewTable(data);
    
    // Show results section
    document.getElementById('results').style.display = 'block';
}

function updateStatistics(data) {
    const total = data.length;
    const openIssues = data.filter(item => 
        item.status === 'OPEN' || item.status === 'CONFIRMED'
    ).length;
    const resolvedIssues = data.filter(item => 
        item.status === 'RESOLVED' || item.status === 'CLOSED'
    ).length;
    const uniqueComponents = new Set(data.map(item => item.component)).size;

    document.getElementById('totalIssues').textContent = total;
    document.getElementById('openIssues').textContent = openIssues;
    document.getElementById('resolvedIssues').textContent = resolvedIssues;
    document.getElementById('uniqueComponents').textContent = uniqueComponents;
}

function updatePreviewTable(data) {
    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';

    // Show first 20 rows for preview (increased from 10)
    const previewData = data.slice(0, 20);
    
    previewData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.key)}</td>
            <td>${escapeHtml(item.project)}</td>
            <td title="${escapeHtml(item.component)}">${escapeHtml(truncateText(item.component, 40))}</td>
            <td><span class="status ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td>
            <td>${escapeHtml(item.resolution)}</td>
            <td>${escapeHtml(item.created)}</td>
            <td>${escapeHtml(item.updated)}</td>
            <td title="${escapeHtml(item.message)}">${escapeHtml(truncateText(item.message, 50))}</td>
        `;
        tbody.appendChild(row);
    });

    // Add info row if more data exists
    if (data.length > 20) {
        const infoRow = document.createElement('tr');
        infoRow.style.backgroundColor = '#f0f8ff';
        infoRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #2196F3; font-weight: bold; padding: 15px; border: 2px solid #2196F3; border-radius: 5px;">
                📊 PREVIEW: Showing first 20 of ${data.length} total issues<br>
                <small style="font-weight: normal;">Complete dataset with all ${data.length} issues will be exported to Excel</small>
            </td>
        `;
        tbody.appendChild(infoRow);
    } else if (data.length <= 20 && data.length > 0) {
        const infoRow = document.createElement('tr');
        infoRow.style.backgroundColor = '#f0f8f0';
        infoRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #4CAF50; font-weight: bold; padding: 15px;">
                ✅ All ${data.length} issues displayed above
            </td>
        `;
        tbody.appendChild(infoRow);
    }
}

function exportToExcel() {
    if (parsedData.length === 0) {
        showError('No data available for export. Please upload a SonarQube report first.');
        return;
    }

    try {
        console.log('📊 Starting Excel export...');

        // Prepare data for Excel export
        const exportData = parsedData.map(item => ({
            'Issue Key': item.key,
            'Project': item.project,
            'Component': item.component,
            'Status': item.status,
            'Resolution': item.resolution,
            'Created Date': item.created,
            'Updated Date': item.updated,
            'Description': item.message
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 25 }, // Issue Key
            { wch: 20 }, // Project
            { wch: 50 }, // Component
            { wch: 15 }, // Status
            { wch: 20 }, // Resolution
            { wch: 15 }, // Created Date
            { wch: 15 }, // Updated Date
            { wch: 60 }  // Description
        ];
        ws['!cols'] = columnWidths;

        // Define the table range
        const range = XLSX.utils.decode_range(ws['!ref']);
        const tableRef = XLSX.utils.encode_range(range);

        // Create Excel Table structure
        ws['!tables'] = [{
            name: 'SonarQubeData',
            ref: tableRef,
            headerRowCount: 1,
            totalsRowCount: 0,
            style: {
                theme: 'TableStyleMedium9',
                showFirstColumn: false,
                showLastColumn: false,
                showRowStripes: true,
                showColumnStripes: false
            },
            autoFilter: {
                ref: tableRef
            },
            tableColumns: [
                { name: 'Issue Key', dataDxfId: 0 },
                { name: 'Project', dataDxfId: 0 },
                { name: 'Component', dataDxfId: 0 },
                { name: 'Status', dataDxfId: 1 },
                { name: 'Resolution', dataDxfId: 0 },
                { name: 'Created Date', dataDxfId: 0 },
                { name: 'Updated Date', dataDxfId: 0 },
                { name: 'Description', dataDxfId: 0 }
            ]
        }];

        // Apply comprehensive cell styling
        const headerStyle = {
            font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4CAF50" } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
            border: {
                top: { style: 'thin', color: { rgb: "000000" } },
                bottom: { style: 'thin', color: { rgb: "000000" } },
                left: { style: 'thin', color: { rgb: "000000" } },
                right: { style: 'thin', color: { rgb: "000000" } }
            }
        };

        // Apply header styling to all header cells
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
            if (ws[cellRef]) {
                ws[cellRef].s = headerStyle;
            }
        }

        // Apply data cell styling and conditional formatting
        for (let row = 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                if (ws[cellRef]) {
                    let cellStyle = {
                        alignment: { 
                            vertical: 'top', 
                            horizontal: col === 3 ? 'center' : 'left', // Center status column
                            wrapText: col >= 6 // Wrap text for description columns
                        },
                        border: {
                            top: { style: 'thin', color: { rgb: "E0E0E0" } },
                            bottom: { style: 'thin', color: { rgb: "E0E0E0" } },
                            left: { style: 'thin', color: { rgb: "E0E0E0" } },
                            right: { style: 'thin', color: { rgb: "E0E0E0" } }
                        }
                    };

                    // Special formatting for Status column (column D, index 3)
                    if (col === 3) {
                        const status = ws[cellRef].v;
                        cellStyle.font = { bold: true };
                        
                        if (status === 'OPEN' || status === 'CONFIRMED') {
                            cellStyle.fill = { fgColor: { rgb: "FFCDD2" } }; // Light red
                            cellStyle.font.color = { rgb: "C62828" };
                        } else if (status === 'RESOLVED' || status === 'CLOSED') {
                            cellStyle.fill = { fgColor: { rgb: "C8E6C9" } }; // Light green
                            cellStyle.font.color = { rgb: "2E7D32" };
                        } else if (status === 'TO_REVIEW' || status === 'REVIEWED') {
                            cellStyle.fill = { fgColor: { rgb: "FFE0B2" } }; // Light orange
                            cellStyle.font.color = { rgb: "F57C00" };
                        }
                    }

                    ws[cellRef].s = cellStyle;
                }
            }
        }

        // Add autofilter (this creates the dropdown arrows)
        ws['!autofilter'] = { ref: tableRef };

        // Add freeze panes to freeze the header row
        ws['!freeze'] = { 
            xSplit: 0, 
            ySplit: 1, 
            topLeftCell: 'A2', 
            activePane: 'bottomLeft' 
        };

        // Set row heights for better appearance
        ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 25, hpx: 25 }; // Header row height
        for (let i = 1; i <= exportData.length; i++) {
            ws['!rows'][i] = { hpt: 20, hpx: 20 }; // Data row height
        }

        // Add the worksheet to workbook with a descriptive name
        XLSX.utils.book_append_sheet(wb, ws, 'SonarQube Security Issues');

        // Add workbook properties for better metadata
        wb.Props = {
            Title: 'SonarQube Security Report',
            Subject: 'Security Issues Analysis',
            Author: 'SonarQube Export Tool',
            CreatedDate: new Date()
        };

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `SonarQube_Security_Report_${timestamp}.xlsx`;

        // Export the file with table format
        XLSX.writeFileXLSX(wb, filename);

        console.log(`✅ Excel table exported successfully: ${filename}`);
        showSuccess(`📊 Successfully exported ${parsedData.length} issues as Excel Table to ${filename}`);

    } catch (error) {
        console.error('❌ Export error:', error);
        showError('Failed to export Excel file: ' + error.message);
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}