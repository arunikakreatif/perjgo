import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pegawai from './pages/Pegawai';
import SPPD from './pages/SPPD';
import Laporan from './pages/Laporan';
import SPJ from './pages/SPJ';
import Konfigurasi from './pages/Konfigurasi';
import About from './pages/About';
import Login from './pages/Login';
import { Page } from './types';
import { gasService } from './services/gasService';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Cek apakah ada parameter kode desa di URL (misal: ?code=Desa_010 atau ?desa=Desa_010)
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code') || params.get('desa') || params.get('tenant');

    if (codeFromUrl) {
      setIsCheckingAuth(true);
      gasService.loginByCode(codeFromUrl)
        .then(result => {
          if (result.status === 'success') {
            localStorage.setItem('perjadin_tenant', JSON.stringify(result));
            setIsAuthenticated(true);
            setCurrentPage('dashboard');
            
            // Bersihkan query parameter dari Address Bar agar tampil rapi & siap dibagikan kembali
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          } else {
            console.warn("Autologin gagal: " + (result.message || "Kode tidak terdaftar"));
            setIsAuthenticated(gasService.isLoggedIn());
          }
        })
        .catch(err => {
          console.error("Gagal melakukan autologin dari URL:", err);
          setIsAuthenticated(gasService.isLoggedIn());
        })
        .finally(() => {
          setIsCheckingAuth(false);
        });
    } else {
      setIsAuthenticated(gasService.isLoggedIn());
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
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
    <>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </>
  );
}

