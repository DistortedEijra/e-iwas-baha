import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { UatPage } from './pages/UatPage.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/uat" element={<UatPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
