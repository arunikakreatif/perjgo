import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Building2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { gasService } from '../services/gasService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const result = await gasService.loginByCode(code);
      if (result.status === 'success') {
        localStorage.setItem('perjadin_tenant', JSON.stringify(result));
        onLogin();
      } else {
        setError(result.message || 'Kode desa tidak valid.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <style>{`
        .login-page-wrapper {
          min-height: 100vh;
          background: #0A1120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          position: relative;
          color: #ffffff;
        }

        .top-left-badge {
          position: absolute;
          top: 18px;
          left: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 0.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 7px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #162236;
          border-radius: 16px;
          border: 0.5px solid rgba(255, 255, 255, 0.08);
          border-left: 4px solid #B91C1C;
          padding: 40px;
          position: relative;
          z-index: 10;
        }

        .brand-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-container {
          width: 64px;
          height: 64px;
          background: #1E3250;
          border: 0.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          padding: 8px;
        }

        .logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-name {
          font-size: 22px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .brand-name .go {
          color: #B91C1C;
        }

        .subtitle {
          font-size: 10px;
          letter-spacing: 2px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .divider {
          width: 40px;
          height: 2px;
          background: #B91C1C;
          border-radius: 2px;
          margin: 0 auto 1.5rem auto;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.3);
        }

        .field-input {
          width: 100%;
          background: #0F1929;
          border: 0.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 12px 16px 12px 42px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .field-input:focus {
          border-color: #B91C1C;
        }

        .btn-masuk {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: #B91C1C !important;
          border: none !important;
          border-radius: 8px;
          padding: 13px 16px;
          color: #ffffff !important;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 1.5px;
          cursor: pointer;
          box-shadow: none !important;
          transition: background 0.2s;
          margin-top: 1rem;
          text-transform: uppercase;
        }

        .btn-masuk:hover {
          background: #991818 !important;
        }

        .btn-masuk:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          margin-bottom: 1.5rem;
          padding: 12px;
          background: rgba(185, 28, 28, 0.1);
          border: 0.5px solid rgba(185, 28, 28, 0.2);
          border-radius: 8px;
          color: #ff8080;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-note {
          margin-top: 2rem;
          text-align: center;
          font-size: 11px;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.25);
        }

        .footer-link {
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          border-bottom: 0.5px solid rgba(255, 255, 255, 0.2);
          transition: color 0.2s;
          cursor: pointer;
        }

        .footer-link:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
          }
          .top-left-badge {
            display: none;
          }
        }
      `}</style>

      <div className="top-left-badge">
        <KeyRound size={14} style={{ color: '#B91C1C' }} />
        Portal Administrasi Desa
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
      >
        <div className="brand-section">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="logo-container">
              <img 
                src="https://res.cloudinary.com/maswardi/image/upload/v1778757806/go_gsqgd7.png" 
                alt="Logo" 
              />
            </div>
            <h1 className="brand-name">
              PERJADIN<span className="go">GO</span>
            </h1>
            <p className="subtitle">Sistem Administrasi Perjalanan Desa</p>
            <div className="divider"></div>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Kode Desa</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <KeyRound size={18} />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Masukkan kode unik desa"
                className="field-input"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-masuk"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                MASUK SEKARANG
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="footer-note">
          Belum punya akun? <span className="footer-link">Hubungi Administrator</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
