const fs = require('fs');
const path = require('path');

const content = '/api/*  /.netlify/functions/api  200\n/*      /index.html              200';
const publicDir = path.join(process.cwd(), 'public');
const filePath = path.join(publicDir, '_redirects');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully wrote _redirects to public/_redirects');
