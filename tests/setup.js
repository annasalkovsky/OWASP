// Global test setup and mocks
const fs = require('fs');
const path = require('path');

// Mock XLSX library
global.XLSX = {
    read: jest.fn(),
    utils: {
        sheet_to_json: jest.fn(() => [
            { Package: 'example-package', Version: '1.0.0', Vulnerabilities: '2 High, 1 Medium' },
            { Package: 'test-lib', Version: '2.1.0', Vulnerabilities: 'None' }
        ]),
        json_to_sheet: jest.fn(),
        book_new: jest.fn(() => ({ Sheets: {}, SheetNames: [] })),
        book_append_sheet: jest.fn(),
        writeFile: jest.fn()
    },
    writeFile: jest.fn()
};

// Mock FileReader
global.FileReader = class {
    constructor() {
        this.result = null;
        this.onload = null;
        this.onerror = null;
    }
    
    readAsArrayBuffer() {
        setTimeout(() => {
            this.result = new ArrayBuffer(8);
            if (this.onload) this.onload({ target: this });
        }, 0);
    }
    
    readAsText() {
        setTimeout(() => {
            this.result = '{"dependencies": {"example": "1.0.0"}}';
            if (this.onload) this.onload({ target: this });
        }, 0);
    }
};

// Mock DOMParser
global.DOMParser = class {
    parseFromString(str, type) {
        return {
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(() => null)
        };
    }
};

// Create mock file helper
global.createMockFile = (name, content, type = 'application/json') => {
    const blob = new Blob([content], { type });
    blob.name = name;
    return blob;
};

// Mock window.open for tab functionality
global.openTab = jest.fn();

module.exports = {};