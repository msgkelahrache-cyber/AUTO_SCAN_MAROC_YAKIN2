
import React, { useState } from 'react';
import { User, AppLocation, UserRole, AppSettings, UserPermissions, AppLanguage } from '../types';
import { Users, MapPin, Plus, Trash2, UserPlus, UserCircle, Settings, Clock, Building2, LayoutDashboard, ScanLine, History, MessageSquare, Check, Lock, Languages, Target } from 'lucide-react';
import { t } from '../services/localization';

interface AdminConfigProps {
  currentUser: User;
  users: User[];
  locations: AppLocation[];
  settings: AppSettings;
  onUpdateUsers: (users: User[]) => void;
  onUpdateLocations: (locations: AppLocation[]) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  language: AppLanguage;
}

const AdminConfig: React.FC<AdminConfigProps> = ({ currentUser, users, locations, settings, onUpdateUsers, onUpdateLocations, onUpdateSettings, language }) => {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('agent');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    dashboard: false,
    scanner: true,
    history: true,
    chat: false,
    configGlobal: false,
    configCompany: false,
    configLocations: false,
    configUsers: false
  });
  
  const [newLocName, setNewLocName] = useState('');

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    if (role === 'admin') {
      setNewPermissions({
        dashboard: true,
        scanner: true,
        history: true,
        chat: true,
        configGlobal: true,
        configCompany: true,
        configLocations: true,
        configUsers: true
      });
    } else {
      setNewPermissions({
        dashboard: false,
        scanner: true,
        history: true,
        chat: false,
        configGlobal: false,
        configCompany: false,
        configLocations: false,
        configUsers: false
      });
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setNewPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword) return;
    
    const newUser: User = {
      id: Date.now().toString(),
      username: newUsername.toLowerCase().trim(),
      password: btoa(newPassword),
      name: newName.trim(),
      role: newRole,
      avatar: 'default',
      permissions: newPermissions
    };
    onUpdateUsers([...users, newUser]);
    
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('agent');
    setNewPermissions({ dashboard: false, scanner: true, history: true, chat: false, configGlobal: false, configCompany: false, configLocations: false, configUsers: false });
  };

  const addLocation = () => {
    if (!newLocName) return;
    const newLoc: AppLocation = { id: Date.now().toString(), name: newLocName.toUpperCase().trim() };
    onUpdateLocations([...locations, newLoc]);
    setNewLocName('');
  };

  const deleteUser = (id: string) => {
    if (id === '1') return;
    onUpdateUsers(users.filter(u => u.id !== id));
  };

  const renderAvatarPreview = (u: User) => {
      if (u.avatar === 'default' || !u.avatar) {
          return (<div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200"><UserCircle size={20} /></div>);
      }
      return <img src={u.avatar} className="w-8 h-8 rounded-lg shadow-sm object-cover bg-white" alt="avatar" />;
  };

  const permissionLabels: Record<keyof UserPermissions, { key: any, icon: React.ElementType }> = {
    dashboard: { key: 'configPermDashboard', icon: LayoutDashboard },
    scanner: { key: 'configPermScanner', icon: ScanLine },
    history: { key: 'configPermHistory', icon: History },
    chat: { key: 'configPermChat', icon: MessageSquare },
    configGlobal: { key: 'configPermAccessConfig', icon: Settings },
    configCompany: { key: 'configPermCompany', icon: Building2 },
    configLocations: { key: 'configPermLocations', icon: MapPin },
    configUsers: { key: 'configPermUsers', icon: Users }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">{t('configTitle', language)}</h1>
        <p className="text-slate-500 font-medium">{t('configSubtitle', language)}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-10 order-2 md:order-1">
          {currentUser.permissions?.configCompany ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                <Settings className="text-indigo-600" size={28} />
                <h3 className="text-xl font-black tracking-tight">{t('configCompanyParams', language)}</h3>
                </div>
                
                <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><Building2 size={12} className="text-indigo-500" /> {t('configCompany', language)}</label>
                    <input type="text" value={settings.companyName || ''} onChange={e => onUpdateSettings({...settings, companyName: e.target.value})} placeholder={t('configCompanyNamePlaceholder', language)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10 uppercase"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><Clock size={12} className="text-indigo-500" /> {t('configDuplicateAlertDelay', language)}</label>
                      <input type="number" value={settings.duplicateThresholdHours} onChange={e => onUpdateSettings({...settings, duplicateThresholdHours: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10" />
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><Target size={12} className="text-indigo-500" /> Objectif Mensuel</label>
                      <input type="number" value={settings.monthlyTarget || 100} onChange={e => onUpdateSettings({...settings, monthlyTarget: parseInt(e.target.value) || 100})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10" />
                  </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><Languages size={12} className="text-indigo-500" /> {t('configLanguage', language)}</label>
                     <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button onClick={() => onUpdateSettings({...settings, language: 'fr'})} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${settings.language === 'fr' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>{t('french', language)}</button>
                        <button onClick={() => onUpdateSettings({...settings, language: 'ar'})} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${settings.language === 'ar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>{t('arabic', language)}</button>
                    </div>
                </div>
                </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 opacity-70"><Lock size={20} className="text-slate-400" /> <span className="text-sm font-bold text-slate-400">{t('configCompanyParamsDenied', language)}</span></div>
          )}

          {currentUser.permissions?.configLocations ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8"><MapPin className="text-indigo-600" size={28} /> <h3 className="text-xl font-black tracking-tight">{t('configLocationsManagement', language)}</h3></div>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder={t('configNewLocationPlaceholder', language)} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10" />
                  <button onClick={addLocation} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"><Plus size={20} /></button>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                  {locations.map(l => (<div key={l.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all"><span className="text-sm font-black text-slate-700">{l.name}</span><button onClick={() => onUpdateLocations(locations.filter(loc => loc.id !== l.id))} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button></div>))}
                </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 opacity-70"><Lock size={20} className="text-slate-400" /> <span className="text-sm font-bold text-slate-400">{t('configLocationsDenied', language)}</span></div>
          )}
        </div>

        {currentUser.permissions?.configUsers ? (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col order-1 md:order-2">
          <div className="flex items-center gap-4 mb-8"><Users className="text-indigo-600" size={28} /><h3 className="text-xl font-black tracking-tight">{t('configTeamAndAccess', language)}</h3></div>
          <form onSubmit={addUser} className="space-y-6 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t('configIdentity', language)}</p>
                 <div className="space-y-2">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('configFullNamePlaceholder', language)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={t('configUsernamePlaceholder', language)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('configPasswordPlaceholder', language)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                    </div>
                </div>
            </div>
            <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t('configRoleAndPermissions', language)}</p>
                 <div className="flex bg-white p-1 rounded-xl border border-slate-200 mb-4">
                    <button type="button" onClick={() => handleRoleChange('agent')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${newRole === 'agent' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{t('configRoleUser', language)}</button>
                    <button type="button" onClick={() => handleRoleChange('admin')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${newRole === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{t('configRoleAdmin', language)}</button>
                 </div>
                 <div className="space-y-2">
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">{t('configMainModules', language)}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {['dashboard', 'scanner', 'history', 'chat'].map((key) => {
                                const permKey = key as keyof UserPermissions;
                                const { key: labelKey, icon: Icon } = permissionLabels[permKey];
                                const isActive = newPermissions[permKey];
                                return (<button key={key} type="button" onClick={() => togglePermission(permKey)} className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400'}`}><div className={`w-4 h-4 rounded flex items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>{isActive && <Check size={10} strokeWidth={4} />}</div><span className="text-[9px] font-bold uppercase tracking-tight flex items-center gap-1.5"><Icon size={12} /> {t(labelKey, language)}</span></button>);
                            })}
                        </div>
                     </div>
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t('configConfigDetails', language)}</p>
                             <button type="button" onClick={() => togglePermission('configGlobal')} className={`text-[9px] font-black uppercase ${newPermissions.configGlobal ? 'text-green-600' : 'text-red-400'}`}>{newPermissions.configGlobal ? t('configAccessAllowed', language) : t('configAccessBlocked', language)}</button>
                        </div>
                        <div className={`grid grid-cols-2 gap-2 ${!newPermissions.configGlobal && 'opacity-50 pointer-events-none'}`}>
                            {['configCompany', 'configLocations', 'configUsers'].map((key) => {
                                const permKey = key as keyof UserPermissions;
                                const { key: labelKey, icon: Icon } = permissionLabels[permKey];
                                const isActive = newPermissions[permKey];
                                return (<button key={key} type="button" onClick={() => togglePermission(permKey)} className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${isActive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-transparent text-slate-400'}`}><div className={`w-4 h-4 rounded flex items-center justify-center border ${isActive ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-300'}`}>{isActive && <Check size={10} strokeWidth={4} />}</div><span className="text-[9px] font-bold uppercase tracking-tight flex items-center gap-1.5"><Icon size={12} /> {t(labelKey, language)}</span></button>);
                            })}
                        </div>
                     </div>
                 </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors mt-2"><UserPlus size={16} /> {t('configCreateAccount', language)}</button>
          </form>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {users.map(u => (<div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all"><div className="flex items-center gap-3">{renderAvatarPreview(u)}<div><p className="text-sm font-black text-slate-900 leading-none">{u.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">@{u.username} • {u.role === 'admin' ? t('configRoleAdmin', language) : t('configRoleUser', language)}</p></div></div>{u.id !== '1' && (<button onClick={() => deleteUser(u.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>)}</div>))}
          </div>
        </div>
        ) : (
            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-center opacity-70 order-1 md:order-2"><div className="text-center"><Lock size={32} className="text-slate-300 mx-auto mb-2" /><span className="text-sm font-bold text-slate-400">{t('configTeamDenied', language)}</span></div></div>
        )}
      </div>
    </div>
  );
};

export default AdminConfig;
