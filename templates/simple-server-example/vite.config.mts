import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
	plugins: [react({ tsDecorators: true })],
	root: path.join(__dirname, 'src/client'),
	publicDir: path.join(__dirname, 'public'),
	server: {
		port: 5757,
		host: '0.0.0.0', // Expose on all network interfaces
		allowedHosts: [
			'tldraw.ngx.zw-lab.net',
			'localhost',
			'10.2.100.21'
		],
		// Handle client-side routing
		historyApiFallback: true,
	},
	optimizeDeps: {
		exclude: ['@tldraw/assets'],
	},
}))
