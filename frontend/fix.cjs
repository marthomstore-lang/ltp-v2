const fs = require('fs');
const file = 'src/components/StudentWindow.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = 'let months = today.getMonth() - birthDate.getMonth();\r\n  let days = today.getDate() - birthDate.getDate();\r\n\r\n  if (days < 0) {\r\n    months--;\r\n    const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);\r\n    days += previousMonth.getDate();\r\n  }\r\n\r\n  if (months < 0) {\r\n    years--;\r\n    months += 12;\r\n  }\r\n\r\n  return ${years} aos,  meses y  das;\r\n}';
const backupStr = 'let months = today.getMonth()';

// Using indexOf and replacing everything up to the next export
const startIdx = content.indexOf(backupStr);
const endIdx = content.indexOf('export function calculateExactAge', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    fs.writeFileSync(file, content);
    console.log('Fixed successfully');
} else {
    console.log('Could not find start/end bounds', startIdx, endIdx);
}
