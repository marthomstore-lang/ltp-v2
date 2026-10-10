const fs = require('fs');
const file = 'src/components/StudentWindow.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const cleanEnrollmentVal = \(val: any\) => \{\r?\n  if \(\!val\) return '';\r?\n  const s = String\(val\)\.trim\(\);\r?\n  if \(s === 'null' \|\| s === 'undefined'\) return '';\r?\n  return s;\r?\n\};\r?\n[\s\S]*?export function calculateExactAge/;

content = content.replace(regex, `const cleanEnrollmentVal = (val: any) => {
  if (!val) return '';
  const s = String(val).trim();
  if (s === 'null' || s === 'undefined') return '';
  return s;
};

export function calculateExactAge`);

fs.writeFileSync(file, content);
