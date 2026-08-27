/**
 * src/App.jsx
 * ────────────
 * TanStack Router instance with manually-declared route tree.
 * File-based routing follows the exact directory layout specified.
 */

import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

// Route components
import RootLayout  from './routes/__root'
import Dashboard   from './routes/index'
import InspectPage from './routes/inspect'
import HistoryPage from './routes/history'
import DetailsPage from './routes/details.$id'

// ── Route tree ────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout })

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

const inspectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspect',
  component: InspectPage,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
})

const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/details/$id',
  component: DetailsPage,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  inspectRoute,
  historyRoute,
  detailsRoute,
])

// ── Router instance ───────────────────────────────────────────────────────────

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// ── App component ─────────────────────────────────────────────────────────────

export default function App() {
  return <RouterProvider router={router} />
}
