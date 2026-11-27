import fs from 'fs';
import path from 'path';

const dir = 'src/styles/src';
if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.css'));
    const content = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

    // 1. Vite가 ?inline으로 import할 파일 생성
    fs.writeFileSync('src/styles/nine-table.css', content);

    fs.mkdirSync('dist/css', { recursive: true });
    fs.writeFileSync('dist/css/nine-table.css', content);
    console.log('✨ CSS bundled successfully into dist/css/nine-table.css');
}