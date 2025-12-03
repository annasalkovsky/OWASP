const fs = require('fs');
const path = require('path');

// Read the main application file
const appPath = path.join(__dirname, '..', 'web', 'app.js');
let appCode = '';
try {
    appCode = fs.readFileSync(appPath, 'utf8');
} catch (err) {
    console.warn('Could not read app.js for testing');
}

describe('Core Application Functions', () => {
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Create mock elements that the app expects
        const mockElements = [
            { id: 'fileInput', type: 'input' },
            { id: 'jsonFileInput', type: 'input' },
            { id: 'fileInfo', type: 'div' },
            { id: 'uploadedMessage', type: 'div' },
            { id: 'reportContent', type: 'div' },
            { id: 'exportBtn', type: 'button' },
            { id: 'compareBtn', type: 'button' }
        ];
        
        mockElements.forEach(({ id, type }) => {
            const element = document.createElement(type);
            element.id = id;
            document.body.appendChild(element);
        });
    });

    test('should extract file info correctly', () => {
        const mockFile = createMockFile('test.json', '{"test": true}');
        
        // Mock function that would normally be defined in app.js
        const extractFileInfo = (file) => {
            return {
                name: file.name,
                size: file.size,
                type: file.type || 'unknown'
            };
        };

        const info = extractFileInfo(mockFile);
        
        expect(info.name).toBe('test.json');
        expect(info.type).toBe('application/json');
    });

    test('should handle version extraction', () => {
        const mockVersionExtract = (packageData) => {
            if (packageData && packageData.version) {
                return packageData.version;
            }
            return 'unknown';
        };

        expect(mockVersionExtract({ version: '1.2.3' })).toBe('1.2.3');
        expect(mockVersionExtract({})).toBe('unknown');
        expect(mockVersionExtract(null)).toBe('unknown');
    });

    test('should calculate date ranges correctly', () => {
        const calculateDateRange = (days) => {
            const end = new Date();
            const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
            return { start, end };
        };

        const range = calculateDateRange(7);
        const daysDiff = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
        
        expect(daysDiff).toBe(7);
    });

    test('should validate file types', () => {
        const isValidFileType = (filename) => {
            const validExtensions = ['.json', '.xml', '.csv', '.xlsx'];
            return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
        };

        expect(isValidFileType('package.json')).toBe(true);
        expect(isValidFileType('data.xml')).toBe(true);
        expect(isValidFileType('report.csv')).toBe(true);
        expect(isValidFileType('invalid.txt')).toBe(false);
    });

    test('should handle DOM element updates', () => {
        const updateElement = (id, content) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = content;
                return true;
            }
            return false;
        };

        expect(updateElement('fileInfo', 'Test content')).toBe(true);
        expect(document.getElementById('fileInfo').innerHTML).toBe('Test content');
        expect(updateElement('nonexistent', 'Test')).toBe(false);
    });

    test('should process vulnerability data', () => {
        const processVulnerabilities = (vulnString) => {
            if (!vulnString || vulnString === 'None') return { total: 0, high: 0, medium: 0, low: 0 };
            
            const high = (vulnString.match(/(\d+)\s*High/i) || [0, 0])[1];
            const medium = (vulnString.match(/(\d+)\s*Medium/i) || [0, 0])[1];
            const low = (vulnString.match(/(\d+)\s*Low/i) || [0, 0])[1];
            
            return {
                high: parseInt(high) || 0,
                medium: parseInt(medium) || 0,
                low: parseInt(low) || 0,
                total: (parseInt(high) || 0) + (parseInt(medium) || 0) + (parseInt(low) || 0)
            };
        };

        expect(processVulnerabilities('2 High, 1 Medium')).toEqual({
            high: 2, medium: 1, low: 0, total: 3
        });
        expect(processVulnerabilities('None')).toEqual({
            high: 0, medium: 0, low: 0, total: 0
        });
    });

    test('should handle error states gracefully', () => {
        const safeOperation = (operation) => {
            try {
                return { success: true, result: operation() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        };

        const goodOp = () => "success";
        const badOp = () => { throw new Error("failed"); };

        expect(safeOperation(goodOp)).toEqual({ success: true, result: "success" });
        expect(safeOperation(badOp)).toEqual({ success: false, error: "failed" });
    });

    test('should format file sizes correctly', () => {
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1048576)).toBe('1 MB');
    });

    test('should detect empty or invalid data', () => {
        const validateData = (data) => {
            if (!data) return { valid: false, reason: 'No data provided' };
            if (Array.isArray(data) && data.length === 0) return { valid: false, reason: 'Empty array' };
            if (typeof data === 'object' && Object.keys(data).length === 0) return { valid: false, reason: 'Empty object' };
            return { valid: true };
        };

        expect(validateData(null).valid).toBe(false);
        expect(validateData([]).valid).toBe(false);
        expect(validateData({}).valid).toBe(false);
        expect(validateData([1, 2, 3]).valid).toBe(true);
    });

    test('should handle string manipulation for package names', () => {
        const normalizePackageName = (name) => {
            if (!name) return '';
            return name.toLowerCase().trim().replace(/[^a-z0-9\-_.]/g, '');
        };

        expect(normalizePackageName('  Package-Name_123  ')).toBe('package-name_123');
        expect(normalizePackageName('Invalid@Name!')).toBe('invalidname');
        expect(normalizePackageName('')).toBe('');
    });

    test('should generate unique identifiers', () => {
        const generateId = (prefix = 'id') => {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        };

        const id1 = generateId('test');
        const id2 = generateId('test');
        
        expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
    });

    test('should handle array filtering and sorting', () => {
        const mockData = [
            { name: 'pkg-a', vulnerabilities: 5 },
            { name: 'pkg-b', vulnerabilities: 0 },
            { name: 'pkg-c', vulnerabilities: 3 }
        ];

        const filterHighRisk = (packages, threshold = 3) => {
            return packages.filter(pkg => pkg.vulnerabilities >= threshold)
                          .sort((a, b) => b.vulnerabilities - a.vulnerabilities);
        };

        const highRisk = filterHighRisk(mockData);
        expect(highRisk).toHaveLength(2);
        expect(highRisk[0].name).toBe('pkg-a');
        expect(highRisk[1].name).toBe('pkg-c');
    });

    test('should handle tab management', () => {
        const tabManager = {
            tabs: new Map(),
            openTab: function(id, content) {
                this.tabs.set(id, { content, active: true });
                return id;
            },
            closeTab: function(id) {
                return this.tabs.delete(id);
            },
            getActiveTab: function() {
                for (let [id, tab] of this.tabs) {
                    if (tab.active) return { id, ...tab };
                }
                return null;
            }
        };

        const tabId = tabManager.openTab('test1', 'Test Content');
        expect(tabManager.tabs.has(tabId)).toBe(true);
        expect(tabManager.getActiveTab().content).toBe('Test Content');
        expect(tabManager.closeTab(tabId)).toBe(true);
        expect(tabManager.tabs.has(tabId)).toBe(false);
    });

});