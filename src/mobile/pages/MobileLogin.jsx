import React, { useState } from 'react';
import { IonContent, IonSpinner } from '@ionic/react';
import { useAuth } from '../../context/AuthContext.jsx';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';
import AppleWatchQRScanner from '../ui/AppleWatchQRScanner.jsx';
import { api, setActAs } from '../lib/api.js';

export default function MobileLogin() {
  const { applySession } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handlePairSuccess = async (payload) => {
    setShowScanner(false);
    setBusy(true);
    setError('');
    try {
      if (payload.code) {
        await api.confirmPairing(payload.code, payload.token).catch(() => {});
      }
      if (payload.tenant) {
        setActAs(payload.tenant);
      }
      applySession({
        token: payload.token,
        user: payload.user,
      });
    } catch (e) {
      setError(e.message || 'Eşləmə xətası baş verdi. Yenidən cəhd edin.');
      setBusy(false);
    }
  };

  return (
    <IonContent className="mobile-login-screen">
      <div className="mlogin-container">

        {/* Brand Header */}
        <div className="mlogin-brand">
          <div className="mlogin-logo-squircle">
            <FeatherIcon name="Layers" size={30} color="#ffffff" strokeWidth={2.2} />
          </div>
          <h1 className="mlogin-title">OctoRent</h1>
          <p className="mlogin-subtitle">Mobil İdarəetmə Terminalı</p>
        </div>

        {/* Apple-Style QR Hero Pairing Card */}
        <div className="mlogin-pair-card">
          {/* Concentric Pulsing Radar Glyph */}
          <div className="mlogin-radar-visual">
            <div className="mlogin-radar-ring r3" />
            <div className="mlogin-radar-ring r2" />
            <div className="mlogin-radar-ring r1" />
            <div className="mlogin-radar-center">
              <FeatherIcon name="QrCode" size={26} color="var(--m-text)" strokeWidth={2} />
            </div>
          </div>

          <h2 className="mlogin-card-title">Masaüstü ilə Eşləyin</h2>
          <p className="mlogin-card-desc">
            OctoRent masaüstü ekranındakı QR kodu kameraya göstərərək dərhal və təhlükəsiz qoşulun.
          </p>

          {/* Simple Step Guide */}
          <div className="mlogin-steps">
            <div className="mlogin-step">
              <span className="mlogin-step-num">1</span>
              <span className="mlogin-step-text">Kompüterdə <strong>OctoRent</strong>-i açın</span>
            </div>
            <div className="mlogin-step">
              <span className="mlogin-step-num">2</span>
              <span className="mlogin-step-text">Yuxarı paneldəki <strong>"Cihaz Eşlə"</strong> düyməsinə klikləyin</span>
            </div>
            <div className="mlogin-step">
              <span className="mlogin-step-num">3</span>
              <span className="mlogin-step-text">Aşağıdakı düyməni sıxıb QR kodu kameraya tutun</span>
            </div>
          </div>

          {error && (
            <div className="mlogin-error-banner">
              <FeatherIcon name="AlertCircle" size={14} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {/* Connect Action Button */}
          <button
            type="button"
            className="mlogin-scan-btn"
            onClick={() => {
              setError('');
              setShowScanner(true);
            }}
            disabled={busy}
          >
            {busy ? (
              <div className="mlogin-btn-loading">
                <IonSpinner name="crescent" color="light" style={{ width: 20, height: 20 }} />
                <span>Hesaba qoşulur...</span>
              </div>
            ) : (
              <>
                <FeatherIcon name="Camera" size={18} color="#ffffff" strokeWidth={2.4} />
                <span>QR Kodu Skan Edin</span>
              </>
            )}
          </button>
        </div>

        {/* Minimalist Security Footer */}
        <div className="mlogin-footer">
          <div className="mlogin-security-badge">
            <FeatherIcon name="ShieldCheck" size={13} color="var(--m-muted)" />
            <span>Ucdan-uca Şifrələnmiş Eşləmə</span>
          </div>
          <div className="mlogin-version">OctoRent Mobil v1.0</div>
        </div>

      </div>

      {/* Fullscreen QR Scanner */}
      <AppleWatchQRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSuccess={handlePairSuccess}
        mode="pair"
        title="Cihaz Eşləməsi"
      />
    </IonContent>
  );
}
