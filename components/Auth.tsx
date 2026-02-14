
import React, { useState } from 'react';
import { User as UserIcon, LogIn, ShieldCheck, Lock, Building2 } from 'lucide-react';
import { User, AppLanguage } from '../types';
import { t } from '../services/localization';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  companyName?: string;
  appName?: string;
  language: AppLanguage;
}

const Auth: React.FC<AuthProps> = ({ users, onLogin, companyName, appName, language }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const encodedPassword = btoa(password);
      const found = users.find(u => u.username === username.toLowerCase() && u.password === encodedPassword);
      if (found) {
        onLogin(found);
      } else {
        setError(t('loginError', language));
      }
    } catch (err) {
      setError(t('loginErrorGeneric', language));
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 animate-in fade-in zoom-in">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-6 animate-bounce">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic mb-1">{appName || 'VIN SCAN PRO'}</h1>
          
          <div className="flex flex-col items-center gap-1 mt-2">
            <h2 className="text-3xl font-bold text-indigo-600 leading-none" style={{ fontFamily: 'Cairo, sans-serif' }}>YAKIN يقين</h2>
            <h3 className="text-lg font-medium text-indigo-400 font-tifinagh tracking-widest">ⵜⵉⴷⴻⵜ</h3>
          </div>
          
          <p className="text-slate-500 mt-4 font-medium text-sm">{t('loginExpertiseCert', language)}</p>
          
          {companyName && (
             <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <Building2 size={12} className="text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('loginSpace', language)} : {companyName}</span>
             </div>
          )}
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 outline-none border border-transparent focus:border-indigo-100"
              placeholder={t('loginIdPlaceholder', language)} required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 outline-none border border-transparent focus:border-indigo-100"
              placeholder={t('loginPasswordPlaceholder', language)} required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all mt-4">
            <LogIn size={20} /> {t('loginButton', language)}
          </button>
        </form>
        
        <p className="mt-8 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
          {t('loginSecuredAccess', language)} • {companyName || 'AutoExpert'}
        </p>
      </div>
    </div>
  );
};

export default Auth;