import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Search, 
  Calendar, 
  Loader2, 
  AlertCircle,
  Save,
  CheckCircle2,
  X,
  History,
  Coins,
  Receipt
} from 'lucide-react';
import { gasService } from '../services/gasService';
import { SPPD } from '../types';
import { cn, handleDocumentUrl } from '../lib/utils';

const SPJ: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sppdList, setSppdList] = useState<SPPD[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [selectedSPPD, setSelectedSPPD] = useState<SPPD | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [printing, setPrinting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      gasService.getSPDList(),
      gasService.getConfig()
    ])
      .then(([sppdData, configData]) => {
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

  const needsSPJ = [...sppdList].reverse().filter(s => !s.uangHarian || s.uangHarian === 0);
  const completedSPJ = [...sppdList].reverse().filter(s => s.uangHarian && s.uangHarian > 0);

  const handleOpenSPJ = (item: SPPD) => {
    setSelectedSPPD({
      ...item,
      uangHarian: item.uangHarian || 0,
      uangBBM: item.uangBBM || 0,
      tglBayar: item.tglBayar || new Date().toISOString().split('T')[0]
    });
    setStatus(null);
  };

  const handleSaveSPJ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSPPD) return;

    setSaving(true);
    const enrichedData = {
      ...selectedSPPD,
      kabupaten: config?.kabupaten || '',
      kecamatan: config?.kecamatan || '',
      desa: config?.nama_desa || '',
      KAB: (config?.kabupaten || '').replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, '').toUpperCase(),
      KEC: (config?.kecamatan || '').replace(/Kecamatan\s+/i, '').toUpperCase(),
      DESA: (config?.nama_desa || '').replace(/Desa\s+/i, '').toUpperCase(),
      layout_mode: 'BEHIND_TEXT',
      layout: 'BEHIND_TEXT',
      force_global_replace: true,
      image_width: 300,
      image_height: 200
    };

    gasService.saveSPD(enrichedData)
      .then(() => {
        setStatus({ type: 'success', message: 'Data SPJ berhasil disimpan!' });
        
        // Refresh local list
        gasService.getSPDList().then(data => setSppdList(data));

        // Print automatically
        setPrinting(true);
        gasService.generateDocument(enrichedData.id, 'SPJ', enrichedData)
          .then(url => {
            setPrinting(false);
            handleDocumentUrl(url, 'SPJ', enrichedData.number || enrichedData.id);
            setTimeout(() => {
              setSelectedSPPD(null);
            }, 2000);
          })
          .catch(err => {
            setPrinting(false);
            console.error("Print failed", err);
            alert("Gagal cetak PDF SPJ: " + (err?.message || String(err)));
          });
      })
      .catch(err => {
        setSaving(false);
        setStatus({ type: 'error', message: 'Gagal menyimpan data SPJ.' });
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-on-surface-variant font-medium">Memuat data SPJ...</p>
      </div>
    );
  }

  if (selectedSPPD) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300 pb-20">
         <div className="bg-white border border-outline-variant rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-primary p-8 text-white relative">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Input Rincian Biaya (SPJ)</h2>
                  <p className="opacity-90 font-medium tnum">ID SPPD: {selectedSPPD.number}</p>
                </div>
                <button onClick={() => setSelectedSPPD(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-surface p-6 rounded-2xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Maksud Perjalanan</p>
                   <p className="text-sm font-bold text-on-surface">{selectedSPPD.purpose}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Tujuan</p>
                   <p className="text-sm font-bold text-on-surface">{selectedSPPD.destination}</p>
                 </div>
              </div>

              <form onSubmit={handleSaveSPJ} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Uang Harian (Rp)</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                      <input 
                        type="number" 
                        required 
                        value={selectedSPPD.uangHarian || ''}
                        onChange={e => setSelectedSPPD({...selectedSPPD, uangHarian: Number(e.target.value)})}
                        className="w-full pl-12 pr-4 py-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary shadow-sm font-bold tnum text-lg" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Uang BBM / Transport (Rp)</label>
                    <div className="relative">
                      <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                      <input 
                        type="number" 
                        required 
                        value={selectedSPPD.uangBBM || ''}
                        onChange={e => setSelectedSPPD({...selectedSPPD, uangBBM: Number(e.target.value)})}
                        className="w-full pl-12 pr-4 py-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary shadow-sm font-bold tnum text-lg" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose">Tanggal Pembayaran</label>
                  <input 
                    type="date" 
                    required 
                    value={selectedSPPD.tglBayar ? selectedSPPD.tglBayar.split('T')[0] : ''}
                    onChange={e => setSelectedSPPD({...selectedSPPD, tglBayar: e.target.value})}
                    className="p-4 bg-surface border border-outline-variant rounded-2xl outline-none focus:border-primary shadow-sm tnum font-bold" 
                  />
                </div>

                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
                   <div className="flex justify-between items-center">
                      <span className="font-bold text-primary text-sm uppercase tracking-widest">Total Biaya SPJ</span>
                      <span className="text-2xl font-black text-primary tnum">
                        Rp. {((selectedSPPD.uangHarian || 0) + (selectedSPPD.uangBBM || 0)).toLocaleString('id-ID')}
                      </span>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 pt-6">
                   <button 
                    disabled={saving || printing}
                    className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-lg hover:bg-primary-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                     {printing ? 'MENYIAPKAN PDF...' : saving ? 'MENYIMPAN...' : 'SIMPAN & CETAK SPJ'}
                   </button>
                   <button type="button" onClick={() => setSelectedSPPD(null)} className="px-8 py-4 bg-white text-on-surface border border-outline-variant rounded-2xl font-bold text-xs uppercase hover:bg-surface">
                     Batal
                   </button>
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
          <h2 className="text-3xl font-bold text-on-surface">Surat Pertanggungjawaban (SPJ)</h2>
          <p className="text-on-surface-variant font-medium mt-1">Input rincian biaya dan generate dokumen SPJ perjalanan dinas.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-xs font-bold hover:bg-surface transition-all"
        >
          <History size={14} className={loading ? "animate-spin" : ""} />
          Perbarui Data
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <AlertCircle size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Perlu SPJ ({needsSPJ.length})</h3>
        </div>
        
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F9] text-[#718096] text-[11px] font-bold uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Nomor SPPD</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Maksud Perjalanan</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Waktu</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm bg-white">
                  {needsSPJ.map(item => (
                    <tr key={item.id} className="hover:bg-[#1B4F8A]/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary tnum">{item.number}</td>
                      <td className="px-6 py-4 text-on-surface font-medium truncate max-w-xs">{item.purpose}</td>
                      <td className="px-6 py-4 text-on-surface-variant tnum">{formatDateIndo(item.dateStart)}</td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleOpenSPJ(item)}
                              className="px-3 py-1.5 bg-[#1B4F8A] hover:bg-[#1B4F8A]/80 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Buat SPJ</span>
                              <FileText size={14} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {needsSPJ.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant font-medium">Hebat! Semua rincian biaya SPJ telah diinput.</td>
                    </tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <History size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Data SPJ Selesai</h3>
        </div>
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F9] text-[#718096] text-[11px] font-bold uppercase tracking-wide border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Nomor SPPD</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Maksud Perjalanan</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Tgl Bayar</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0]">Total Biaya</th>
                    <th className="px-6 py-4 border-b border-[#E2E8F0] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm bg-white">
                  {completedSPJ.map(item => (
                    <tr key={item.id} className="hover:bg-[#1B4F8A]/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary tnum">{item.number}</td>
                      <td className="px-6 py-4 text-on-surface font-medium truncate max-w-xs">{item.purpose}</td>
                      <td className="px-6 py-4 text-on-surface-variant tnum">{formatDateIndo(item.tglBayar)}</td>
                      <td className="px-6 py-4 font-bold text-on-surface tnum">Rp. {((item.uangHarian || 0) + (item.uangBBM || 0)).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button 
                            onClick={() => {
                              setPrinting(true);
                              const enriched = {
                                ...item,
                                kabupaten: config?.kabupaten || '',
                                kecamatan: config?.kecamatan || '',
                                desa: config?.nama_desa || '',
                                KAB: (config?.kabupaten || '').replace(/Kabupaten\s+/i, '').replace(/Kota\s+/i, '').toUpperCase(),
                                KEC: (config?.kecamatan || '').replace(/Kecamatan\s+/i, '').toUpperCase(),
                                DESA: (config?.nama_desa || '').replace(/Desa\s+/i, '').toUpperCase(),
                                layout_mode: 'BEHIND_TEXT',
                                force_global_replace: true
                              };

                              gasService.generateDocument(item.id, 'SPJ', enriched)
                                .then(url => {
                                  setPrinting(false);
                                  handleDocumentUrl(url, 'SPJ', item.number || item.id);
                                })
                                .catch(err => {
                                  setPrinting(false);
                                  alert("Gagal cetak PDF: " + (err?.message || String(err)));
                                });
                            }}
                            className="p-1.5 bg-surface border border-outline-variant rounded hover:bg-primary/5 text-primary transition-all"
                            title="Cetak PDF"
                            disabled={printing}
                           >
                              {printing ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                           </button>
                           <button 
                            onClick={() => handleOpenSPJ(item)}
                            className="p-1.5 bg-surface border border-outline-variant rounded hover:bg-primary/5 text-primary transition-all"
                            title="Edit Data"
                           >
                              <FileText size={16} />
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
    </div>
  );
};

export default SPJ;
