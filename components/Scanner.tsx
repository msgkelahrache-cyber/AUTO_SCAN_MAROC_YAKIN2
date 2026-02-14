
import React, { useRef, useState, useEffect } from 'react';
import { MapPin, CheckCircle2, ArrowLeft, Loader2, Camera, Palette, ArrowRight, Image as ImageIcon, Zap, Clock, AlertCircle, Sparkles, ChevronRight, History, Keyboard, Car, Hash, Calendar, Fuel, FileText, Info } from 'lucide-react';
import { analyzeVehicleCritical, analyzeVehicleDetails, analyzeVehicleByVin } from '../services/geminiService';
import { saveImageData } from '../services/storageService';
import { ScanResult, VehicleAnalysis, ScanType, User, AppLocation, FuelType, AppLanguage } from '../types';
import { t } from '../services/localization';

interface ScannerProps {
  user: User;
  locations: AppLocation[];
  onScanComplete: (result: ScanResult) => void;
  existingScans: ScanResult[];
  duplicateThresholdHours: number;
  language: AppLanguage;
  onSelectScan?: (scan: ScanResult) => void;
}

const ENERGIES: FuelType[] = ["Diesel", "Essence", "Hybride", "Électrique", "N/A"];

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1080;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const Scanner: React.FC<ScannerProps> = ({ user, locations, onScanComplete, existingScans, language, onSelectScan }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzingStep1, setIsAnalyzingStep1] = useState(false);
  const [isAnalyzingStep2, setIsAnalyzingStep2] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [scanMode, setScanMode] = useState<ScanType>('vin');
  const [manualVin, setManualVin] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isZoneConfirmed, setIsZoneConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [currentAnalysis, setCurrentAnalysis] = useState<VehicleAnalysis | null>(null);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [timer, setTimer] = useState(15);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const startStep2Analysis = async (image: string, brand: string) => {
    setIsAnalyzingStep2(true);
    setTimer(15);
    const countdown = setInterval(() => setTimer(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000));
    try {
      const details = await Promise.race([analyzeVehicleDetails(image, brand), timeoutPromise]) as Partial<VehicleAnalysis>;
      setCurrentAnalysis(prev => prev ? ({
        ...prev,
        model: details.model || prev.model,
        motorization: details.motorization || prev.motorization,
        fuelType: details.fuelType || prev.fuelType,
        color: details.color || prev.color,
        registrationYear: details.registrationYear || prev.registrationYear,
        deductionReasoning: details.deductionReasoning || prev.deductionReasoning
      }) : null);
    } catch (err) { console.warn("IA expertise expirée"); }
    finally { setIsAnalyzingStep2(false); clearInterval(countdown); }
  };

  const handleManualVinSubmit = async () => {
    if (manualVin.length < 5) return;
    setIsAnalyzingStep1(true);
    setError(null);
    try {
      const vinUpper = manualVin.toUpperCase();
      const info = await analyzeVehicleByVin(vinUpper);

      setCurrentAnalysis({
        vin: vinUpper,
        brand: info.brand || "INCONNU",
        model: info.model || "INCONNU",
        fuelType: info.fuelType as any || "N/A",
        motorization: info.motorization || "",
        yearOfManufacture: info.yearOfManufacture || "...",
        registrationYear: "",
        licensePlate: "",
        inventoryNotes: "",
        color: info.color || "...",
        deductionReasoning: info.deductionReasoning || ""
      });
      setCurrentImage("");
      setStep('review');
    } catch (err) {
      setError("Erreur lors de l'analyse du VIN manuel.");
    } finally {
      setIsAnalyzingStep1(false);
    }
  };

  const handleCapture = async (file: File) => {
    setIsAnalyzingStep1(true);
    setError(null);
    try {
      const compressedImage = await resizeImage(file);
      setCurrentImage(compressedImage);
      const critical = await analyzeVehicleCritical(compressedImage, scanMode);
      const initialAnalysis: VehicleAnalysis = {
        vin: critical.vin || "",
        brand: critical.brand || "INCONNU",
        model: critical.model || "ANALYSE...",
        fuelType: "N/A",
        motorization: "ANALYSE...",
        yearOfManufacture: critical.yearOfManufacture || "...",
        registrationYear: critical.registrationYear || "...",
        licensePlate: critical.licensePlate || "...",
        inventoryNotes: "",
        color: "...",
        deductionReasoning: critical.deductionReasoning || ""
      };
      setCurrentAnalysis(initialAnalysis);
      setStep('review');
      setIsAnalyzingStep1(false);
      startStep2Analysis(compressedImage, initialAnalysis.brand);
    } catch (err) {
      setError(t('scannerIAAnalysisFailed', language));
      setIsAnalyzingStep1(false);
    }
  };

  const saveInventory = async () => {
    if (!currentAnalysis || isSaving || isSuccess) return;
    setIsSaving(true);
    try {
      const scanId = `S-${Date.now()}`;
      const locObj = locations.find(l => l.id === selectedLocationId) || locations[0];
      // OPTIMISATION PRIVACY : On ne sauvegarde PAS l'image (Plan Gratuit / Demande client)
      // if (currentImage) await saveImageData(scanId, currentImage);

      onScanComplete({
        id: scanId,
        timestamp: Date.now(),
        imageUrl: "", // Image supprimée après scan validé
        analysis: currentAnalysis,
        userId: user.id,
        userName: user.name,
        locationId: locObj.id,
        location: locObj.name
      });
      setIsSuccess(true);
      setTimeout(() => { setStep('capture'); setIsSuccess(false); setCurrentAnalysis(null); setCurrentImage(''); setManualVin(''); }, 1500);
    } catch (err) { setError("Erreur lors de l'enregistrement"); }
    finally { setIsSaving(false); }
  };

  const lastFiveScans = existingScans.slice(0, 5);

  if (!isZoneConfirmed) {
    return (
      <div className="max-w-xl mx-auto p-8 lg:p-12 bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-indigo-50/50">
          <MapPin size={48} className="text-indigo-600 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black mb-4 italic tracking-tighter uppercase">{t('scannerLocation', language)}</h2>
        <div className="grid grid-cols-1 gap-3 mb-10 max-h-[40vh] overflow-y-auto pr-2 text-left">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setSelectedLocationId(loc.id)} className={`p-5 rounded-2xl border-2 transition-all text-[11px] font-black tracking-widest uppercase flex items-center justify-between ${selectedLocationId === loc.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg translate-x-1' : 'border-slate-50 text-slate-400 hover:bg-slate-50'}`}>
              {loc.name} {selectedLocationId === loc.id && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
        <button onClick={() => setIsZoneConfirmed(true)} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 group">
          {t('scannerConfirmAndLaunch', language)} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  if (step === 'review' && currentAnalysis) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in slide-in-from-bottom-10 duration-500">
        <button onClick={() => setStep('capture')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors">
          <ArrowLeft size={16} /> {t('cancel', language)}
        </button>

        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-50">
          <div className="relative h-64 lg:h-80 bg-slate-900 flex items-center justify-center">
            {currentImage ? (
              <img src={currentImage} className="w-full h-full object-cover" alt="Scan" />
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-500">
                <Car size={80} strokeWidth={1} className="opacity-20" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">SAISIE MANUELLE SANS PHOTO</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-10 right-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase shadow-lg">KHABIR VISION V3</span>
                {isAnalyzingStep2 && <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5"><Sparkles size={10} className="text-indigo-400" /> EXPERTISE...</span>}
              </div>
              <p className="text-white font-black text-3xl italic tracking-tighter uppercase truncate">{currentAnalysis.brand} {currentAnalysis.model === "ANALYSE..." ? "" : currentAnalysis.model}</p>
            </div>
          </div>

          <div className="p-8 lg:p-12 space-y-8">
            {currentAnalysis.deductionReasoning && (
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl animate-in zoom-in duration-300">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                  <Info size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Justification Expert KHABIR</span>
                </div>
                <p className="text-xs font-bold text-indigo-800 leading-relaxed italic">"{currentAnalysis.deductionReasoning}"</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2"><Car size={14} /> Identification Véhicule</h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerBrand', language)}</label>
                  <input type="text" value={currentAnalysis.brand} onChange={e => setCurrentAnalysis({ ...currentAnalysis, brand: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black uppercase border-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerModel', language)}</label>
                  <input type="text" value={currentAnalysis.model === "ANALYSE..." ? "" : currentAnalysis.model} onChange={e => setCurrentAnalysis({ ...currentAnalysis, model: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black uppercase border-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2"><Hash size={14} /> Traçabilité</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerVIN', language)}</label>
                  <input type="text" value={currentAnalysis.vin} onChange={e => setCurrentAnalysis({ ...currentAnalysis, vin: e.target.value.toUpperCase() })} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-mono uppercase tracking-[0.1em] border-none text-sm shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerLicensePlate', language)}</label>
                  <input type="text" value={currentAnalysis.licensePlate} onChange={e => setCurrentAnalysis({ ...currentAnalysis, licensePlate: e.target.value.toUpperCase() })} className="w-full bg-slate-50 p-4 rounded-2xl font-black uppercase border-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="12345|A|1" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2"><Calendar size={14} /> Chronologie</h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerFabYear', language)}</label>
                  <input type="text" value={currentAnalysis.yearOfManufacture === "..." ? "" : currentAnalysis.yearOfManufacture} onChange={e => setCurrentAnalysis({ ...currentAnalysis, yearOfManufacture: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerRegistrationYear', language)}</label>
                  <input type="text" value={currentAnalysis.registrationYear === "..." ? "" : currentAnalysis.registrationYear} onChange={e => setCurrentAnalysis({ ...currentAnalysis, registrationYear: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2"><Fuel size={14} /> Motorisation & Esthétique</h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerMotorization', language)}</label>
                  <input type="text" value={currentAnalysis.motorization === "ANALYSE..." ? "" : currentAnalysis.motorization} onChange={e => setCurrentAnalysis({ ...currentAnalysis, motorization: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="1.5 dCi 110ch" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('energy', language)}</label>
                  <select value={currentAnalysis.fuelType} onChange={e => setCurrentAnalysis({ ...currentAnalysis, fuelType: e.target.value as any })} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    {ENERGIES.map(en => <option key={en} value={en}>{en}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerColor', language)}</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl border border-slate-100 shrink-0 shadow-sm flex items-center justify-center text-slate-300">
                      <Palette size={18} />
                    </div>
                    <input type="text" value={currentAnalysis.color === "..." ? "" : currentAnalysis.color} onChange={e => setCurrentAnalysis({ ...currentAnalysis, color: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Gris Météore, Noir Métallisé..." />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2"><FileText size={14} /> État & Observations</h3>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('scannerRemarks', language)}</label>
                <textarea
                  value={currentAnalysis.inventoryNotes}
                  onChange={e => setCurrentAnalysis({ ...currentAnalysis, inventoryNotes: e.target.value })}
                  className="w-full bg-slate-50 p-5 rounded-3xl font-medium border-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px] text-sm"
                  placeholder={t('scannerRemarksPlaceholder', language)}
                />
              </div>
            </div>

            <button onClick={saveInventory} disabled={isSaving || isSuccess} className={`w-full font-black py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 text-[12px] uppercase tracking-widest ${isSuccess ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {isSaving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />} {isSuccess ? "ENREGISTRÉ" : t('scannerValidateAndSave', language)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-in fade-in pb-24 space-y-8">
      <div className="bg-white p-8 lg:p-12 rounded-[4rem] shadow-2xl text-center space-y-10 relative overflow-hidden border border-slate-50">
        <div className="flex flex-col gap-2 relative z-10">
          <h2 className="text-4xl font-black italic tracking-tighter text-slate-900">{t('scannerScanVehicle', language)}</h2>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <MapPin size={10} /> {locations.find(l => l.id === selectedLocationId)?.name}
          </p>
        </div>

        <div className="grid grid-cols-2 bg-slate-50 p-1.5 rounded-[1.8rem] border border-slate-100 relative z-10">
          <button onClick={() => setScanMode('vin')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'vin' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>VIN CHÂSSIS</button>
          <button onClick={() => setScanMode('carte_grise')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'carte_grise' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>CARTE GRISE</button>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="relative group cursor-pointer" onClick={() => cameraInputRef.current?.click()}>
            <div className="aspect-square bg-slate-900 rounded-[4rem] shadow-2xl flex flex-col items-center justify-center gap-6 overflow-hidden relative border-4 border-slate-800 transition-transform hover:scale-[1.02] active:scale-95 duration-500">
              <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-500/20 mb-2"><Camera size={48} className="text-white" /></div>
              <span className="text-white font-black text-2xl tracking-tight italic uppercase block">{t('scannerUseCamera', language)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => galleryInputRef.current?.click()} className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl flex items-center justify-between hover:border-indigo-600 hover:bg-white transition-all group active:scale-95">
              <div className="flex items-center gap-4">
                <ImageIcon size={24} className="text-slate-400" />
                <span className="text-[12px] font-black text-slate-900 uppercase tracking-widest">{t('scannerImportGallery', language)}</span>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
            </button>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3 text-indigo-400">
                <Keyboard size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Saisie Manuelle Rapide</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualVin}
                  onChange={e => setManualVin(e.target.value.toUpperCase())}
                  placeholder="ENTREZ LE VIN OU PLAQUE..."
                  className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono font-black placeholder:text-white/20 outline-none focus:border-indigo-500 transition-all text-sm"
                />
                <button
                  onClick={handleManualVinSubmit}
                  disabled={manualVin.length < 3}
                  className="bg-indigo-600 text-white px-6 rounded-2xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-30"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {lastFiveScans.length > 0 && (
          <div className="relative z-10 pt-4 text-left space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2"><History size={16} className="text-indigo-600" /> Travaux Récents</h3>
            </div>
            <div className="space-y-3">
              {lastFiveScans.map((scan) => (
                <button key={scan.id} onClick={() => onSelectScan?.(scan)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xs">{scan.analysis.brand.charAt(0)}</div>
                    <div className="text-left">
                      <span className="block text-[11px] font-black text-slate-900 uppercase italic truncate max-w-[120px]">{scan.analysis.brand} {scan.analysis.model}</span>
                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter block">{scan.analysis.vin?.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleCapture(e.target.files[0])} />
        <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleCapture(e.target.files[0])} />

        {isAnalyzingStep1 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl animate-in fade-in">
            <div className="bg-white p-14 rounded-[5rem] text-center shadow-2xl max-w-sm w-full mx-6 relative overflow-hidden border border-white/20">
              <Loader2 size={100} className="text-indigo-600 animate-spin mx-auto mb-10" />
              <p className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">KHABIR VISION</p>
              <p className="text-indigo-500 font-black mt-4 uppercase tracking-[0.3em] text-[11px] animate-pulse">RECHERCHE AUTOMOBILE...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
