import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Save,
  Wallet,
  ArrowRight,
  Download,
  Loader2,
  Users,
  Printer,
  Trash2,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { cn, handleDocumentUrl } from '../lib/utils';
import { SPPD, Employee } from '../types';
import { gasService } from '../services/gasService';
import { generateNarrative } from '../services/aiService';

const SPPDPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sppdList, setSppdList] = useState<SPPD[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLaporanForm, setShowLaporanForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Indonesian Date Formatter Helper
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "-";
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${d} ${months[m] || ''} ${y}`;
    }
    return dateStr;
  };

  // Form State
  const [formData, setFormData] = useState<Partial<SPPD>>({
    number: '',
    purpose: '',
    destination: '',
    dateStart: '',
    dateEnd: '',
    transport: 'Kendaraan Dinas Roda 4',
    budgetCode: '5.1.02.04.01.0001',
    basis: '',
    peopleCount: 1,
    employeeIds: ['']
  });

  useEffect(() => {
    Promise.all([
      gasService.getSPDList(), 
      gasService.getPegawai(),
      gasService.getConfig()
    ])
      .then(([sppds, emps, configData]) => {
        setSppdList(sppds);
        setEmployees(emps);
        setConfig(configData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data", err);
        setLoading(false);
      });
  }, []);

  const handlePeopleCountChange = (count: number) => {
    const newIds = [...(formData.employeeIds || [])];
    if (count > newIds.length) {
      for (let i = newIds.length; i < count; i++) newIds.push('');
    } else {
      newIds.splice(count);
    }
    setFormData({ ...formData, peopleCount: count, employeeIds: newIds });
  };

  const handleEmployeeChange = (index: number, id: string) => {
    const newIds = [...(formData.employeeIds || [])];
    newIds[index] = id;
    setFormData({ ...formData, employeeIds: newIds });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    gasService.saveSPD(formData)
      .then((res) => {
        const savedId = res.id;
        gasService.getSPDList().then(newList => setSppdList(newList));
        
        setSaving(false);
        setStatus({ type: 'success', message: 'SPPD Berhasil diterbitkan!' });
        
        // If it was the report form, trigger PDF print automatically with the latest formData
        if (showLaporanForm) {
          handlePrint(savedId || (formData.id as string) || '', 'Laporan', formData);
        }

        setTimeout(() => {
          setShowForm(false);
          setShowLaporanForm(false);
          setStatus(null);
        }, 2000);
      })
      .catch(err => {
        console.error("Save failed", err);
        setSaving(false);
        setStatus({ type: 'error', message: 'Gagal menerbitkan SPPD. Silakan cek koneksi.' });
      });
  };

  const handlePrint = (id: string, type: 'SPD' | 'Laporan' | 'SPJ', currentData?: any) => {
    setPrintingId(`${id}-${type}`);
    
    // Use currentData if provided (fresh from form), otherwise find in list
    const item = currentData || sppdList.find(s => s.id === id) || formData;
    const enrichedData = {
      ...item,
      kabupaten: config?.kabupaten || '',
      kecamatan: config?.kecamatan || '',
      desa: config?.nama_desa || '',
      KAB: (config?.kabupaten || '').replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, '').toUpperCase(),
      KEC: (config?.kecamatan || '').replace(/Kecamatan\s+/i, '').toUpperCase(),
      DESA: (config?.nama_desa || '').replace(/Desa\s+/i, '').toUpperCase(),
      // Add explicit report mappings for redundancy
      LAPORAN_1: item.laporan1 || '',
      LAPORAN_2: item.laporan2 || '',
      LAPORAN_3: item.laporan3 || '',
      HASIL_1: item.laporan1 || '',
      HASIL_2: item.laporan2 || '',
      HASIL_3: item.laporan3 || '',
      layout_mode: 'BEHIND_TEXT',
      layout: 'BEHIND_TEXT',
      force_global_replace: true
    };

    gasService.generateDocument(id, type, enrichedData)
      .then(url => {
        setPrintingId(null);
        handleDocumentUrl(url, type, item.number || id);
      })
      .catch(err => {
        setPrintingId(null);
        alert(err?.message || String(err));
      });
  };

  const handleNewSPD = () => {
    setFormData({
      number: '',
      purpose: '',
      destination: '',
      dateStart: '',
      dateEnd: '',
      transport: 'Kendaraan Dinas Roda 4',
      budgetCode: '5.1.02.04.01.0001',
      basis: '',
      peopleCount: 1,
      employeeIds: [''],
      laporan1: '',
      laporan2: '',
      laporan3: '',
      caption: '',
      fotoUrl: '',
      fotoId: ''
    });
    setShowForm(true);
    setShowLaporanForm(false);
    gasService.getNextSPPDNumber()
      .then(num => {
        setFormData(prev => ({ ...prev, number: num }));
      })
      .catch(err => console.error("Failed to fetch next number", err));
  };

  const handleLaporanEdit = (item: SPPD) => {
    setFormData(item);
    setShowForm(false);
    setShowLaporanForm(true);
  };

  const handleGenerateAI = async () => {
    if (!formData.laporan1) {
      alert("Harap isi ringkasan laporan di kolom 'Hasil Yang Dicapai 1' terlebih dahulu.");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateNarrative({
        maksud: formData.purpose || '',
        tujuan: formData.destination || '',
        catatanSingkat: formData.laporan1
      });
      
      setFormData({
        ...formData,
        laporan1: result.laporan1,
        laporan2: result.laporan2,
        laporan3: result.laporan3
      });
      setStatus({ type: 'success', message: 'Narasi berhasil disempurnakan oleh AI!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Gagal menggunakan AI. Silakan coba lagi.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          // Resize logic
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(image, 0, 0, width, height);

          // Get optimized base64
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // EXPERT FIX: Set local preview immediately
          const key = index !== undefined ? `fotoUrl${index + 1}` : 'fotoUrl';
          setFormData(prev => ({ ...prev, [key]: optimizedBase64 }));

          gasService.uploadFile(optimizedBase64, file.name.replace(/\.[^/.]+$/, "") + ".jpg")
            .then(res => {
              // Keep the base64 local preview for speed and reliability, update the Drive ID if it's the main one
              if (index === undefined) {
                setFormData(prev => ({ ...prev, fotoId: res.id }));
              }
              setUploading(false);
            })
            .catch(err => {
              console.warn("Background upload failed, using local preview fallback", err);
              setUploading(false);
            });
        };
        image.src = readerEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Memuat data SPPD...</p>
      </div>
    );
  }

  const filteredSppdList = [...sppdList].reverse().filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.number || '').toLowerCase().includes(q) ||
      (item.purpose || '').toLowerCase().includes(q) ||
      (item.destination || '').toLowerCase().includes(q) ||
      (item.employeeNames || []).some((name) => name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-right-2 duration-500 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Surat Perintah Perjalanan Dinas</h2>
          <p className="text-on-surface-variant font-medium mt-1">Sistem otomasi dokumen perjalanan dinas berstandar regulasi desa.</p>
        </div>
        {!showForm && (
          <button 
            onClick={handleNewSPD}
            className="bg-primary text-on-primary px-6 py-3 rounded-lg flex items-center gap-2 font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            <Plus size={20} />
            Buat SPPD Baru
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {!showForm && !showLaporanForm ? (
        <div className="space-y-8">
          {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: 'TOTAL SPPD', value: sppdList.length, color: 'border-t-primary' },
              { label: 'HARI INI', value: sppdList.filter(s => s.dateStart === new Date().toISOString().split('T')[0]).length, color: 'border-t-secondary' },
              { label: 'PEGAWAI AKTIF', value: employees.length, color: 'border-t-primary-container' },
            ].map((stat) => (
              <div key={stat.label} className={cn("bg-white p-6 border border-outline-variant rounded-xl border-t-4 shadow-sm", stat.color)}>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-2 tnum">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* List Table */}
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low/50">
              <h4 className="font-bold text-on-surface">Riwayat Perjalanan Dinas</h4>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor atau tujuan..." 
                    className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-xs outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F9] text-[#718096] text-[11px] font-bold uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">No. SPPD</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Pegawai</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Kegiatan / Tujuan</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Waktu</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm bg-white">
                  {filteredSppdList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1B4F8A]/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-primary tnum">{item.number}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.employeeNames?.map((name, i) => (
                            <span key={i} className="text-xs font-medium text-on-surface bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1A202C]">{item.purpose}</p>
                        <p className="text-xs text-[#718096] mt-0.5">{item.destination}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant tnum">
                        {formatDateIndo(item.dateStart)} s/d {formatDateIndo(item.dateEnd)}
                      </td>
                      <td className="px-6 py-4 text-right overflow-visible">
                        <div className="inline-block text-left relative m-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === item.id ? null : item.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2E86C1] hover:bg-[#1B4F8A] text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <span>Aksi</span>
                            <ChevronDown size={14} className={cn("transition-transform", activeDropdown === item.id ? "rotate-180" : "")} />
                          </button>
                          
                          {activeDropdown === item.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-left">
                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handleLaporanEdit(item);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#1B4F8A]/5 flex items-center gap-2"
                                >
                                  <ClipboardList size={14} className="text-[#2E86C1]" />
                                  <span>Isi/Edit Laporan</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    setFormData(item);
                                    setShowForm(true);
                                    setShowLaporanForm(false);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#1B4F8A]/5 flex items-center gap-2"
                                >
                                  <Edit3 size={14} className="text-[#2E86C1]" />
                                  <span>Edit Data SPPD</span>
                                </button>
                                <div className="border-t border-[#E2E8F0] my-1"></div>
                                <button
                                  disabled={printingId !== null}
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handlePrint(item.id, 'SPD');
                                  }}
                                  className="w-full px-4 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#1B4F8A]/5 flex items-center gap-2 disabled:opacity-50"
                                >
                                  {printingId === `${item.id}-SPD` ? <Loader2 size={14} className="animate-spin text-[#2E86C1]" /> : <Printer size={14} className="text-[#2E86C1]" />}
                                  <span>Cetak SPD</span>
                                </button>
                                <button
                                  disabled={printingId !== null}
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handlePrint(item.id, 'Laporan');
                                  }}
                                  className="w-full px-4 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#1B4F8A]/5 flex items-center gap-2 disabled:opacity-50"
                                >
                                  {printingId === `${item.id}-Laporan` ? <Loader2 size={14} className="animate-spin text-[#2E86C1]" /> : <FileText size={14} className="text-[#2E86C1]" />}
                                  <span>Cetak Laporan</span>
                                </button>
                                <button
                                  disabled={printingId !== null}
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handlePrint(item.id, 'SPJ');
                                  }}
                                  className="w-full px-4 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#1B4F8A]/5 flex items-center gap-2 disabled:opacity-50"
                                >
                                  {printingId === `${item.id}-SPJ` ? <Loader2 size={14} className="animate-spin text-[#2E86C1]" /> : <CreditCard size={14} className="text-[#2E86C1]" />}
                                  <span>Cetak SPJ</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSppdList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant font-medium">Belum ada data SPPD.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : showLaporanForm ? (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
           <div className="bg-white border border-outline-variant rounded-3xl shadow-xl overflow-hidden mb-12">
              <div className="bg-primary p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Laporan Perjalanan Dinas</h2>
                    <p className="opacity-90 font-medium tnum">Nomor: {formData.number}</p>
                  </div>
                  <button 
                    onClick={() => setShowLaporanForm(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* SPPD Context Summary */}
                <div className="bg-surface p-6 rounded-2xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-[11px]">
                   <div>
                     <p className="font-bold text-on-surface-variant uppercase mb-1">Maksud Perjalanan</p>
                     <p className="font-bold text-on-surface">{formData.purpose}</p>
                   </div>
                   <div>
                     <p className="font-bold text-on-surface-variant uppercase mb-1">Tujuan</p>
                     <p className="font-bold text-on-surface">{formData.destination}</p>
                   </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                   <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Hasil Yang Dicapai (Narasi Utama)</label>
                          <button
                            type="button"
                            disabled={generating || !formData.laporan1}
                            onClick={handleGenerateAI}
                            className="flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all shadow-sm active:scale-95 disabled:opacity-50 border border-primary/20"
                          >
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {generating ? 'Sempurnakan...' : '🤖 AI Sempurnakan Laporan'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <textarea 
                            required
                            value={formData.laporan1 || ''}
                            onChange={e => setFormData({...formData, laporan1: e.target.value})}
                            rows={3} 
                            className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                            placeholder="I. Pendahuluan & Koordinasi Awal..." 
                          />
                          <textarea 
                            value={formData.laporan2 || ''}
                            onChange={e => setFormData({...formData, laporan2: e.target.value})}
                            rows={3} 
                            className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                            placeholder="II. Pelaksanaan Kegiatan Utamanya..." 
                          />
                          <textarea 
                            value={formData.laporan3 || ''}
                            onChange={e => setFormData({...formData, laporan3: e.target.value})}
                            rows={3} 
                            className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                            placeholder="III. Kesimpulan & Penutup..." 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-6 border-t border-outline-variant pt-8">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-sm">
                             <Download size={14} />
                           </div>
                           <h3 className="font-black text-xs uppercase tracking-widest">Dokumentasi Foto Per Pelapor</h3>
                         </div>
                         <p className="text-[10px] text-on-surface-variant font-medium -mt-4 mb-4 uppercase tracking-wider">Masing-masing pelapor wajib memiliki satu foto dokumentasi yang unik.</p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {formData.employeeNames?.slice(0, formData.peopleCount).map((name, idx) => (
                              <div key={idx} className="flex flex-col gap-3 p-4 border border-outline-variant rounded-2xl bg-surface/30">
                                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest truncate">{name}</p>
                                <div className={cn(
                                  "relative aspect-[4/3] border border-dashed border-outline-variant rounded-xl overflow-hidden transition-all group flex flex-col items-center justify-center bg-white",
                                  (formData as any)[`fotoUrl${idx + 1}`] ? "border-solid border-secondary" : "hover:border-secondary"
                                )}>
                                  {(formData as any)[`fotoUrl${idx + 1}`] ? (
                                    <>
                                      <img src={(formData as any)[`fotoUrl${idx + 1}`]} alt="Preview" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <label className="p-2 bg-white text-on-surface rounded-lg cursor-pointer hover:bg-secondary/5 transition-colors shadow-lg">
                                          <Edit3 size={16} />
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, idx)} disabled={uploading} />
                                        </label>
                                        <button 
                                          type="button"
                                          onClick={() => setFormData({...formData, [`fotoUrl${idx + 1}`]: ''} as any)}
                                          className="p-2 bg-white text-error rounded-lg hover:bg-red-50 transition-colors shadow-lg"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <Plus size={16} className="text-on-surface-variant" />
                                      <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Upload Foto</p>
                                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, idx)} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-4">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Keterangan Umum (Caption)</label>
                          <input 
                            type="text"
                            value={formData.caption || ''}
                            onChange={e => setFormData({...formData, caption: e.target.value})}
                            className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all shadow-sm" 
                            placeholder="Contoh: Seluruh perangkat mengikuti apel pagi..." 
                          />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-6">
                          <button 
                            type="submit" 
                            disabled={saving || uploading}
                            className="flex-1 px-8 py-5 bg-primary text-white rounded-2xl font-black tracking-widest uppercase text-[11px] shadow-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                          >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? 'PROSES MENYIMPAN...' : 'SIMPAN & GENERATE LAPORAN'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setShowLaporanForm(false)}
                            className="px-8 py-5 bg-white text-on-surface border border-outline-variant rounded-2xl font-black tracking-widest uppercase text-[11px] hover:bg-surface active:scale-95 transition-all"
                          >
                            KEMBALI
                          </button>
                      </div>
                   </div>

                   {status && (
                    <div className={cn(
                      "p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300",
                      status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-on-error-container"
                    )}>
                      <div className="flex items-center gap-3">
                        {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-sm font-bold uppercase tracking-tight text-center flex-1">{status.message}</p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
           </div>
        </div>
      ) : (
        /* Form Creation */
        <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
          <div className="bg-white border border-outline-variant rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 bg-tertiary text-on-tertiary flex justify-between items-center">
              <div>
                <h4 className="text-xl font-bold flex items-center gap-2 italic">
                  <FileText className="text-primary-container" />
                  Penerbitan Surat Perintah Perjalanan Dinas
                </h4>
                <p className="text-xs text-on-tertiary/70 mt-1">Lengkapi data administratif untuk generate dokumen otomatis.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form className="p-8 space-y-10" onSubmit={handleSubmit}>
              {/* Seksi 1: Metadata */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                  <h5 className="font-bold text-on-surface uppercase tracking-widest text-xs">A. Data Administrasi & Tujuan</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nomor Surat</label>
                    <input 
                      required 
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none focus:border-primary transition-all font-mono" 
                      placeholder="Contoh: Nomor : 094/ST/V/2026" 
                    />
                  </div>
                   <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dasar (Legal Basis)</label>
                    <input 
                      required 
                      value={formData.basis}
                      onChange={e => setFormData({...formData, basis: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none focus:border-primary transition-all" 
                      placeholder="Contoh: PerDes No. 1 Th 2026" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tujuan / Lokasi</label>
                    <input 
                      required 
                      value={formData.destination}
                      onChange={e => setFormData({...formData, destination: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none focus:border-primary transition-all" 
                      placeholder="Contoh: Jakarta" 
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Maksud / Perihal Perjalanan</label>
                    <textarea 
                      required 
                      value={formData.purpose}
                      onChange={e => setFormData({...formData, purpose: e.target.value})}
                      rows={2} 
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none focus:border-primary transition-all resize-none" 
                      placeholder="Contoh: Koordinasi Anggaran Dana Desa Tahap I" 
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Pegawai */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-l-4 border-secondary pl-4">
                  <h5 className="font-bold text-on-surface uppercase tracking-widest text-xs">B. Personil Terlibat</h5>
                  <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
                    <label className="text-[10px] font-bold px-2 uppercase text-on-surface-variant">Jumlah Orang:</label>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button 
                        key={n}
                        type="button"
                        onClick={() => handlePeopleCountChange(n)}
                        className={cn(
                          "w-8 h-7 flex items-center justify-center rounded-md font-bold text-xs transition-all",
                          formData.peopleCount === n ? "bg-primary text-on-primary shadow-sm" : "hover:bg-surface-container-high"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.employeeIds?.map((empId, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 p-4 border border-outline-variant rounded-xl bg-surface/50">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Pegawai Ke-{idx + 1}</label>
                      <select 
                        required
                        value={empId}
                        onChange={e => handleEmployeeChange(idx, e.target.value)}
                        className="p-2 border border-outline-variant rounded-lg bg-white text-sm outline-none focus:border-secondary"
                      >
                        <option value="">-- Pilih Pegawai --</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seksi 3: Waktu & Transport */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-primary-container pl-4">
                  <h5 className="font-bold text-on-surface uppercase tracking-widest text-xs">C. Durasi & Logistik</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Tanggal Berangkat</label>
                    <input 
                      type="date" 
                      required
                      value={formData.dateStart}
                      onChange={e => setFormData({...formData, dateStart: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Tanggal Kembali</label>
                    <input 
                      type="date" 
                      required
                      value={formData.dateEnd}
                      onChange={e => setFormData({...formData, dateEnd: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Transportasi</label>
                    <select 
                      value={formData.transport}
                      onChange={e => setFormData({...formData, transport: e.target.value})}
                      className="p-3 bg-surface border border-outline-variant rounded-xl outline-none bg-white font-medium"
                    >
                      <option>Kendaraan Dinas Roda 4</option>
                      <option>Kendaraan Pribadi</option>
                      <option>Bus Umum</option>
                      <option>Pesawat Terbang</option>
                    </select>
                  </div>
                </div>
              </div>

              {status && (
                <div className={cn(
                  "p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300",
                  status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                  <p className="text-sm font-bold flex items-center gap-2">
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {status.message}
                  </p>
                </div>
              )}

              <div className="pt-8 border-t border-outline-variant flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="px-8 py-3 border border-outline text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all"
                >
                  Batal
                </button>
                <button 
                  disabled={saving}
                  type="submit"
                  className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  Simpan SPPD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPPDPage;
