# OWASP Security Report Generator

A web-based tool for generating comprehensive security reports from OWASP security scan XML files. This application allows you to upload multiple XML security scan files, apply suppressions, and generate detailed HTML reports.

## 🚀 Live Demo

Visit the live application: [Enterprise GitHub](https://anna.github.io/OWASP-Dependency-Audit-Tool/)

## ✨ Features

- **Multi-file Upload**: Support for multiple XML security scan files
- **Drag & Drop Interface**: Easy file upload with drag and drop functionality
- **Suppressions Support**: Apply suppression files to filter out false positives
- **Multiple Report Formats**: Generate HTML and JSON reports
- **Risk Analysis**: Categorize vulnerabilities by risk level (High, Medium, Low)
- **Responsive Design**: Works on desktop and mobile devices
- **No Server Required**: Pure client-side application

## 🛠️ Supported Security Scanners

This tool supports XML output from various security scanners including:

- **OWASP ZAP** (Zed Attack Proxy)
- **OWASP Dependency-Check**
- **Other OWASP-compatible XML formats**

## 📋 How to Use

### 1. Upload Security Scan Files
- Click on the "Upload Security Scan XML" area or drag and drop your XML files
- You can upload multiple scan files at once
- Supported formats: `.xml`

### 2. Upload Suppressions (Optional)
- Click on the "Upload Suppressions File" area to add a suppressions XML file
- This will filter out known false positives from your report

### 3. Generate Report
- Click the "Generate Security Report" button
- The application will parse the XML files, apply suppressions, and generate a comprehensive report

### 4. Download Results
- Download the report as an HTML file for sharing
- Export raw data as JSON for further processing

## 🏗️ Local Development

### Prerequisites
- Node.js 14+ (optional, for development server)
- Modern web browser

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/annasalkovsky/OWASP.git
   cd OWASP/web
   ```

2. **Option A: Open directly in browser**
   - Simply open `index.html` in your web browser
   - No build process required for basic functionality

3. **Option B: Use development server (recommended)**
   ```bash
   npm install
   npm run dev
   ```
   This will start a local server at `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run serve` - Start production server
- `npm run build` - Build for production (copies files to dist/)
- `npm run deploy` - Prepare for deployment

## 📁 Project Structure

```
web/
├── index.html          # Main HTML file with UI
├── app.js             # Application logic and XML parsing
├── styles.css         # Styling and responsive design
├── package.json       # Node.js dependencies and scripts
└── README.md          # This file
```

## 🔧 Configuration

### XML Format Requirements

The application expects XML files in standard OWASP formats. Common structures supported:

**OWASP ZAP Format:**
```xml
<OWASPZAPReport>
  <site>
    <alerts>
      <alertitem>
        <pluginname>Vulnerability Name</pluginname>
        <riskdesc>High (Confidence: Medium)</riskdesc>
        <desc>Description</desc>
        <uri>http://example.com</uri>
        <solution>Recommended solution</solution>
      </alertitem>
    </alerts>
  </site>
</OWASPZAPReport>
```

**Dependency-Check Format:**
```xml
<analysis>
  <dependencies>
    <dependency>
      <vulnerabilities>
        <vulnerability>
          <name>CVE-2021-1234</name>
          <severity>HIGH</severity>
          <description>Description</description>
        </vulnerability>
      </vulnerabilities>
    </dependency>
  </dependencies>
</analysis>
```

### Suppressions Format

Suppressions should follow the OWASP Dependency-Check format:

```xml
<suppressions>
  <suppress>
    <notes>False positive - library not used in production</notes>
    <cve>CVE-2021-1234</cve>
    <filePath>path/to/file</filePath>
  </suppress>
</suppressions>
```

## 🚀 Deployment

### GitHub Pages (Automated)

This repository is configured for automatic deployment to GitHub Pages:

1. Push changes to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Site will be available at your enterprise GitHub Pages URL

### Manual Deployment

To deploy to any static hosting service:

1. Upload the contents of the `web/` folder
2. Ensure `index.html` is accessible as the main page
3. No server-side processing required

## 🔒 Security & Privacy

- **Client-Side Processing**: All file processing happens in your browser
- **No Data Upload**: Files are never sent to external servers
- **Privacy Focused**: Your security scan data remains on your device

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/annasalkovsky/OWASP/issues) page
2. Create a new issue with:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Sample XML files (if possible)

## 📊 Changelog

### Version 1.0.0
- Initial release
- Support for OWASP ZAP and Dependency-Check XML formats
- HTML and JSON report generation
- Suppressions support
- Responsive web design
- GitHub Pages deployment

## 🙏 Acknowledgments

- [OWASP Foundation](https://owasp.org/) for security tools and standards
- [OWASP ZAP](https://zaproxy.org/) for web application security testing
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) for dependency vulnerability detection

---

**Built with ❤️ for the security community**