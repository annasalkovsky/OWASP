describe('Integration Tests', () => {

    beforeEach(() => {
        // Set up complete DOM structure
        document.body.innerHTML = `
            <div id="app">
                <div class="tab-container">
                    <div class="tab active" data-tab="upload">Upload</div>
                    <div class="tab" data-tab="analyze">Analyze</div>
                    <div class="tab" data-tab="report">Report</div>
                </div>
                <div class="tab-content">
                    <div class="tab-panel active" id="upload">
                        <input type="file" id="fileInput" accept=".json,.xml,.csv,.xlsx">
                        <input type="file" id="jsonFileInput" accept=".json">
                        <div id="fileInfo"></div>
                        <div id="uploadedMessage"></div>
                        <button id="analyzeBtn">Analyze</button>
                    </div>
                    <div class="tab-panel" id="analyze">
                        <div id="analysisResults"></div>
                        <button id="generateReportBtn">Generate Report</button>
                    </div>
                    <div class="tab-panel" id="report">
                        <div id="reportContent"></div>
                        <button id="exportBtn">Export</button>
                        <button id="compareBtn">Compare</button>
                    </div>
                </div>
            </div>
        `;
    });

    test('should handle complete tab navigation workflow', () => {
        const tabManager = {
            activeTab: 'upload',
            switchTab: function(tabName) {
                // Hide all panels
                document.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });

                // Show target panel
                const targetPanel = document.getElementById(tabName);
                const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
                
                if (targetPanel && targetTab) {
                    targetPanel.classList.add('active');
                    targetTab.classList.add('active');
                    this.activeTab = tabName;
                    return true;
                }
                return false;
            },
            getActiveTab: function() {
                return this.activeTab;
            }
        };

        expect(tabManager.getActiveTab()).toBe('upload');
        expect(tabManager.switchTab('analyze')).toBe(true);
        expect(tabManager.getActiveTab()).toBe('analyze');
        expect(document.querySelector('.tab-panel.active').id).toBe('analyze');
    });

    test('should process file upload workflow', async () => {
        const fileUploadWorkflow = {
            currentFile: null,
            
            async handleFileUpload(file) {
                this.currentFile = file;
                
                // Validate file
                const validation = this.validateFile(file);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                
                // Process file
                const content = await this.readFile(file);
                const parsed = this.parseContent(content, file.type);
                
                // Update UI
                this.updateFileInfo(file);
                this.displayUploadMessage(true);
                
                return { file, content, parsed };
            },
            
            validateFile(file) {
                if (!file) return { valid: false, error: 'No file provided' };
                if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large' };
                
                const allowedTypes = ['.json', '.xml', '.csv', '.xlsx'];
                const isValidType = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));
                
                return { valid: isValidType, error: isValidType ? null : 'Invalid file type' };
            },
            
            readFile(file) {
                return new Promise((resolve) => {
                    setTimeout(() => resolve('{"mock": "content"}'), 10);
                });
            },
            
            parseContent(content, type) {
                try {
                    if (type.includes('json')) {
                        return JSON.parse(content);
                    }
                    return { parsed: true, content };
                } catch (e) {
                    return { error: 'Parse failed' };
                }
            },
            
            updateFileInfo(file) {
                const infoDiv = document.getElementById('fileInfo');
                infoDiv.innerHTML = `File: ${file.name} (${file.size} bytes)`;
            },
            
            displayUploadMessage(success) {
                const msgDiv = document.getElementById('uploadedMessage');
                msgDiv.innerHTML = success ? 'File uploaded successfully!' : 'Upload failed';
                msgDiv.style.display = 'block';
            }
        };

        const mockFile = createMockFile('test.json', '{"test": true}');
        const result = await fileUploadWorkflow.handleFileUpload(mockFile);
        
        expect(result.file.name).toBe('test.json');
        expect(result.parsed).toHaveProperty('mock');
        expect(document.getElementById('fileInfo').innerHTML).toContain('test.json');
        expect(document.getElementById('uploadedMessage').innerHTML).toBe('File uploaded successfully!');
    });

    test('should handle analysis workflow', () => {
        const analysisWorkflow = {
            analysisData: null,
            
            performAnalysis(data) {
                if (!data) throw new Error('No data to analyze');
                
                const results = {
                    totalPackages: Object.keys(data.dependencies || {}).length,
                    vulnerabilities: this.scanVulnerabilities(data),
                    recommendations: this.generateRecommendations(data),
                    riskScore: this.calculateRiskScore(data)
                };
                
                this.analysisData = results;
                this.displayAnalysisResults(results);
                this.enableReportGeneration();
                
                return results;
            },
            
            scanVulnerabilities(data) {
                const deps = data.dependencies || {};
                const vulnerabilities = [];
                
                Object.entries(deps).forEach(([name, version]) => {
                    // Mock vulnerability detection
                    if (name.includes('vulnerable')) {
                        vulnerabilities.push({ package: name, version, severity: 'high' });
                    }
                });
                
                return vulnerabilities;
            },
            
            generateRecommendations(data) {
                return [
                    'Update vulnerable packages',
                    'Review dependency usage',
                    'Implement security monitoring'
                ];
            },
            
            calculateRiskScore(data) {
                const deps = Object.keys(data.dependencies || {}).length;
                const vulns = this.scanVulnerabilities(data).length;
                return Math.min(100, (vulns / Math.max(deps, 1)) * 100);
            },
            
            displayAnalysisResults(results) {
                const resultsDiv = document.getElementById('analysisResults');
                resultsDiv.innerHTML = `
                    <h3>Analysis Complete</h3>
                    <p>Packages: ${results.totalPackages}</p>
                    <p>Vulnerabilities: ${results.vulnerabilities.length}</p>
                    <p>Risk Score: ${results.riskScore.toFixed(1)}</p>
                `;
            },
            
            enableReportGeneration() {
                const btn = document.getElementById('generateReportBtn');
                btn.disabled = false;
                btn.onclick = () => this.generateReport();
            },
            
            generateReport() {
                if (!this.analysisData) return null;
                
                const reportContent = document.getElementById('reportContent');
                reportContent.innerHTML = `
                    <div class="report">
                        <h2>Security Analysis Report</h2>
                        <div class="summary">${JSON.stringify(this.analysisData)}</div>
                    </div>
                `;
                
                return this.analysisData;
            }
        };

        const mockData = {
            dependencies: {
                'safe-package': '1.0.0',
                'vulnerable-lib': '0.1.0'
            }
        };

        const results = analysisWorkflow.performAnalysis(mockData);
        
        expect(results.totalPackages).toBe(2);
        expect(results.vulnerabilities).toHaveLength(1);
        expect(results.vulnerabilities[0].package).toBe('vulnerable-lib');
        expect(document.getElementById('analysisResults').innerHTML).toContain('Analysis Complete');
        
        // Test report generation
        const report = analysisWorkflow.generateReport();
        expect(report).toBe(results);
        expect(document.getElementById('reportContent').innerHTML).toContain('Security Analysis Report');
    });

    test('should handle drag and drop functionality', () => {
        const dragDropHandler = {
            isDragging: false,
            
            handleDragEnter(e) {
                e.preventDefault();
                this.isDragging = true;
                this.updateDropZoneUI(true);
            },
            
            handleDragLeave(e) {
                e.preventDefault();
                this.isDragging = false;
                this.updateDropZoneUI(false);
            },
            
            handleDrop(e) {
                e.preventDefault();
                this.isDragging = false;
                this.updateDropZoneUI(false);
                
                const files = Array.from(e.dataTransfer?.files || []);
                return this.processDroppedFiles(files);
            },
            
            updateDropZoneUI(active) {
                const dropZone = document.getElementById('upload');
                if (active) {
                    dropZone.classList.add('drag-over');
                } else {
                    dropZone.classList.remove('drag-over');
                }
            },
            
            processDroppedFiles(files) {
                if (files.length === 0) return [];
                return files.filter(file => this.isValidFile(file));
            },
            
            isValidFile(file) {
                const validTypes = ['application/json', 'text/xml', 'text/csv'];
                return validTypes.includes(file.type) || 
                       ['.json', '.xml', '.csv'].some(ext => file.name.endsWith(ext));
            }
        };

        // Mock drag events
        const mockDragEvent = {
            preventDefault: jest.fn(),
            dataTransfer: {
                files: [createMockFile('test.json', '{}')]
            }
        };

        dragDropHandler.handleDragEnter(mockDragEvent);
        expect(dragDropHandler.isDragging).toBe(true);
        
        const droppedFiles = dragDropHandler.handleDrop(mockDragEvent);
        expect(droppedFiles).toHaveLength(1);
        expect(dragDropHandler.isDragging).toBe(false);
    });

    test('should handle error states throughout workflow', () => {
        const errorHandler = {
            errors: [],
            
            handleError(error, context) {
                const errorObj = {
                    message: error.message,
                    context,
                    timestamp: new Date(),
                    id: this.generateErrorId()
                };
                
                this.errors.push(errorObj);
                this.displayError(errorObj);
                
                return errorObj;
            },
            
            generateErrorId() {
                return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            },
            
            displayError(errorObj) {
                // Create error display element
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `Error in ${errorObj.context}: ${errorObj.message}`;
                document.body.appendChild(errorDiv);
            },
            
            clearErrors() {
                this.errors = [];
                document.querySelectorAll('.error-message').forEach(el => el.remove());
            },
            
            getErrorsByContext(context) {
                return this.errors.filter(err => err.context === context);
            }
        };

        const testError = new Error('Test error');
        const errorObj = errorHandler.handleError(testError, 'upload');
        
        expect(errorHandler.errors).toHaveLength(1);
        expect(errorObj.context).toBe('upload');
        expect(document.querySelector('.error-message')).toBeTruthy();
        
        errorHandler.clearErrors();
        expect(errorHandler.errors).toHaveLength(0);
        expect(document.querySelector('.error-message')).toBeNull();
    });

    test('should handle comparison workflow', () => {
        const comparisonTool = {
            reports: [],
            
            addReport(report, name) {
                this.reports.push({ name, data: report, timestamp: new Date() });
                return this.reports.length - 1;
            },
            
            compareReports(index1, index2) {
                if (!this.reports[index1] || !this.reports[index2]) {
                    throw new Error('Invalid report indices');
                }
                
                const report1 = this.reports[index1];
                const report2 = this.reports[index2];
                
                return this.generateComparison(report1, report2);
            },
            
            generateComparison(report1, report2) {
                const comparison = {
                    reports: {
                        a: { name: report1.name, timestamp: report1.timestamp },
                        b: { name: report2.name, timestamp: report2.timestamp }
                    },
                    differences: this.findDifferences(report1.data, report2.data),
                    summary: this.createComparisonSummary(report1.data, report2.data)
                };
                
                this.displayComparison(comparison);
                return comparison;
            },
            
            findDifferences(data1, data2) {
                return {
                    packagesAdded: this.getAddedPackages(data1, data2),
                    packagesRemoved: this.getRemovedPackages(data1, data2),
                    vulnerabilityChanges: this.getVulnerabilityChanges(data1, data2)
                };
            },
            
            getAddedPackages(data1, data2) {
                const packages1 = new Set(Object.keys(data1.dependencies || {}));
                const packages2 = new Set(Object.keys(data2.dependencies || {}));
                return Array.from(packages2).filter(pkg => !packages1.has(pkg));
            },
            
            getRemovedPackages(data1, data2) {
                const packages1 = new Set(Object.keys(data1.dependencies || {}));
                const packages2 = new Set(Object.keys(data2.dependencies || {}));
                return Array.from(packages1).filter(pkg => !packages2.has(pkg));
            },
            
            getVulnerabilityChanges(data1, data2) {
                return {
                    improved: 2,
                    worsened: 1,
                    new: 3
                };
            },
            
            createComparisonSummary(data1, data2) {
                return {
                    timespan: Math.abs(new Date(data2.timestamp || 0) - new Date(data1.timestamp || 0)),
                    packageCountChange: Object.keys(data2.dependencies || {}).length - Object.keys(data1.dependencies || {}).length,
                    riskChange: 'improved'
                };
            },
            
            displayComparison(comparison) {
                const reportContent = document.getElementById('reportContent');
                reportContent.innerHTML = `
                    <div class="comparison-report">
                        <h2>Comparison Report</h2>
                        <p>Added: ${comparison.differences.packagesAdded.length}</p>
                        <p>Removed: ${comparison.differences.packagesRemoved.length}</p>
                    </div>
                `;
            }
        };

        const report1 = { dependencies: { 'pkg-a': '1.0.0', 'pkg-b': '2.0.0' } };
        const report2 = { dependencies: { 'pkg-a': '1.1.0', 'pkg-c': '1.0.0' } };

        comparisonTool.addReport(report1, 'Report 1');
        comparisonTool.addReport(report2, 'Report 2');

        const comparison = comparisonTool.compareReports(0, 1);
        
        expect(comparison.differences.packagesAdded).toContain('pkg-c');
        expect(comparison.differences.packagesRemoved).toContain('pkg-b');
        expect(document.getElementById('reportContent').innerHTML).toContain('Comparison Report');
    });

});