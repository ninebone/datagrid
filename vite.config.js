import { defineConfig } from 'vite';
import path, { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
    define: {
        '__APP_VERSION__': JSON.stringify(pkg.version)
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),          // 🎯 @를 src 경로로 절대 경로 설정
            '@nopeer': path.resolve(__dirname, './src/external/NoPeer.js')
        }
    },
    esbuild: {
        keepNames: true,
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'NineTable',
            fileName: (format) => `nine-table.${format === 'es' ? 'js' : 'umd.js'}`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            // @ninebone/util을 외부 종속성으로 처리하여 번들에서 분리
            external: ['@ninebone/util'],
            output: {
                globals: {
                    //'@ninebone/util': 'NineboneUtil'
                    '@ninebone/util': 'nine'
                }
            }
        },
        sourcemap: true,
        emptyOutDir: true
    },
    minify: 'terser',
});