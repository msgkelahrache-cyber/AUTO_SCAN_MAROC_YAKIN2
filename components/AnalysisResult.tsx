import React, { useState, useEffect } from 'react';
import { ScanResult, AppLanguage } from '../types';
import { ChevronLeft, Share2, Shield, Zap, MapPin, Fuel, Calendar, Clock, X, Loader2, Palette, Info, CheckCircle2, DollarSign } from 'lucide-react';
import { t } from '../services/localization';
import { getVinAnalysisReport, estimateMarketValue } from '../services/geminiService';
import { getImageData } from '../services/storageService';

interface AnalysisResultProps {
  result: ScanResult;
  onBack: () => void;
  language: AppLanguage;
  onUpdateScan?: (scan: ScanResult) => void;
}

const VINVisualizer: React.FC<{ vin: string; language: AppLanguage }> = ({ vin, language }) => {
  if (!vin || vin.length !== 17) return null;

  const wmi = vin.substring(0, 3);
  const vds = vin.substring(3, 9);
  const vis = vin.substring(9, 17);

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
        <Shield size={12} /> Décodage Structurel ISO 3779
      </h4>
      <div className="flex flex-wrap gap-1 font-mono text-sm">
        {/* WMI */}
        <div className="group relative">
          <div className="bg-indigo-600 text-white px-2 py-1.5 rounded-l-lg font-black border-r border-indigo-500/30">
            {wmi}
          </div>
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-900 text-white text-[9px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <p className="font-black text-indigo-400 mb-1">WMI (World Manufacturer Identifier)</p>
            Les 3 premiers caractères identifient le constructeur et le pays (ex: VSS = Seat/Espagne, WAU = Audi/Allemagne).
          </div>
        </div>
        {/* VDS */}
        <div className="group relative">
          <div className="bg-blue-500 text-white px-2 py-1.5 font-black border-r border-blue-400/30">
            {vds}
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-[9px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <p className="font-black text-blue-400 mb-1">VDS (Vehicle Descriptor Section)</p>
            Positions 4-9 : Définit le modèle, la carrosserie et le moteur. C'est ici que Khabir détecte le modèle exact.
          </div>
        </div>
        {/* VIS */}
        <div className="group relative">
          <div className="bg-amber-500 text-white px-2 py-1.5 rounded-r-lg font-black">
            {vis}
          </div>
          <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 text-white text-[9px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <p className="font-black text-amber-400 mb-1">VIS (Vehicle Identifier Section)</p>
            Position 10: Année modèle (Code). Reste: Usine de fabrication et numéro de série unique.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="h-1 bg-indigo-600 rounded-full"></div>
        <div className="h-1 bg-blue-500 rounded-full"></div>
        <div className="h-1 bg-amber-500 rounded-full"></div>
      </div>
    </div>
  );
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onBack, language, onUpdateScan }) => {
  const { analysis, timestamp, location } = result;
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(result.analysisReport || '');
  const [isEstimating, setIsEstimating] = useState(false);

  useEffect(() => {
    getImageData(result.id).then(setImgUrl);
  }, [result.id]);

  const handleDeepAnalysis = async () => {
    if (result.analysisReport) {
      setAnalysisReport(result.analysisReport);
      setIsAnalysisModalOpen(true);
      return;
    }
    if (!analysis.vin) return;
    setIsAnalysisModalOpen(true);
    setIsAnalyzingReport(true);
    try {
        const report = await getVinAnalysisReport(analysis.vin);
        setAnalysisReport(report);
        if (onUpdateScan) onUpdateScan({ ...result, analysisReport: report });
    } catch (err) {
        console.error(err);
    } finally {
        setIsAnalyzingReport(false);
    }
  };
  
  const handleEstimateValue = async () => {
    if (!onUpdateScan || result.analysis.marketValueMin) return;
    setIsEstimating(true);
    try {
      const estimation = await estimateMarketValue(result.analysis);
      const updatedAnalysis = { ...result.analysis, ...estimation };
      onUpdateScan({ ...result, analysis: updatedAnalysis });
    } catch(err) {
      console.error("Failed to estimate value", err);
    } finally {
      setIsEstimating(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest transition-colors">
        <ChevronLeft size={18} /> {t('backToInventory', language)}
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="relative group aspect-square rounded-[3.5rem] bg-slate-900 overflow-hidden border-8 border-white shadow-2xl ring-1 ring-slate-100">
            {imgUrl ? (
                <img src={imgUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="vehicle" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <Loader2 size={48} className="text-slate-300 animate-spin" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">KHABIR VISION</span>
                <button className="bg-white text-slate-900 p-3 rounded-xl shadow-xl active:scale-95 transition-transform"><Share2 size={18} /></button>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(analysis.brand + ' ' + analysis.model + ' VIN:' + (analysis.vin || 'N/A'))}`, '_blank')} className="bg-white text-slate-600 font-black py-5 rounded-[2rem] border border-slate-100 shadow-sm text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors">WhatsApp</button>
                {analysis.vin && (
                    <button onClick={handleDeepAnalysis} className="bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
                        <Zap size={16} fill="currentColor" /> {t('vinAnalysis', language)}
                    </button>
                )}
             </div>
             {onUpdateScan && (
                <button
                    onClick={handleEstimateValue}
                    disabled={isEstimating || !!result.analysis.marketValueMin}
                    className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-green-100 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isEstimating ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                    {result.analysis.marketValueMin ? t('valueEstimated', language) : t('estimateValue', language)}
                </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-slate-50"><CheckCircle2 size={100} /></div>
              <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-8 uppercase relative z-10">{t('datasheet', language)}</h3>
              
              <div className="space-y-6 relative z-10">
                 <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('scannerBrand', language)}</span>
                    <span className="font-black text-slate-900 uppercase italic text-lg">{analysis.brand}</span>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('scannerModel', language)}</span>
                    <span className="font-black text-slate-900 uppercase italic text-lg">{analysis.model}</span>
                 </div>

                 {analysis.deductionReasoning && (
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-in slide-in-from-right-2 duration-500">
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Info size={12} /> Raisonnement KHABIR
                        </p>
                        <p className="text-xs font-bold text-indigo-800 leading-relaxed italic">
                            "{analysis.deductionReasoning}"
                        </p>
                    </div>
                 )}

                 {analysis.vin && <VINVisualizer vin={analysis.vin} language={language} />}

                 <div className="grid grid-cols-2 gap-8 py-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('scannerMotorization', language)}</p>
                      <p className="font-black text-slate-900 text-xl italic">{analysis.motorization || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('energy', language)}</p>
                      <div className="flex items-center gap-2">
                        <Fuel size={14} className="text-indigo-500" />
                        <p className="font-black text-slate-900 uppercase">{analysis.fuelType}</p>
                      </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8 py-4 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('scannerColor', language)}</p>
                      <div className="flex items-center gap-2">
                        <Palette size={14} className="text-indigo-500" />
                        <p className="font-black text-slate-900 uppercase">{analysis.color || '---'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('scannerFabYear', language)}</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-500" />
                        <p className="font-black text-slate-900 text-lg">{analysis.yearOfManufacture}</p>
                      </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
              <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                <MapPin size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t('scannerLocation', language)}</p>
                <p className="text-xl font-black text-slate-900 italic uppercase">{location}</p>
              </div>
           </div>
        </div>
      </div>

      {(isEstimating || result.analysis.marketValueMin) && (
        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-50 animate-in fade-in">
          <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-6 flex items-center gap-3">
            <DollarSign size={24} className="text-green-600"/> {t('marketValue', language)}
          </h3>
          {isEstimating ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="animate-spin text-green-600" size={24} />
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('estimationLoading', language)}</span>
            </div>
          ) : (
            result.analysis.marketValueMin && (
              <div className="space-y-6">
                <div className="text-center bg-green-50/50 border-2 border-dashed border-green-200 p-8 rounded-[2rem]">
                  <p className="text-4xl lg:text-5xl font-black text-green-700 tracking-tight">
                    {result.analysis.marketValueMin?.toLocaleString('fr-MA')} - {result.analysis.marketValueMax?.toLocaleString('fr-MA')} MAD
                  </p>
                </div>
                {result.analysis.marketValueJustification && (
                  <div className="bg-slate-50 p-6 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('estimationJustification', language)}</p>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                      "{result.analysis.marketValueJustification}"
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsAnalysisModalOpen(false)}></div>
            <div className="bg-white rounded-[3.5rem] w-full max-w-4xl h-full lg:max-h-[85vh] relative z-10 shadow-2xl border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95">
                <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-xl ring-4 ring-indigo-50">
                            <Zap size={28} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">{t('vinAnalysisTitle', language)}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{analysis.brand} {analysis.model} • {analysis.vin}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsAnalysisModalOpen(false)} className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-90">
                        <X size={24} />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-10 lg:p-14 bg-slate-50/30">
                    {isAnalyzingReport ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 text-center">
                            <div className="relative">
                                <Loader2 size={80} className="text-indigo-600 animate-spin" />
                                <Zap size={32} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">{t('vinAnalysisLoading', language)}</h4>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Khabir IA compile les données importateurs...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed font-medium text-base selection:bg-indigo-100">
                                {analysisReport}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;