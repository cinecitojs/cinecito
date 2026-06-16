
import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Type declaration for Vite's import.meta.glob to satisfy TypeScript
declare global {
	interface ImportMeta {
		glob<T = any>(pattern: string, options?: { eager?: boolean; as?: string }): Record<string, () => Promise<T>>;
	}
}

// Genera rutas automáticamente desde /src/pages (Vite import.meta.glob)
// Convenciones:
//  - src/pages/index.tsx       -> /
//  - src/pages/about.tsx       -> /about
//  - src/pages/movies/[id].tsx -> /movies/:id
const modules = import.meta.glob('./pages/**/*.{tsx,jsx,ts,js}');

type RouteDef = { path: string; Component: React.LazyExoticComponent<React.ComponentType<any>> };

const routes: RouteDef[] = Object.keys(modules).map((file) => {
	const raw = file
		.replace(/^\.\//, '') // remove leading ./
		.replace(/^pages/, '') // remove pages folder
		.replace(/\.(tsx|jsx|ts|js)$/, '') // remove extension
		.replace(/\/index$/, '') // /index -> /
		|| '/';

	const path = raw === '/' ? '/' : raw;
	const normalized = path.replace(/\[([^\]]+)\]/g, ':$1'); // [id] -> :id
	const Component = lazy(() => modules[file]() as Promise<{ default: React.ComponentType<any> }>);
	return { path: normalized, Component };
}).sort((a, b) => b.path.length - a.path.length);

const NotFound: React.FC = () => <div>404 - Página no encontrada</div>;

const App: React.FC = () => (
	<BrowserRouter>
		<Suspense fallback={<div>Cargando...</div>}>
			<Routes>
				{routes.map(({ path, Component }) => (
					<Route key={path} path={path} element={<Component />} />
				))}
				<Route path="*" element={<NotFound />} />
			</Routes>
		</Suspense>
	</BrowserRouter>
);

const root = document.getElementById('root') ?? document.createElement('div');
if (!root.id) document.body.appendChild(root);
createRoot(root).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

