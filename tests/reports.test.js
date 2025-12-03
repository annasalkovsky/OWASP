describe('Report Generation Tests', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        const reportDiv = document.createElement('div');
        reportDiv.id = 'reportContent';
        document.body.appendChild(reportDiv);
    });

    test('should generate HTML report structure', () => {
        const generateReport = (data) => {
            return `
                <div class="report-header">
                    <h2>Vulnerability Report</h2>
                    <p>Generated: ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="report-body">
                    ${data.map(item => `<div class="item">${item.name}: ${item.status}</div>`).join('')}
                </div>
            `;
        };

        const mockData = [
            { name: 'Package A', status: 'Secure' },
            { name: 'Package B', status: 'Vulnerable' }
        ];

        const report = generateReport(mockData);
        expect(report).toContain('Vulnerability Report');
        expect(report).toContain('Package A');
        expect(report).toContain('Package B');
    });

    test('should export data to different formats', () => {
        const exportData = (data, format) => {
            switch (format) {
                case 'csv':
                    const headers = Object.keys(data[0] || {}).join(',');
                    const rows = data.map(row => Object.values(row).join(',')).join('\n');
                    return headers + '\n' + rows;
                case 'json':
                    return JSON.stringify(data, null, 2);
                case 'xml':
                    return `<data>${data.map(item => `<item>${Object.entries(item).map(([k,v]) => `<${k}>${v}</${k}>`).join('')}</item>`).join('')}</data>`;
                default:
                    return null;
            }
        };

        const mockData = [{ name: 'test', value: 123 }];

        expect(exportData(mockData, 'csv')).toContain('name,value');
        expect(exportData(mockData, 'json')).toContain('"name": "test"');
        expect(exportData(mockData, 'xml')).toContain('<name>test</name>');
        expect(exportData(mockData, 'invalid')).toBeNull();
    });

    test('should calculate vulnerability statistics', () => {
        const calculateStats = (packages) => {
            let total = 0, high = 0, medium = 0, low = 0, secure = 0;

            packages.forEach(pkg => {
                total++;
                if (pkg.risk === 'high') high++;
                else if (pkg.risk === 'medium') medium++;
                else if (pkg.risk === 'low') low++;
                else secure++;
            });

            return { total, high, medium, low, secure };
        };

        const mockPackages = [
            { name: 'pkg1', risk: 'high' },
            { name: 'pkg2', risk: 'medium' },
            { name: 'pkg3', risk: 'none' },
            { name: 'pkg4', risk: 'low' }
        ];

        const stats = calculateStats(mockPackages);
        expect(stats).toEqual({ total: 4, high: 1, medium: 1, low: 1, secure: 1 });
    });

    test('should filter report data by criteria', () => {
        const filterReportData = (data, criteria) => {
            return data.filter(item => {
                if (criteria.riskLevel && item.risk !== criteria.riskLevel) return false;
                if (criteria.packageName && !item.name.toLowerCase().includes(criteria.packageName.toLowerCase())) return false;
                if (criteria.minVersion && item.version < criteria.minVersion) return false;
                return true;
            });
        };

        const mockData = [
            { name: 'express', risk: 'high', version: '4.0.0' },
            { name: 'lodash', risk: 'medium', version: '4.5.0' },
            { name: 'express-session', risk: 'high', version: '1.2.0' }
        ];

        expect(filterReportData(mockData, { riskLevel: 'high' })).toHaveLength(2);
        expect(filterReportData(mockData, { packageName: 'express' })).toHaveLength(2);
        expect(filterReportData(mockData, { minVersion: '4.0.0' })).toHaveLength(2);
    });

    test('should generate report summaries', () => {
        const generateSummary = (data) => {
            const stats = data.reduce((acc, item) => {
                acc.total++;
                acc.vulnerabilities += item.vulnerabilityCount || 0;
                if (item.critical) acc.critical++;
                return acc;
            }, { total: 0, vulnerabilities: 0, critical: 0 });

            return {
                totalPackages: stats.total,
                totalVulnerabilities: stats.vulnerabilities,
                criticalIssues: stats.critical,
                riskScore: Math.min(100, (stats.vulnerabilities / stats.total) * 10)
            };
        };

        const mockData = [
            { name: 'pkg1', vulnerabilityCount: 3, critical: true },
            { name: 'pkg2', vulnerabilityCount: 0, critical: false },
            { name: 'pkg3', vulnerabilityCount: 1, critical: false }
        ];

        const summary = generateSummary(mockData);
        expect(summary.totalPackages).toBe(3);
        expect(summary.totalVulnerabilities).toBe(4);
        expect(summary.criticalIssues).toBe(1);
        expect(summary.riskScore).toBeCloseTo(13.33, 1);
    });

    test('should handle empty report data', () => {
        const handleEmptyReport = (data) => {
            if (!data || data.length === 0) {
                return {
                    html: '<div class="empty-report">No data available for report generation</div>',
                    isEmpty: true
                };
            }
            return { isEmpty: false };
        };

        expect(handleEmptyReport([]).isEmpty).toBe(true);
        expect(handleEmptyReport(null).isEmpty).toBe(true);
        expect(handleEmptyReport(undefined).isEmpty).toBe(true);
        expect(handleEmptyReport([1]).isEmpty).toBe(false);
    });

    test('should format timestamps correctly', () => {
        const formatTimestamp = (date, format = 'full') => {
            const d = new Date(date);
            switch (format) {
                case 'short':
                    return d.toLocaleDateString();
                case 'time':
                    return d.toLocaleTimeString();
                case 'full':
                default:
                    return d.toLocaleString();
            }
        };

        const testDate = new Date('2023-12-01T10:30:00');
        expect(formatTimestamp(testDate, 'short')).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(formatTimestamp(testDate, 'time')).toMatch(/\d{1,2}:\d{2}:\d{2}/);
        expect(formatTimestamp(testDate, 'full')).toContain('2023');
    });

    test('should create downloadable reports', () => {
        // Mock URL.createObjectURL for testing
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        
        const createDownloadableReport = (data, filename, format) => {
            const content = format === 'json' ? JSON.stringify(data) : data.toString();
            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
            
            return {
                blob,
                filename: `${filename}.${format}`,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        };

        const mockData = { test: 'data' };
        const download = createDownloadableReport(mockData, 'report', 'json');
        
        expect(download.filename).toBe('report.json');
        expect(download.blob).toBeInstanceOf(Blob);
        expect(download.size).toBeGreaterThan(0);
        expect(download.url).toBe('blob:mock-url');
    });

    test('should handle report comparison', () => {
        const compareReports = (reportA, reportB) => {
            const differences = {
                added: [],
                removed: [],
                changed: []
            };

            const packagesA = new Set(reportA.map(p => p.name));
            const packagesB = new Set(reportB.map(p => p.name));

            // Find added packages
            packagesB.forEach(name => {
                if (!packagesA.has(name)) {
                    differences.added.push(name);
                }
            });

            // Find removed packages
            packagesA.forEach(name => {
                if (!packagesB.has(name)) {
                    differences.removed.push(name);
                }
            });

            return differences;
        };

        const reportA = [{ name: 'pkg1' }, { name: 'pkg2' }];
        const reportB = [{ name: 'pkg1' }, { name: 'pkg3' }];

        const diff = compareReports(reportA, reportB);
        expect(diff.added).toContain('pkg3');
        expect(diff.removed).toContain('pkg2');
    });

    test('should validate report content', () => {
        const validateReport = (report) => {
            const errors = [];
            
            if (!report.title) errors.push('Missing report title');
            if (!report.date) errors.push('Missing report date');
            if (!Array.isArray(report.data)) errors.push('Invalid data format');
            if (report.data && report.data.length === 0) errors.push('No data provided');

            return {
                isValid: errors.length === 0,
                errors
            };
        };

        const validReport = { title: 'Test', date: new Date(), data: [1, 2, 3] };
        const invalidReport = { title: '', data: null };

        expect(validateReport(validReport).isValid).toBe(true);
        expect(validateReport(invalidReport).isValid).toBe(false);
        expect(validateReport(invalidReport).errors.length).toBeGreaterThan(0);
    });

});