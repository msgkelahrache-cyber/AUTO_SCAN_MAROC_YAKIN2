
import React, { useMemo, useState, useEffect } from 'react';
import { ScanResult, AppLanguage, AppSettings } from '../types';
import { ClipboardList, Package, TrendingUp, MapPin, Activity, ChevronRight, ShieldCheck, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { t } from '../services/localization';
import { getImageData } from '../services/storageService';

const BRAND_COLORS: Record<string, string> = {
  'AUDI': 'bg-slate-900', 'BMW': 'bg-blue-900', 'MERCEDES': 'bg-slate-800',
  'RENAULT': 'bg-amber-500', 'DACIA': 'bg-indigo-900', 'VOLKSWAGEN': 'bg-blue-600',
  'PEUGEOT': 'bg-blue-950', 'HYUNDAI': 'bg-sky-700', 'TOYOTA': 'bg-red-700'
};

const DashboardScanItem: React.FC<{ scan: ScanResult; onSelect: (s: ScanResult) => void; language: AppLanguage }> = ({ scan, onSelect, language }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const brand = scan.analysis.brand.toUpperCase();
  const bgColor = BRAND_COLORS[brand] || 'bg-indigo-600';

  useEffect(() => {
    getImageData(scan.id).then(setImgUrl);
  }, [scan.id]);

  return (
    <div onClick={() => onSelect(scan)} className="group cursor-pointer bg-white border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 rounded-[2.5rem] p-5 transition-all flex items-center gap-6 shadow-sm hover:shadow-md">
      <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden shadow-lg border-2 border-white shrink-0">
          {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-black text-2xl`}>{brand.charAt(0)}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-900 text-lg uppercase italic truncate leading-tight">{scan.analysis.brand} {scan.analysis.model}</h4>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-black text-slate-400 font-mono tracking-tighter truncate uppercase">{scan.analysis.vin}</span>
          <span className="text-slate-200">|</span>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10}/>{scan.location}</span>
        </div>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ChevronRight size={18} /></div>
    </div>
  );
};

interface DashboardProps {
  scans: ScanResult[];
  onSelectScan: (scan: ScanResult) => void;
  language: AppLanguage;
  settings: AppSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ scans = [], onSelectScan, language, settings }) => {
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  
  // Logique de calcul du début du mois
  const startOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const scansToday = scans.filter(s => s.timestamp >= startOfDay).length;
  const scansThisMonth = scans.filter(s => s.timestamp >= startOfMonth).length;
  
  const target = settings.monthlyTarget || 100;
  const monthlyGoalPercent = Math.round((scansThisMonth / target) * 100);
  const isTargetReached = monthlyGoalPercent >= 100;

  const brandCounts = useMemo(() => scans.reduce((acc: any, s) => { acc[s.analysis.brand] = (acc[s.analysis.brand] || 0) + 1; return acc; }, {}), [scans]);
  const chartData = useMemo(() => Object.entries(brandCounts).map(([name, count]) => ({ name, count: count as number })).sort((a,b) => b.count - a.count).slice(0,5), [brandCounts]);

  return (
    <div className="space-y-10 animate-in fade-in pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">{t('dashboardTitle', language)}</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-2">{t('dashboardSubtitle', language)}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><Activity size={20}/></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Expertises Jour</p><p className="text-xl font-black italic">{scansToday}</p></div>
            </div>
            <div className={`px-6 py-4 rounded-3xl text-white shadow-xl flex items-center gap-4 transition-all duration-500 ${isTargetReached ? 'bg-green-600 shadow-green-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isTargetReached ? 'bg-white/30' : 'bg-white/20'}`}>
                  <Target size={20}/>
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase leading-none mb-1">Objectif Mensuel</p>
                  <p className="text-xl font-black italic">{monthlyGoalPercent}%</p>
                  <p className="text-[8px] font-bold opacity-80 uppercase tracking-tighter">
                    {scansThisMonth} / {target} SCANS
                  </p>
                </div>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 tracking-tight"><ClipboardList size={28} className="text-indigo-600" /> Flux Recent</h3>
            </div>
            <div className="p-8 space-y-4">
              {scans.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <Package size={64} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Aucune donnée KHABIR</p>
                </div>
              ) : scans.slice(0, 5).map(s => <DashboardScanItem key={s.id} scan={s} onSelect={onSelectScan} language={language} />)}
            </div>
          </div>
        </div>

        <div className="space-y-10">
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3"><TrendingUp size={24} className="text-indigo-600" /> Répartition Stock</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}} />
                        <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                            {chartData.map((_, i) => <Cell key={i} fill={['#4f46e5','#6366f1','#818cf8','#a5b4fc','#c7d2fe'][i%5]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
           
           <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:scale-150 transition-transform duration-1000"><ShieldCheck size={120} /></div>
              <h4 className="text-xl font-black italic mb-4">Statut Infrastructure</h4>
              <p className="text-sm font-medium opacity-60 leading-relaxed mb-10">Serveurs IA KHABIR opérationnels. Latence : 1.2s</p>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-t border-white/10 pt-6">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>Live System</span>
                <span className="opacity-40">v2.0.4 Premium</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
