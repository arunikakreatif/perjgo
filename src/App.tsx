import { useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pegawai from './pages/Pegawai';
import SPPD from './pages/SPPD';
import Laporan from './pages/Laporan';
import SPJ from './pages/SPJ';
import Konfigurasi from './pages/Konfigurasi';
import About from './pages/About';
import { Page } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pegawai':
        return <Pegawai />;
      case 'sppd':
        return <SPPD />;
      case 'laporan':
        return <Laporan />;
      case 'spj':
        return <SPJ />;
      case 'konfigurasi':
        return <Konfigurasi />;
      case 'about':
        return <About />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-on-surface-variant">
            <h2 className="text-2xl font-bold">Modul Belum Tersedia</h2>
            <p className="mt-2">Modul {currentPage} sedang dalam tahap pengembangan.</p>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-lg font-bold"
            >
              Kembali ke Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

