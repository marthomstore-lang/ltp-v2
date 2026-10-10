const fs = require('fs');
const file = 'src/components/PersonalityReportsModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const printRegex = /@media print\s*\{[\s\S]*?\}\s*\}\s*`\}<\/style>/;
const replacement = `@media print {
          body, html {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          .app-sidebar, .sidebar, .header, .nav, .app-header, .no-print, .tab-buttons, .admin-sidebar, .header-container {
            display: none !important;
          }
          #root, .app-container, .main-content, .dashboard-container, .dashboard-layout, .module-wrapper, .admin-layout, .admin-content {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .personality-print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .personality-printable-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 0 2rem 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
        }
      \`}</style>`;

if (printRegex.test(content)) {
    content = content.replace(printRegex, replacement);
    fs.writeFileSync(file, content);
    console.log('Fixed PersonalityReportsModule print CSS');
} else {
    console.log('Regex not matched in PersonalityReportsModule');
}
