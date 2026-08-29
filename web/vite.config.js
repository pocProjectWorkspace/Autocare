import { defineConfig } from 'vite';

// Clean-URL rewrites: /book → /book.html, /track → /track.html.
// Runs before Vite's file server so both /book and /book.html work.
const cleanUrls = () => ({
    name: 'clean-urls',
    configureServer(server) {
        const map = {
            '/book':  '/book.html',
            '/track': '/track.html',
            '/home':  '/index.html', // marketing landing
        };
        server.middlewares.use((req, _res, next) => {
            const [pathname, query] = (req.url || '').split('?');
            if (map[pathname]) {
                req.url = map[pathname] + (query ? `?${query}` : '');
            }
            next();
        });
    },
});

export default defineConfig({
    plugins: [cleanUrls()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
    },
});
