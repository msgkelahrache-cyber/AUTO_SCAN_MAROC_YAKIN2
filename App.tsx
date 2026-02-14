import React, { Component, useState, useEffect, useMemo, ErrorInfo, ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ChatExpert from './components/ChatExpert';
import AnalysisResult from './components/AnalysisResult';
import Auth from './components/Auth';
import HistoryView from './components/HistoryView';
import AdminConfig from './components/AdminConfig';
import { ScanResult, User, AppLocation, AppSettings } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: Explicitly extending React.Component to resolve TypeScript error where 'props' property was not found on type 'ErrorBoundary'
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full animate-in zoom-in">
            <AlertCircle size={64} className="text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-slate-900 mb-4 italic tracking-tighter uppercase">Erreur de Rendu</h1>
            <p className="text-slate-500 mb-8 font-medium text-sm">Une erreur inattendue est survenue dans l'interface.</p>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"
            >
              <RefreshCw size={20} /> RÉINITIALISER L'APPLICATION
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const INITIAL_USERS: User[] = [{
  id: '1', username: 'admin', password: 'MTIzNA==', name: 'Administrateur', role: 'admin', avatar: 'default',
  permissions: { dashboard: true, scanner: true, history: true, chat: true, configGlobal: true, configCompany: true, configLocations: true, configUsers: true }
}];

const DEFAULT_SETTINGS: AppSettings = {
  duplicateThresholdHours: 24, 
  monthlyTarget: 100,
  companyName: 'AUTO EXPERT MAROC', 
  appName: 'VIN SCAN PRO', 
  language: 'fr'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [locations, setLocations] = useState<AppLocation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedScans = localStorage.getItem('v4_scans');
      const savedUsers = localStorage.getItem('v4_users');
      const savedLocs = localStorage.getItem('v4_locs');
      const savedSettings = localStorage.getItem('v4_settings');
      
      if (savedScans) {
        const parsed = JSON.parse(savedScans);
        setScans(parsed.filter((s: any) => s && s.id && s.analysis));
      }
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      
      if (savedLocs) {
        setLocations(JSON.parse(savedLocs));
      } else {
        setLocations([{ id: 'default-1', name: 'SIÈGE / DÉPÔT' }]);
      }
      
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });

      const session = localStorage.getItem('v4_session');
      if (session) setUser(JSON.parse(session));
    } catch (e) {
      console.error("Hydration Error", e);
    }
  }, []);
  
  useEffect(() => { 
    localStorage.setItem('v4_scans', JSON.stringify(scans.map(s => ({...s, imageUrl: ""})))); 
  }, [scans]);
  
  useEffect(() => { localStorage.setItem('v4_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('v4_locs', JSON.stringify(locations)); }, [locations]);
  useEffect(() => { localStorage.setItem('v4_settings', JSON.stringify(settings)); }, [settings]);

  const currentSelectedScan = useMemo(() => 
    scans.find(s => s.id === selectedScanId) || null
  , [scans, selectedScanId]);

  const handleSelectScan = (scan: ScanResult) => {
    setSelectedScanId(scan.id);
  };

  if (!user) {
    return (
      <Auth 
        users={users} 
        onLogin={(u) => { setUser(u); localStorage.setItem('v4_session', JSON.stringify(u)); }} 
        companyName={settings.companyName} 
        appName={settings.appName} 
        language={settings.language} 
      />
    );
  }

  const renderContent = () => {
    if (selectedScanId && currentSelectedScan) {
      return (
        <AnalysisResult 
          result={currentSelectedScan} 
          onBack={() => setSelectedScanId(null)} 
          language={settings.language} 
          onUpdateScan={(s) => setScans(prev => prev.map(o => o.id === s.id ? s : o))} 
        />
      );
    }
    switch (activeTab) {
      case 'dashboard': return <Dashboard scans={scans} onSelectScan={handleSelectScan} language={settings.language} settings={settings} />;
      case 'scanner': return <Scanner user={user} locations={locations} onScanComplete={(r) => setScans(prev => [r, ...prev])} existingScans={scans} duplicateThresholdHours={settings.duplicateThresholdHours} language={settings.language} onSelectScan={handleSelectScan} />;
      case 'history': return <HistoryView scans={scans} onSelectScan={handleSelectScan} onRemoveScan={(id) => setScans(prev => prev.filter(s => s.id !== id))} onClearHistory={() => setScans([])} user={user} language={settings.language} allUsers={users} allLocations={locations} />;
      case 'chat': return <ChatExpert companyName={settings.companyName} appName={settings.appName} language={settings.language} />;
      case 'config': return <AdminConfig currentUser={user} users={users} locations={locations} settings={settings} onUpdateUsers={setUsers} onUpdateLocations={setLocations} onUpdateSettings={setSettings} language={settings.language} />;
      default: return <Dashboard scans={scans} onSelectScan={handleSelectScan} language={settings.language} settings={settings} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={() => { setUser(null); localStorage.removeItem('v4_session'); }} 
        isAdmin={user.role === 'admin'} 
        companyName={settings.companyName} 
        appName={settings.appName} 
        onUpdateUser={setUser} 
        language={settings.language}
      >
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
};

export default App;