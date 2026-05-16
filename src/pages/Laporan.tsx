import React, { useEffect, useState } from 'react';
import { 
  History, 
  ExternalLink, 
  FileText, 
  Download,
  Search,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
  X,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Sparkles
} from 'lucide-react';
import { gasService } from '../services/gasService';
import { generateNarrative } from '../services/aiService';
import { SPPD } from '../types';
import { cn } from '../lib/utils';

const Laporan: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [arsip, setArsip] = useState<any[]>([]);
  const [sppdList, setSppdList] = useState<SPPD[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  // Report Form State
  const [selectedSPPD, setSelectedSPPD] = useState<SPPD | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      gasService.getArsip(), 
      gasService.getSPDList(),
      gasService.getConfig()
    ])
      .then(([arsipData, sppdData, configData]) => {
        setArsip(arsipData.reverse());
        setSppdList(sppdData);
        setConfig(configData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const needsReport = sppdList.filter(s => !s.laporan1);
  const completedReports = sppdList.filter(s => s.laporan1);

  const handleOpenReport = (item: SPPD) => {
    setSelectedSPPD({...item});
    setStatus(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSPPD) {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(image, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // EXPERT FIX: Set preview immediately for revolutionary speed
          setSelectedSPPD(prev => prev ? ({ ...prev, fotoUrl: optimizedBase64 }) : null);

          gasService.uploadFile(optimizedBase64, file.name.replace(/\.[^/.]+$/, "") + ".jpg")
            .then(res => {
              // Keep the base64 fotoUrl for preview, only update the ID
              setSelectedSPPD(prev => prev ? ({ ...prev, fotoId: res.id }) : null);
              setUploading(false);
            })
            .catch(err => {
              console.error("Upload failed", err);
              setUploading(false);
            });
        };
        image.src = readerEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSPPD) return;

    setSaving(true);
    
    // Enrich with global placeholders if they exist
    const enrichedData = {
      ...selectedSPPD,
      kabupaten: config?.kabupaten || '',
      kecamatan: config?.kecamatan || '',
      desa: config?.nama_desa || '',
      KAB: (config?.kabupaten || '').replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, '').toUpperCase(),
      KEC: (config?.kecamatan || '').replace(/Kecamatan\s+/i, '').toUpperCase(),
      DESA: (config?.nama_desa || '').replace(/Desa\s+/i, '').toUpperCase(),
      layout_mode: 'BEHIND_TEXT', // Signal to GAS for layout optimization
      layout: 'BEHIND_TEXT',
      force_global_replace: true,
      image_width: 300, // Hint for fixed size
      image_height: 200
    };

    gasService.saveSPD(enrichedData)
      .then(() => {
        setStatus({ type: 'success', message: 'Laporan berhasil disimpan!' });
        
        // Refresh local list
        gasService.getSPDList().then(data => setSppdList(data));

        // Print automatically
        setPrinting(true);
        gasService.generateDocument(enrichedData.id, 'Laporan', enrichedData)
          .then(url => {
            window.open(url, '_blank');
            setPrinting(false);
            setTimeout(() => {
              setSelectedSPPD(null);
            }, 2000);
          })
          .catch(err => {
            setPrinting(false);
            console.error("Print failed", err);
            alert("Gagal cetak PDF: " + err.message);
          });
      })
      .catch(err => {
        setSaving(false);
        setStatus({ type: 'error', message: 'Gagal menyimpan laporan.' });
      });
  };

  const handleGenerateAI = async () => {
    if (!selectedSPPD || !selectedSPPD.laporan1) {
      alert("Harap isi ringkasan laporan di kolom 'Hasil Yang Dicapai 1' terlebih dahulu.");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateNarrative({
        maksud: selectedSPPD.purpose,
        tujuan: selectedSPPD.destination,
        catatanSingkat: selectedSPPD.laporan1
      });
      
      setSelectedSPPD({
        ...selectedSPPD,
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Memuat data laporan...</p>
      </div>
    );
  }

  if (selectedSPPD) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300 pb-20">
         <div className="bg-white border border-outline-variant rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-amber-600 p-8 text-white relative">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Input Hasil Laporan Perjalanan</h2>
                  <p className="opacity-90 font-medium tnum">ID SPPD: {selectedSPPD.number}</p>
                </div>
                <button onClick={() => setSelectedSPPD(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Context Summary */}
              <div className="bg-surface p-6 rounded-2xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Maksud Perjalanan</p>
                   <p className="text-sm font-bold text-on-surface">{selectedSPPD.purpose}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Tujuan</p>
                   <p className="text-sm font-bold text-on-surface">{selectedSPPD.destination}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Waktu</p>
                   <p className="text-sm font-bold text-on-surface tnum">{selectedSPPD.dateStart} s/d {selectedSPPD.dateEnd}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Pelapor</p>
                   <p className="text-sm font-bold text-on-surface">{selectedSPPD.employeeNames?.[0] || "-"}</p>
                 </div>
              </div>

              <form onSubmit={handleSaveReport} className="space-y-6">
                <div className="space-y-6">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex flex-col gap-2 tnum">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Hasil Yang Dicapai {n}</label>
                        {n === 1 && (
                          <button
                            type="button"
                            disabled={generating || !selectedSPPD.laporan1}
                            onClick={handleGenerateAI}
                            className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm active:scale-95 disabled:opacity-50 border border-amber-200"
                          >
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {generating ? 'Sempurnakan...' : '🤖 Sempurnakan Laporan'}
                          </button>
                        )}
                      </div>
                      <textarea 
                        required={n === 1}
                        value={(selectedSPPD as any)[`laporan${n}`] || ''}
                        onChange={e => setSelectedSPPD({...selectedSPPD, [`laporan${n}`]: e.target.value})}
                        rows={3} 
                        className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-amber-600 shadow-sm" 
                        placeholder={n === 1 ? "Contoh: Menyerahkan laporan bantuan modal..." : `Masukkan poin laporan ke-${n}...`} 
                      />
                    </div>
                  ))}

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Foto Dokumentasi</label>
                       <div className={cn(
                          "relative aspect-video border-2 border-dashed border-outline-variant rounded-2xl overflow-hidden transition-all group flex flex-col items-center justify-center gap-3",
                          selectedSPPD.fotoUrl ? "border-solid border-amber-600" : "bg-surface hover:bg-white hover:border-amber-600"
                        )}>
                          {selectedSPPD.fotoUrl ? (
                            <>
                              <img src={selectedSPPD.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label className="p-3 bg-white text-on-surface rounded-xl cursor-pointer">
                                  <Edit3 size={20} />
                                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                                <button type="button" onClick={() => setSelectedSPPD({...selectedSPPD, fotoUrl: '', fotoId: ''})} className="p-3 bg-white text-error rounded-xl">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </>
                          ) : uploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="animate-spin text-amber-600" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Mengunggah...</span>
                            </div>
                          ) : (
                            <div className="text-center group-hover:scale-110 transition-transform">
                              <ImageIcon className="mx-auto mb-2 text-on-surface-variant" size={32} />
                              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Klik untuk Upload Foto</p>
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                            </div>
                          )}
                       </div>
                       
                       {/* ELEGANT PROGRESS LINE */}
                       {uploading && (
                         <div className="w-full h-1 bg-surface border border-outline-variant rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-amber-600 animate-[progress_2s_infinite_linear]" style={{ width: '40%' }}></div>
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col gap-4">
                       <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Keterangan Foto</label>
                          <textarea 
                           value={selectedSPPD.caption || ''}
                           onChange={e => setSelectedSPPD({...selectedSPPD, caption: e.target.value})}
                           rows={5} 
                           className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-amber-600 shadow-sm resize-none" 
                           placeholder="Contoh: Foto bersama narasumber..." 
                         />
                       </div>

                       {/* Action Buttons Tucked Here */}
                       <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button 
                           disabled={saving || printing || uploading}
                           className="flex-1 px-6 py-4 bg-amber-600 text-white rounded-2xl font-black tracking-widest uppercase text-[10px] shadow-lg hover:bg-amber-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5"
                          >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {printing ? 'MENYIAPKAN PDF...' : saving ? 'MENYIMPAN...' : 'SIMPAN & CETAK'}
                          </button>
                          <button 
                           type="button" 
                           onClick={() => setSelectedSPPD(null)} 
                           className="px-6 py-4 bg-white text-on-surface border border-outline-variant rounded-2xl font-bold text-[10px] uppercase hover:bg-surface tracking-widest"
                          >
                             Batal
                          </button>
                       </div>
                    </div>
                  </div>
                </div>

                {status && (
                  <div className={cn(
                    "p-4 rounded-xl border animate-in slide-in-from-top-2",
                    status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
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
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Laporan & Arsip Perjalanan</h2>
          <p className="text-on-surface-variant font-medium mt-1">Kelola hasil perjalanan dinas dan akses dokumen terdahulu.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-xs font-bold hover:bg-surface transition-all"
        >
          <History size={14} className={loading ? "animate-spin" : ""} />
          Perbarui Data
        </button>
      </div>

      {/* Section: Needs Report */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Perlu Pengisian Laporan ({needsReport.length})</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {needsReport.map(item => (
            <div key={item.id} className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 tnum">{item.number}</p>
              <h4 className="font-bold text-on-surface mb-1 line-clamp-1">{item.purpose}</h4>
              <p className="text-xs text-on-surface-variant mb-4">{item.destination}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                <span className="text-[10px] font-medium text-on-surface-variant tnum">{item.dateStart}</span>
                <button 
                  onClick={() => handleOpenReport(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Isi Laporan
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
          {needsReport.length === 0 && (
            <div className="col-span-full bg-surface-container-low/30 border border-dashed border-outline-variant rounded-xl p-8 text-center">
              <p className="text-sm font-medium text-on-surface-variant">Hore! Semua perjalanan dinas telah dilaporkan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Section: Completed Reports */}
      <div className="space-y-4 pt-8">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Laporan Selesai ({completedReports.length})</h3>
        </div>
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4">Nomor SPPD</th>
                    <th className="px-6 py-4">Maksud Perjalanan</th>
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {completedReports.map(item => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 font-bold text-primary tnum">{item.number}</td>
                      <td className="px-6 py-4 text-on-surface font-medium truncate max-w-xs">{item.purpose}</td>
                      <td className="px-6 py-4 text-on-surface-variant tnum">{item.dateStart}</td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button 
                            onClick={() => {
                              setPrinting(true);
                              const enriched = {
                                ...item,
                                KAB: (config?.kabupaten || '').replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, '').toUpperCase(),
                                KEC: (config?.kecamatan || '').replace(/Kecamatan\s+/i, '').toUpperCase(),
                                DESA: (config?.nama_desa || '').replace(/Desa\s+/i, '').toUpperCase(),
                                layout_mode: 'BEHIND_TEXT',
                                force_global_replace: true
                              };
                              gasService.generateDocument(item.id, 'Laporan', enriched)
                                .then(url => {
                                  window.open(url, '_blank');
                                  setPrinting(false);
                                })
                                .catch(err => {
                                  setPrinting(false);
                                  alert("Gagal cetak PDF: " + err.message);
                                });
                            }}
                            className="p-1.5 bg-surface border border-outline-variant rounded hover:bg-amber-600/5 text-amber-600 transition-all font-bold flex items-center gap-1 px-3"
                            title="Cetak PDF"
                            disabled={printing}
                           >
                              {printing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              Cetak
                           </button>
                           <button 
                            onClick={() => handleOpenReport(item)}
                            className="p-1.5 bg-surface border border-outline-variant rounded hover:bg-amber-600/5 text-on-surface transition-all"
                            title="Edit Data"
                           >
                              <Edit3 size={16} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* Section: Archive Log (Original Arisp Section) */}
      <div className="space-y-4 pt-12 opacity-80">
        <div className="flex items-center gap-2 text-primary">
          <History size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Arsip & Log Dokumen</h3>
        </div>
        
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Waktu Generate</th>
                  <th className="px-6 py-4">Nomor SPPD</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4">Nama File</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                {arsip.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-on-surface-variant tnum flex items-center gap-2">
                      <Calendar size={14} />
                      {item.date_generated}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{item.sppd_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        item.tipe_dokumen === 'SPD' ? 'bg-primary/5 text-primary border-primary/20' : 
                        item.tipe_dokumen === 'Laporan' ? 'bg-secondary/5 text-secondary border-secondary/20' : 
                        'bg-tertiary/5 text-tertiary border-tertiary/20'
                      }`}>
                        {item.tipe_dokumen}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-on-surface-variant max-w-xs truncate">
                      {item.file_name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={item.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-outline-variant rounded-lg hover:bg-primary hover:text-white transition-all text-xs font-bold"
                      >
                        Buka Dokumen
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
                {arsip.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant font-medium">Belum ada dokumen yang di-arsip.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Laporan;
