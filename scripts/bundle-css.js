import fs from 'fs';
import path from 'path';

const dir = 'src/css';
if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.css'));
    const content = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

    fs.mkdirSync('dist/css', { recursive: true });
    fs.writeFileSync('dist/css/nine-table.css', content);
    console.log('✨ CSS bundled successfully into dist/css/nine-table.css');
}