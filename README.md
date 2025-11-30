# OWASP Dependency Audit Tool

A professional web-based tool that transforms OWASP dependency-check XML reports into beautiful, audit-ready security reports with powerful delta comparison capabilities.

## 🚀 **Live Demo**
- **🌐 Live OWASP Tool**: [https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/web/index.html](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/web/index.html) - **Download and open locally for full functionality**
- **Enterprise Repository**: [imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool)
- **Interactive Demo**: [Download Demo](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/demo/index.html) (right-click → Save As → open locally)
- **Quick Start**: Clone the repository and open `web/index.html` in your browser for immediate use

## ✨ **Key Features**

### 📊 **Beautiful Security Reports**
- Color-coded vulnerability severity levels (Critical, High, Medium, Low)
- Interactive filtering and search capabilities
- Detailed CVSS score integration
- Professional audit-ready formatting

### 🔄 **Delta Comparison Mode**
- **Track Progress**: Compare current vs baseline reports
- **Fixed Vulnerabilities**: See exactly what issues were resolved
- **New Vulnerabilities**: Identify newly discovered security issues
- **Suppression Changes**: Monitor configuration modifications

### 📤 **Export & Sharing**
- **Interactive HTML Export**: Self-contained reports with full functionality
- **CSV Export**: Data-ready format for analysis
- **Email Integration**: Send summaries directly to your team
- **Offline Capable**: All processing happens in your browser

### 🛡️ **Privacy & Security**
- **Client-side Processing**: Your data never leaves your browser
- **No External Dependencies**: Works completely offline
- **OWASP Standards**: Built for OWASP dependency-check compliance

## 🎯 **How It Works**

1. **Upload Files**: Drag & drop your `dependency-check-report.xml` and optional `suppressions.xml`
2. **Generate Report**: Click to create your professional security dashboard  
3. **Delta Analysis** *(Optional)*: Enable delta mode and upload baseline files for comparison
4. **Export & Share**: Download HTML reports, export CSV data, or email summaries

## 🔧 **Delta Comparison Workflow**

Perfect for tracking security improvements across development cycles:

```
Baseline Scan → Apply Fixes → New Scan → Delta Report
     ↓              ↓            ↓          ↓
  Upload as     Fix Issues    Upload as   See What's
  Baseline                    Current     Fixed/New
```

## 📁 **File Structure**

```
├── web/
│   ├── index.html          # Main application
│   ├── app.js             # Core logic & delta comparison
│   └── styles.css         # Professional styling
├── demo/
│   ├── index.html         # Interactive demo presentation
│   └── README.md         # Demo documentation
├── .github/workflows/
│   └── deploy.yml        # Auto-deployment to GitHub Pages
└── README.md             # This file
```

## 🚀 **Quick Start**

### Option 1: Local Development (Recommended)
```bash
git clone https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool.git
cd OWASP-Dependency-Audit-Tool/web
# Open index.html in your browser - works immediately with full functionality!
```

### Option 2: Direct Download
- **Main Tool**: [Download web/index.html](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/web/index.html) → Save → Open in browser
- **Demo**: [Download demo/index.html](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/demo/index.html) → Save → Open in browser

### Option 3: Enterprise Deployment
Deploy to your internal web server or set up GitHub Pages on your enterprise GitHub.

### Option 3: Deploy Your Own
- Fork this repository
- Enable GitHub Pages in your repository settings
- Point to the `web/` folder as your source

## 📋 **Sample Workflow**

1. **Run OWASP Dependency Check** on your project
2. **Generate XML Report**: `dependency-check-report.xml`
3. **Create Suppressions** *(if needed)*: `suppressions.xml`
4. **Upload to Tool**: Drag files to upload zones
5. **Generate Report**: Professional dashboard with metrics
6. **Export Results**: Share with stakeholders
7. **Track Progress**: Use delta mode for continuous monitoring

## 🎬 **Demo & Showcase**

- **🌐 Live OWASP Tool**: **[Download Main Tool](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/web/index.html)** - **Right-click → Save As → open in browser**
- **Enterprise Repository**: [View source code and documentation](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool)
- **Interactive Demo**: [Download Demo Presentation](https://imd-soft.ghe.com/anna/OWASP-Dependency-Audit-Tool/raw/main/demo/index.html) - save and open locally
- **Best Experience**: Clone the repository and open `web/index.html` - works immediately with all features!
- **Demo Files**: Complete presentation and examples included in repository

## 🤝 **Contributing**

This is an open-source project. Contributions welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes  
4. Push to the branch
5. Open a Pull Request

## 📜 **License**

This project is open source and available under the MIT License.

## 🙋‍♀️ **About**

Created by Anna Salkovsky at iMD-soft for streamlined security vulnerability reporting and delta analysis. Perfect for enterprise development teams who need professional, audit-ready security reports with progress tracking capabilities.

**Enterprise Features:**
- 🏢 Internal deployment ready
- 🔐 Enterprise security compliance
- 🚀 Scalable for team collaboration
- 📊 Comprehensive audit reporting