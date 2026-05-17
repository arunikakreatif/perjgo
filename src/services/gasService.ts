import { Employee, SPPD } from '../types';

/**
 * Service to bridge between React and Google Apps Script (GAS)
 * As requested, uses google.script.run for all backend calls.
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxHkYQV_rouL0ZsHBNe2IZw5S2kIe6vzI7_GyupGr4lvELt0z_gfwHbf_IAQh1a_PHHog/exec';

export interface TenantInfo {
  villageName: string;
  ssId: string;
  folderId: string;
  villageCode: string;
}

const getStoredTenant = (): TenantInfo | null => {
  const json = localStorage.getItem('perjadin_tenant');
  return json ? JSON.parse(json) : null;
};

export const logout = () => {
  localStorage.removeItem('perjadin_tenant');
  window.location.reload();
};

// Helper to run GAS functions or return an error if not in GAS environment
const runGas = <T>(functionName: string, ...args: any[]): Promise<T> => {
  const tenant = getStoredTenant();
  
  return new Promise((resolve, reject) => {
    // 1. Try native google.script.run (when hosted on Google)
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      // In multi-tenant, we might need a way to pass context to native calls too
      // For now, assume native calls use the bound sheet or we inject globals later
      google.script.run
        .withSuccessHandler((result: T) => resolve(result))
        .withFailureHandler((error: Error) => reject(error))
        [functionName](...args);
    } 
    // 2. Fallback to API call (when in AI Studio preview)
    else {
      console.log(`GAS function "${functionName}" called to ${GAS_URL}`);
      
      const payload = {
        action: functionName,
        arguments: args,
        ssId: tenant?.ssId // Injeksi ssId desa
      };

      const payloadString = JSON.stringify(payload);
      
      // Use POST for larger data (like uploadFile) or everything to be consistent
      // Using 'text/plain' helps avoid CORS preflight (OPTIONS) which GAS doesn't handle well
      fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: payloadString
      })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (data && data.error) {
            console.error("GAS Script Error:", data.error);
            // Jika ada error dari script, kita tetap ingin tahu, bukan fallback ke mock
            reject(data.error);
          } else {
            console.log(`GAS Success [${functionName}]:`, data);
            resolve(data as T);
          }
        })
        .catch(err => {
          console.warn(`Gagal terhubung ke Apps Script untuk fungsi "${functionName}". Menggunakan data simulasi (Mock).`, err);
          mockFallback(functionName, args, resolve, reject);
        });
    }
  });
};

// Fallback logic for AI Studio Preview
const mockFallback = (name: string, args: any[], resolve: any, reject: any) => {
  const getMockData = () => {
    const stored = localStorage.getItem('perjadin_mock_data');
    if (stored) return JSON.parse(stored);
    
    const initial = {
      stats: {
        pegawai: 15,
        sppd: 42,
        laporan: 38,
        spj: 25,
        chart: [65, 40, 85, 30, 55, 70],
        recentActivities: [
          { id: '1', title: 'SPPD Disetujui: Perjalanan ke Jakarta', subtitle: 'Oleh: Kepala Desa - Baru saja', status: 'Selesai', type: 'SPPD' },
          { id: '2', title: 'Laporan Baru: Kunjungan Kerja', subtitle: 'Oleh: Sekretaris Desa - 10 menit lalu', status: 'Baru', type: 'Laporan' },
          { id: '3', title: 'SPJ Selesai: Biaya Perjalanan', subtitle: 'Bendahara - 1 jam lalu', status: 'Selesai', type: 'SPJ' },
        ]
      },
      pegawai: [
        { id: '1', name: 'Andi Setiawan, S.Kom', nik: '3201234567890001', position: 'Sekretaris Desa', address: 'Jl. Merdeka No. 45' },
        { id: '2', name: 'Siti Aminah', nik: '3201234567890002', position: 'Bendahara', address: 'Blok C No. 12' },
        { id: '3', name: 'Budi Raharjo', nik: '3201234567890003', position: 'Kaur Perencanaan', address: 'Kp. Sawah RT 02/05' },
      ],
      sppd: [
        { 
          id: '1', 
          number: '094/SPPD/2023', 
          employeeNames: ['Haryanto Nugroho'], 
          employeeIds: ['emp1', '', '', '', ''],
          purpose: 'Koordinasi Anggaran Desa 2024', 
          destination: 'Jakarta', 
          dateStart: '2023-10-15', 
          dateEnd: '2023-10-17',
          laporan1: 'Melakukan koordinasi...',
          laporan2: '',
          laporan3: '',
          caption: 'Foto rapat'
        },
      ]
    };
    localStorage.setItem('perjadin_mock_data', JSON.stringify(initial));
    return initial;
  };

  const updateMockData = (updater: (data: any) => any) => {
    const data = getMockData();
    const newData = updater(data);
    localStorage.setItem('perjadin_mock_data', JSON.stringify(newData));
    return newData;
  };

  setTimeout(() => {
    const data = getMockData();

    switch (name) {
      case 'getDashboardStats':
        resolve(data.stats);
        break;
      case 'getConfig':
        resolve({
          nama_desa: 'Desa Mandiri',
          kecamatan: 'Kecamatan Digital',
          kabupaten: 'Kabupaten Teknologi',
          tahun_anggaran: 2026,
          kode_anggaran: '01.02.03',
          kepala_desa: 'H. SUDIRMAN',
          sekretaris_desa: 'Andi Setiawan, S.Kom',
          bendahara: 'Siti Aminah',
          alamat_kantor: 'Jl. Raya Poncol No. 1, Magetan',
          email: 'desa.mandiri@digital.go.id',
          web: 'www.desamandiri.id',
          kodepos: '63362',
          folder_pdf_id: '',
          templates: [
            { type: 'SPD', count: 1, templateId: '' },
            { type: 'SPD', count: 2, templateId: '' },
            { type: 'Laporan', count: 1, templateId: '' },
            { type: 'SPJ', count: 1, templateId: '' },
          ]
        });
        break;
      case 'getPegawai':
        resolve(data.pegawai);
        break;
      case 'getSPDList':
        resolve(data.sppd);
        break;
      case 'saveSPD': {
        const payload = args[0];
        const isUpdate = !!payload.id;
        const newSPD = isUpdate ? payload : { ...payload, id: Math.random().toString(36).substr(2, 9) };
        
        updateMockData(d => {
          if (isUpdate) {
            d.sppd = d.sppd.map((s: any) => s.id === payload.id ? newSPD : s);
          } else {
            d.sppd.unshift(newSPD);
            d.stats.sppd += 1;
            // Add to recent activities
            d.stats.recentActivities.unshift({
               id: Math.random().toString(),
               title: `SPPD Baru: ${newSPD.purpose}`,
               subtitle: `Tujuan: ${newSPD.destination} - Baru saja`,
               status: 'Baru',
               type: 'SPPD'
            });
            // Keep it clean
            if (d.stats.recentActivities.length > 5) d.stats.recentActivities.pop();
          }
          return d;
        });
        resolve({ status: 'success', id: newSPD.id });
        break;
      }
      case 'tambahPegawai': {
        const newEmp = { ...args[0], id: Math.random().toString(36).substr(2, 9) };
        updateMockData(d => {
          d.pegawai.unshift(newEmp);
          d.stats.pegawai += 1;
          d.stats.recentActivities.unshift({
            id: Math.random().toString(),
            title: `Pegawai Baru: ${newEmp.name}`,
            subtitle: `Jabatan: ${newEmp.position} - Baru saja`,
            status: 'Aktif',
            type: 'Pegawai'
          });
          if (d.stats.recentActivities.length > 5) d.stats.recentActivities.pop();
          return d;
        });
        resolve({ status: 'success' });
        break;
      }
      case 'updateConfig':
      case 'editPegawai':
      case 'hapusPegawai':
        console.log(`Command ${name} executed with:`, args);
        resolve({ status: 'success' });
        break;
      case 'uploadFile':
        console.log(`Command ${name} executed with dummy file`);
        resolve({ url: 'https://placehold.co/600x400?text=Mock+Upload+Success', id: 'mock-id' });
        break;
      case 'loginByCode':
        if (args[0] === '12345') {
          resolve({
            status: 'success',
            villageName: 'Desa Majapahit (Demo)',
            ssId: 'dummy-ss-id',
            folderId: 'dummy-folder-id',
            villageCode: '12345'
          });
        } else {
          resolve({ status: 'error', message: 'Kode salah (Gunakan 12345 for demo)' });
        }
        break;
      case 'getNextSPPDNumber':
        resolve(`00${data.sppd.length + 1}/SPPD/V/2026`);
        break;
      case 'generateDocument':
        console.log(`Mock Document Generation for SPPD ${args[0]} of type ${args[1]}`);
        resolve("https://docs.google.com/document/d/1demo-url-for-preview/edit");
        break;
      default:
        reject(new Error(`Function ${name} not found`));
    }
  }, 800);
};

export const gasService = {
  getDashboardStats: () => runGas<any>('getDashboardStats'),
  getConfig: () => runGas<any>('getConfig'),
  updateConfig: (data: any) => runGas<any>('updateConfig', data),
  getPegawai: () => runGas<Employee[]>('getPegawai'),
  simpanPegawai: (data: Partial<Employee>) => runGas<any>('tambahPegawai', data),
  tambahPegawai: (data: Partial<Employee>) => runGas<any>('tambahPegawai', data),
  editPegawai: (id: string, data: Partial<Employee>) => runGas<any>('editPegawai', id, data),
  hapusPegawai: (id: string) => runGas<any>('hapusPegawai', id),
  getSPDList: () => runGas<SPPD[]>('getSPDList'),
  getNextSPPDNumber: () => runGas<string>('getNextSPPDNumber'),
  saveSPD: (data: Partial<SPPD>) => runGas<any>('saveSPD', data),
  generateDocument: (id: string, type: string, extraData?: any) => runGas<string>('generateDocument', id, type, extraData),
  getArsip: () => runGas<any[]>('getArsip'),
  uploadFile: (base64: string, fileName: string) => {
    const tenant = getStoredTenant();
    return runGas<any>('uploadFile', base64, fileName, tenant?.folderId);
  },
  initApp: () => runGas<string>('initApp'),
  loginByCode: (code: string) => runGas<any>('loginByCode', code),
  isLoggedIn: () => !!getStoredTenant(),
  getTenant: () => getStoredTenant(),
};
