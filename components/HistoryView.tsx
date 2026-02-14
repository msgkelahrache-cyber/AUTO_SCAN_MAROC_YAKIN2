import React, { useState, useMemo, useEffect } from 'react';
import { ScanResult, User, AppLanguage, AppLocation } from '../types';
import { Search, Trash2, Calendar, ChevronRight, MapPin, X, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { t } from '../services/localization';
import { getImageData, deleteImageData } from '../services/storageService';
import { exportToCSV } from '../services/exportService';
import { Download } from 'lucide-react';

const BRAND_COLORS: Record<string, string> = {
  'AUDI': 'bg-slate-900',
  'BMW': 'bg-blue-900',
  'MERCEDES': 'bg-slate-800',
  'RENAULT': 'bg-amber-500',
  'DACIA': 'bg-indigo-900',
  'VOLKSWAGEN': 'bg-blue-600',
  'PEUGEOT': 'bg-blue-950',
  'HYUNDAI': 'bg-sky-700',
  'TOYOTA': 'bg-red-700'
};

const ScanItem: React.FC<{ scan: ScanResult; onSelect: (s: ScanResult) => void; onRemove: (id: string) => void; isAdmin: boolean; language: AppLanguage }> = ({ scan, onSelect, onRemove, isAdmin, language }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const brand = scan.analysis.brand.toUpperCase();
  const bgColor = BRAND_COLORS[brand] || 'bg-indigo-600';

  useEffect(() => {
    getImageData(scan.id).then(setImgUrl);
  }, [scan.id]);

  return (
    <div className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all flex flex-col sm:flex-row items-center gap-6 animate-in fade-in">
      <div onClick={() => onSelect(scan)} className="w-24 h-24 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-lg cursor-pointer shrink-0">
        {imgUrl ? (
          <img src={imgUrl} className="w-full h-full object-cover" alt="car" />
        ) : (
          <div className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-black text-3xl italic tracking-tighter`}>
            {brand.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2 cursor-pointer text-center sm:text-left" onClick={() => onSelect(scan)}>
        <h4 className="font-black text-slate-900 text-xl truncate uppercase italic">{scan.analysis.brand} {scan.analysis.model}</h4>
        <p className="text-sm font-black font-mono text-slate-400 truncate">{scan.analysis.vin || 'VIN NON DÉTECTÉ'}</p>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><MapPin size={10} /> {scan.location}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><Calendar size={10} /> {scan.analysis.yearOfManufacture}</span>
        </div>
      </div>
      <div className="flex gap-3 mt-4 sm:mt-0">
        {isAdmin && <button onClick={() => onRemove(scan.id)} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>}
        <button onClick={() => onSelect(scan)} className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all"><ChevronRight size={20} /></button>
      </div>
    </div>
  );
};

interface HistoryViewProps {
  scans: ScanResult[];
  onSelectScan: (scan: ScanResult) => void;
  onRemoveScan: (id: string) => void;
  onClearHistory: () => void;
  user: User | null;
  allUsers: User[];
  allLocations: AppLocation[];
  language: AppLanguage;
}

const HistoryView: React.FC<HistoryViewProps> = ({ scans, onSelectScan, onRemoveScan, onClearHistory, user, allUsers = [], allLocations = [], language }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const resetFilters = () => {
    setSelectedUserId('');
    setSelectedLocationId('');
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
  };

  const filteredHistory = useMemo(() => {
    return scans.filter(item => {
      const term = searchTerm.toUpperCase().trim();

      const matchesSearch = !term ||
        (item.analysis.vin && item.analysis.vin.toUpperCase().includes(term)) ||
        item.analysis.brand.toUpperCase().includes(term) ||
        item.analysis.model.toUpperCase().includes(term);

      const matchesUser = !selectedUserId || item.userId === selectedUserId;
      const matchesLocation = !selectedLocationId || item.locationId === selectedLocationId;

      const itemDate = new Date(item.timestamp);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);

      return matchesSearch && matchesUser && matchesLocation && matchesDate;
    });
  }, [scans, searchTerm, selectedUserId, selectedLocationId, dateRange]);

  const handleRemove = (id: string) => {
    deleteImageData(id).then(() => onRemoveScan(id));
  };

  const confirmClearHistory = () => {
    onClearHistory();
    setIsDeleteModalOpen(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">{t('historyTitle', language)}</h1>
          <p className="text-slate-500 font-medium">{t('historySubtitle', language)}</p>
        </div>
        {user?.role === 'admin' && scans.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(scans)} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
              <Download size={18} /> CSV
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="bg-white text-slate-400 border border-slate-200 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2">
              <Trash2 size={18} /> {t('historyResetRegister', language)}
            </button>
          </div>
        )}
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder={t('historySearchPlaceholder', language)} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-14 py-5 text-sm font-bold uppercase outline-none border border-transparent focus:border-indigo-100" />
          </div>
          <button onClick={() => setShowFilters(prev => !prev)} className={`px-5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <Filter size={16} /> <span className="hidden sm:inline">{t('historyAdvancedFilters', language)}</span>
          </button>
        </div>
        {showFilters && (
          <div className="p-6 bg-slate-50 rounded-2xl space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">{t('historyFilterByUser', language)}</label>
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">{t('historyAllUsers', language)}</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">{t('historyFilterByLocation', language)}</label>
                <select value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">{t('historyAllLocations', language)}</option>
                  {allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">{t('historyFilterByDate', language)}</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" placeholder={t('historyFrom', language)} />
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" placeholder={t('historyTo', language)} />
              </div>
            </div>
            <button onClick={resetFilters} className="bg-slate-100 text-slate-500 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 w-full">
              <RefreshCw size={14} /> {t('historyResetFilters', language)}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {filteredHistory.length > 0 ? (
          filteredHistory.map(item => <ScanItem key={item.id} scan={item} onSelect={onSelectScan} onRemove={handleRemove} isAdmin={user?.role === 'admin'} language={language} />)
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <Search size={64} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">{t('historyNoVehicleFound', language)}</p>
          </div>
        )}
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm"><AlertTriangle size={32} /></div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic mb-2">{t('historyResetConfirmTitle', language)}</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                {t('historyResetConfirmText', language, { count: scans.length })}
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setIsDeleteModalOpen(false)} className="bg-slate-50 text-slate-500 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">{t('cancel', language)}</button>
                <button onClick={confirmClearHistory} className="bg-red-600 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all">{t('historyResetConfirmButton', language)}</button>
              </div>
            </div>
            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
