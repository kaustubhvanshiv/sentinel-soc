import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Database,
  Search,
  LayoutDashboard,
  Bell,
  Settings,
  User,
  Menu,
  X,
  Terminal,
  Globe,
  LogOut,
  Users
} from 'lucide-react';
import { io } from 'socket.io-client';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Logs from './pages/Logs';
import Intelligence from './pages/Intelligence';
import AlertDetails from './pages/AlertDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';

const socket = io();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newAlertCount, setNewAlertCount] = useState(0);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }

    socket.on('new_alert', (alert) => {
      setNewAlertCount(prev => prev + 1);
    });
    return () => { socket.off('new_alert'); };
  }, []);

  const handleLogin = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onRegister={handleLogin} onNavigateToLogin={() => setShowRegister(false)} />;
    }
    return <Login onLogin={handleLogin} onNavigateToRegister={() => setShowRegister(true)} />;
  }

  const renderContent = () => {
    if (selectedAlertId) {
      return <AlertDetails id={selectedAlertId} onBack={() => setSelectedAlertId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard onAlertClick={(id) => setSelectedAlertId(id)} />;
      case 'alerts': return <Alerts onAlertClick={(id) => setSelectedAlertId(id)} />;
      case 'logs': return <Logs />;
      case 'intelligence': return <Intelligence />;
      case 'admin': return currentUser?.role === 'admin' ? <AdminDashboard /> : <Dashboard onAlertClick={(id) => setSelectedAlertId(id)} />;
      default: return <Dashboard onAlertClick={(id) => setSelectedAlertId(id)} />;
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(id); setSelectedAlertId(null); setNewAlertCount(0); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === id && !selectedAlertId
        ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {id === 'alerts' && newAlertCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
          {newAlertCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 flex flex-col`}>
        <div className="p-6 flex items-center gap-3 border-bottom border-zinc-800">
          <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
            <Shield className="text-zinc-950" size={24} />
          </div>
          {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-white">SENTINEL<span className="text-emerald-500">SOC</span></h1>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="alerts" icon={Bell} label="Alerts" />
          <NavItem id="logs" icon={Terminal} label="Log Explorer" />
          <NavItem id="intelligence" icon={Globe} label="IP Intelligence" />
          {currentUser?.role === 'admin' && (
            <NavItem id="admin" icon={Users} label="Admin Panel" />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate capitalize">{currentUser?.role || 'Analyst'}</p>
                <p className="text-xs text-zinc-500 truncate">{currentUser?.email || 'user@sentinel'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors ${!isSidebarOpen && 'justify-center'}`}
            title="Sign Out"
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
              {selectedAlertId ? 'Incident Investigation' : activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ONLINE
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
