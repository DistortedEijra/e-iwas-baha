import { useState } from 'react';
import { StatsBar } from '../components/admin/StatsBar';
import { SegmentControl } from '../components/admin/SegmentControl';
import { EvacCenterControl } from '../components/admin/EvacCenterControl';
import { ReportLog } from '../components/admin/ReportLog';

type Tab = 'roads' | 'centers' | 'reports';

export function AdminPage() {
  const [inputToken, setInputToken] = useState('');
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('roads');
  const [loginError, setLoginError] = useState('');

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${inputToken}` },
    });
    if (res.ok) {
      setToken(inputToken);
      setLoginError('');
    } else {
      setLoginError('Invalid token. Please check ADMIN_TOKEN and try again.');
    }
  }

  if (!token) {
    return (
      <div className="admin-login-wrap">
        <div className="login-box">
          <h2>E-Iwas Baha Admin</h2>
          <p className="login-sub">LGU / Operations Access</p>
          <form onSubmit={login}>
            <input
              type="password"
              placeholder="Admin token"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="btn-admin-primary">Sign in</button>
          </form>
          {loginError && <p className="error-msg">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <span className="admin-logo">E-Iwas Baha — Admin</span>
        <button className="btn-logout" onClick={() => setToken('')}>Sign out</button>
      </header>

      <StatsBar token={token} />

      <div className="admin-tabs">
        <button
          className={`tab-btn ${tab === 'roads' ? 'tab-active' : ''}`}
          onClick={() => setTab('roads')}
        >
          Road Control
        </button>
        <button
          className={`tab-btn ${tab === 'centers' ? 'tab-active' : ''}`}
          onClick={() => setTab('centers')}
        >
          Evac Centers
        </button>
        <button
          className={`tab-btn ${tab === 'reports' ? 'tab-active' : ''}`}
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
      </div>

      <div className="admin-body">
        {tab === 'roads' && <SegmentControl token={token} />}
        {tab === 'centers' && <EvacCenterControl token={token} />}
        {tab === 'reports' && <ReportLog token={token} />}
      </div>
    </div>
  );
}
