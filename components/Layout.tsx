
import React, { useState, useRef } from 'react';
import { LayoutDashboard, MessageSquare, History, LogOut, ShieldCheck, Settings, X, AlertTriangle, ScanLine, Building2, User as UserIcon, Camera } from 'lucide-react';
import { User, AppLanguage } from '../types';
import { t, TranslationKey } from '../services/localization';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
  isAdmin: boolean;
  companyName: string;
  appName: string;
  onUpdateUser: (user: User) => void;
  language: AppLanguage;
}

// FIX: Define a type for navigation items to ensure type safety with the `t` function.
interface NavItem {
  id: string;
  icon: React.ElementType;
  labelKey: TranslationKey;
  allowed: boolean | undefined;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, isAdmin, companyName, appName, onUpdateUser, language }) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Définition de tous les items possibles
  const allNavItems: NavItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, labelKey: 'tabDashboard', allowed: user.permissions?.dashboard },
    { id: 'scanner', icon: ScanLine, labelKey: 'tabScan', allowed: user.permissions?.scanner },
    { id: 'history', icon: History, labelKey: 'tabHistory', allowed: user.permissions?.history },
    { id: 'chat', icon: MessageSquare, labelKey: 'tabChat', allowed: user.permissions?.chat },
    { id: 'config', icon: Settings, labelKey: 'tabConfig', allowed: user.permissions?.configGlobal }
  ];

  // Filtrage basé sur les permissions
  const navItems = allNavItems.filter(item => item.allowed);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    onLogout();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop volumineuse. Veuillez choisir une image de moins de 2Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateUser({ ...user, avatar: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderAvatar = (sizeClass: string, iconSize: number) => {
    if (user.avatar === 'default' || !user.avatar) {
      return (
        <div className={`${sizeClass} bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200`}>
          <UserIcon size={iconSize} />
        </div>
      );
    }
    return (
      <img src={user.avatar} className={`${sizeClass} object-cover border border-slate-200 bg-white`} alt="Avatar" />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 lg:flex-row overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 p-8 shadow-sm z-50">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200 shrink-0"><ShieldCheck size={28} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tighter text-slate-900 block leading-none italic truncate" title={appName}>
                {appName || 'VIN SCAN PRO'}
              </span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[9px] font-black tracking-widest border border-slate-200">V0.1</span>
            </div>
            <div className="flex flex-col mt-1">
               <span className="text-sm font-bold text-indigo-600 leading-none" style={{ fontFamily: 'Cairo, sans-serif' }}>YAKIN يقين</span>
               <span className="text-[10px] font-medium text-slate-400 font-tifinagh mt-0.5">ⵜⵉⴷⴻⵜ</span>
            </div>
          </div>
        </div>

        <div className="mb-10 px-1">
             <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <Building2 size={12} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide truncate" title={companyName}>
                    {companyName || 'Société non définie'}
                </span>
             </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 text-left ${
                activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 font-bold translate-x-1' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} />
              <span className="text-sm tracking-tight">{t(item.labelKey, language)}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100 flex items-center gap-4">
          <div 
            className="relative group cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title={t('updatePhoto', language)}
          >
            {renderAvatar("w-10 h-10 rounded-xl shadow-sm", 20)}
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              {user.role === 'admin' ? t('roleAdmin', language) : t('roleUser', language)}
            </p>
          </div>
          <button 
            onClick={handleLogoutClick} 
            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title={t('logout', language)}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-40 safe-pt">
          <div className="flex flex-col max-w-[70%]">
             <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <span className="font-black text-slate-900 text-lg tracking-tighter italic truncate">{appName || 'VIN SCAN PRO'}</span>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[9px] font-black tracking-widest border border-slate-200">V0.1</span>
             </div>
             <div className="flex items-center gap-2 pl-6 mt-0.5">
                <span className="text-[10px] font-bold text-indigo-600" style={{ fontFamily: 'Cairo, sans-serif' }}>YAKIN يقين</span>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[9px] font-medium text-slate-400 font-tifinagh">ⵜⵉⴷⴻⵜ</span>
             </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
             <div onClick={() => fileInputRef.current?.click()} className="active:scale-95 transition-transform">
                {renderAvatar("w-8 h-8 rounded-full shadow-sm", 16)}
             </div>
            <button 
              onClick={handleLogoutClick}
              className="text-slate-400 p-1"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">{children}</div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-100 px-6 py-4 flex justify-around items-center z-50 safe-pb shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === item.id ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{t(item.labelKey, language).split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </main>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)}></div>
          
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic mb-2">{t('logoutConfirmTitle', language)}</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                {t('logoutConfirmText', language)}
              </p>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="bg-slate-50 text-slate-500 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                >
                  {t('cancel', language)}
                </button>
                <button 
                  onClick={confirmLogout}
                  className="bg-red-600 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                >
                  {t('confirm', language)}
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
