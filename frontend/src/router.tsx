import { createBrowserRouter, Navigate, Outlet } from 'react-router';

import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { InstanceDetailPage } from './pages/InstanceDetail';
import { Instances } from './pages/Instances';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <Outlet />
      </Layout>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: '/instances', element: <Instances /> },
      { path: '/instances/:id', element: <InstanceDetailPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
