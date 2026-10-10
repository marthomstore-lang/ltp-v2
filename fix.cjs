const fs = require('fs');
const file = 'frontend/src/components/StudentWindow.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /  const today = new Date\(\);\s+let years = today\.getFullYear\(\) - birthDate\.getFullYear\(\);\s+let months = today\.getMonth\(\) - birthDate\.getMonth\(\);\s+let days = today\.getDate\(\) - birthDate\.getDate\(\);\s+if \(days < 0\) \{\s+months--;\s+const previousMonth = new Date\(today\.getFullYear\(\), today\.getMonth\(\), 0\);\s+days \+= previousMonth\.getDate\(\);\s+\}\s+if \(months < 0\) \{\s+years--;\s+months \+= 12;\s+\}\s+return \$\{years\} aos,  meses y  das;\n\}/;

content = content.replace(regex, '');
// Also remove any dangling text if we accidentally orphaned a function block
// The easiest way is to just grab the file and rewrite lines 50 to 80 carefully.
