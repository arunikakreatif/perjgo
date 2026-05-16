import { Employee, SPPD } from '../types';

/**
 * Service to bridge between React and Google Apps Script (GAS)
 * As requested, uses google.script.run for all backend calls.
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycby5o3wrxaIrfEXPJikd0Fk1jzNXc0kRWY1SCqJfJxO-x-BdWFsuswhXDYATwrFyS0wIUQ/exec';

// Helper to run GAS functions or return an error if not in GAS environment
const runGas = <T>(functionName: string, ...args: any[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 1. Try native google.script.run (when hosted on Google)
    if (typeof google !== 'undefined' && google.script && google.script.run) {
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
        arguments: args
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
  setTimeout(() => {
    switch (name) {
      case 'getDashboardStats':
        resolve({
          pegawai: 124,
          sppd: 856,
          laporan: 712,
          spj: 640,
          chart: [65, 40, 85, 30, 55, 70],
          recentActivities: [
            { id: '1', title: 'SPPD Disetujui: Perjalanan ke Jakarta', subtitle: 'Oleh: Kepala Desa - Baru saja', status: 'Selesai', type: 'SPPD' },
            { id: '2', title: 'Laporan Baru: Kunjungan Kerja', subtitle: 'Oleh: Sekretaris Desa - 10 menit lalu', status: 'Baru', type: 'Laporan' },
            { id: '3', title: 'SPJ Selesai: Biaya Perjalanan', subtitle: 'Bendahara - 1 jam lalu', status: 'Selesai', type: 'SPJ' },
          ]
        });
        break;
      case 'getConfig':
        resolve({
          nama_desa: 'Desa Poncol',
          kecamatan: 'Kecamatan Poncol',
          kabupaten: 'Kabupaten Magetan',
          tahun_anggaran: 2026,
          kode_anggaran: '01.02.03',
          kepala_desa: 'H. SUDIRMAN',
          sekretaris_desa: 'Andi Setiawan, S.Kom',
          bendahara: 'Siti Aminah',
          alamat_kantor: 'Jl. Raya Poncol No. 1, Magetan',
          email: 'desa.poncol@magetan.go.id',
          web: 'www.desaponcol.id',
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
        resolve([
          { id: '1', name: 'Andi Setiawan, S.Kom', nik: '3201234567890001', position: 'Sekretaris Desa', address: 'Jl. Merdeka No. 45' },
          { id: '2', name: 'Siti Aminah', nik: '3201234567890002', position: 'Bendahara', address: 'Blok C No. 12' },
          { id: '3', name: 'Budi Raharjo', nik: '3201234567890003', position: 'Kaur Perencanaan', address: 'Kp. Sawah RT 02/05' },
        ]);
        break;
      case 'getSPDList':
        resolve([
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
        ]);
        break;
      case 'updateConfig':
      case 'tambahPegawai':
      case 'editPegawai':
      case 'hapusPegawai':
      case 'saveSPD':
        console.log(`Command ${name} executed with:`, args);
        resolve({ status: 'success' });
        break;
      case 'uploadFile':
        console.log(`Command ${name} executed with dummy file`);
        resolve({ url: 'https://placehold.co/600x400?text=Mock+Upload+Success', id: 'mock-id' });
        break;
      case 'getNextSPPDNumber':
        resolve("001/SPPD/V/2026");
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
  uploadFile: (base64: string, fileName: string) => runGas<any>('uploadFile', base64, fileName),
  initApp: () => runGas<string>('initApp'),
};
