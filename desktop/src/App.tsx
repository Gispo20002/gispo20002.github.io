import React, { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import DrivesPage from './pages/DrivesPage';
import ChargesPage from './pages/ChargesPage';
import './App.css';

type Page = 'dashboard' | 'drives' | 'charges';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">TeslApp</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
            { id: 'drives', label: 'Percorsi', icon: '🚗' },
            { id: 'charges', label: 'Ricariche', icon: '⚡' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id as Page)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="footer-text">v1.0.0</span>
        </div>
      </aside>

      {/* Contenuto principale */}
      <main className="main-content">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'drives' && <DrivesPage />}
        {page === 'charges' && <ChargesPage />}
      </main>
    </div>
  );
}
