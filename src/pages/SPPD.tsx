import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
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
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SPPD, Employee } from '../types';
import { gasService } from '../services/gasService';
import { generateNarrative } from '../services/aiService';

const SPPDPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sppdList, setSppdList] = useState<SPPD[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLaporanForm, setShowLaporanForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [generating, setGenerating] = useState(false);

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
        window.open(url, '_blank');
      })
      .catch(err => {
        setPrintingId(null);
        alert(err.message);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setFormData(prev => ({ ...prev, fotoUrl: optimizedBase64 }));

          gasService.uploadFile(optimizedBase64, file.name.replace(/\.[^/.]+$/, "") + ".jpg")
            .then(res => {
              // Keep the base64 local preview for speed and reliability, update the Drive ID
              setFormData(prev => ({ ...prev, fotoId: res.id }));
              setUploading(false);
            })
            .catch(err => {
              console.error("Upload failed", err);
              alert("Gagal upload foto: " + err);
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
                  <input type="text" placeholder="Cari nomor atau tujuan..." className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-xs outline-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b border-outline-variant">No. SPPD</th>
                    <th className="px-6 py-4 border-b border-outline-variant">Pegawai</th>
                    <th className="px-6 py-4 border-b border-outline-variant">Kegiatan / Tujuan</th>
                    <th className="px-6 py-4 border-b border-outline-variant">Waktu</th>
                    <th className="px-6 py-4 border-b border-outline-variant text-right">Opsi Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {sppdList.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4 font-bold text-primary tnum">{item.number}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.employeeNames?.map((name, i) => (
                            <span key={i} className="text-xs font-medium text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full w-fit">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">{item.purpose}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{item.destination}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant tnum">
                        {item.dateStart} s/d {item.dateEnd}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleLaporanEdit(item)}
                            className="p-2 bg-surface hover:bg-primary/10 hover:text-primary border border-outline-variant rounded-lg transition-all" 
                            title="Buat Laporan"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setFormData(item);
                              setShowForm(true);
                              setShowLaporanForm(false);
                            }}
                            className="p-2 bg-surface hover:bg-secondary-container hover:text-secondary border border-outline-variant rounded-lg transition-all" 
                            title="Edit Data SPPD"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            disabled={printingId !== null}
                            onClick={() => handlePrint(item.id, 'SPD')} 
                            className="p-2 bg-surface hover:bg-primary hover:text-white border border-outline-variant rounded-lg transition-all disabled:opacity-50" 
                            title="Cetak SPD"
                          >
                            {printingId === `${item.id}-SPD` ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                          </button>
                          <button 
                            disabled={printingId !== null}
                            onClick={() => handlePrint(item.id, 'Laporan')} 
                            className="p-2 bg-surface hover:bg-secondary hover:text-white border border-outline-variant rounded-lg transition-all disabled:opacity-50" 
                            title="Cetak Laporan"
                          >
                            {printingId === `${item.id}-Laporan` ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                          </button>
                          <button 
                            disabled={printingId !== null}
                            onClick={() => handlePrint(item.id, 'SPJ')} 
                            className="p-2 bg-surface hover:bg-tertiary hover:text-white border border-outline-variant rounded-lg transition-all disabled:opacity-50" 
                            title="Cetak SPJ"
                          >
                            {printingId === `${item.id}-SPJ` ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sppdList.length === 0 && (
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
        <div className="max-w-3xl mx-auto animate-in fade-in zoom-in duration-300">
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
                <div className="bg-surface p-6 rounded-2xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                   <div>
                     <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Maksud Perjalanan</p>
                     <p className="text-sm font-bold text-on-surface">{formData.purpose}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Tujuan</p>
                     <p className="text-sm font-bold text-on-surface">{formData.destination}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Waktu</p>
                     <p className="text-sm font-bold text-on-surface tnum">{formData.dateStart} s/d {formData.dateEnd}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Pelapor</p>
                     <p className="text-sm font-bold text-on-surface">{formData.employeeNames?.[0] || "-"}</p>
                   </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Hasil Yang Dicapai 1</label>
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
                        <textarea 
                          required
                          value={formData.laporan1 || ''}
                          onChange={e => setFormData({...formData, laporan1: e.target.value})}
                          rows={3} 
                          className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                          placeholder="Masukkan rincian singkat kegiatan di sini, lalu klik AI Sempurnakan..." 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Hasil Yang Dicapai 2</label>
                        <textarea 
                          value={formData.laporan2 || ''}
                          onChange={e => setFormData({...formData, laporan2: e.target.value})}
                          rows={3} 
                          className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                          placeholder="Hasil lanjutan kegiatan..." 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Hasil Yang Dicapai 3</label>
                        <textarea 
                          value={formData.laporan3 || ''}
                          onChange={e => setFormData({...formData, laporan3: e.target.value})}
                          rows={3} 
                          className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                          placeholder="Kesimpulan atau penutup kegiatan..." 
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Foto Dokumentasi</label>
                          <div className={cn(
                            "relative aspect-video border-2 border-dashed border-outline-variant rounded-2xl overflow-hidden transition-all group flex flex-col items-center justify-center gap-3",
                            formData.fotoUrl ? "border-solid border-primary" : "bg-surface hover:bg-white hover:border-primary"
                          )}>
                            {formData.fotoUrl ? (
                              <>
                                <img src={formData.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <label className="p-3 bg-white text-on-surface rounded-xl cursor-pointer hover:bg-primary/5 transition-colors shadow-lg">
                                    <Edit3 size={20} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, fotoUrl: ''})}
                                    className="p-3 bg-white text-error rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </>
                            ) : uploading ? (
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="animate-spin text-primary" size={32} />
                                <p className="text-xs font-bold text-primary">MENGUNGGAH...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-primary/5 text-primary rounded-full group-hover:scale-110 transition-transform">
                                  <Plus size={24} />
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-1">Pilih Foto</p>
                                  <p className="text-[9px] text-on-surface-variant uppercase font-medium">JPEG, PNG Max 5MB</p>
                                </div>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                              </div>
                            )}
                          </div>
                          
                          {/* ELEGANT PROGRESS LINE */}
                          {uploading && (
                            <div className="w-full h-1 bg-surface border border-outline-variant rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-primary animate-[progress_2s_infinite_linear]" style={{ width: '40%' }}></div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-4">
                           <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Keterangan Foto</label>
                              <textarea 
                                value={formData.caption || ''}
                                onChange={e => setFormData({...formData, caption: e.target.value})}
                                rows={5} 
                                className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all resize-none shadow-sm" 
                                placeholder="Contoh: Foto bersama bupati..." 
                              />
                           </div>

                           <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              <button 
                                type="submit" 
                                disabled={saving || uploading}
                                className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black tracking-widest uppercase text-[10px] shadow-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
                              >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'MENYIMPAN...' : 'SIMPAN LAPORAN'}
                              </button>
                              <button 
                                type="button"
                                onClick={() => setShowLaporanForm(false)}
                                className="px-6 py-4 bg-white text-on-surface border border-outline-variant rounded-2xl font-black tracking-widest uppercase text-[10px] hover:bg-surface active:scale-95 transition-all"
                              >
                                BATAL
                              </button>
                           </div>
                        </div>
                      </div>
                   </div>

                   {status && (
                    <div className={cn(
                      "p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300",
                      status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-on-error-container"
                    )}>
                      <div className="flex items-center gap-3">
                        {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-sm font-bold uppercase tracking-tight">{status.message}</p>
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
                      placeholder="Contoh: 094/SPPD/2026" 
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
