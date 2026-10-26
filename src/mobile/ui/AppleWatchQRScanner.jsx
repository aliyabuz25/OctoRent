import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';
import { playAppleWatchSuccessChime, triggerAppleWatchHaptic } from '../../components/common/appleWatchFX.js';

export default function AppleWatchQRScanner({
  isOpen,
  onClose,
  onSuccess,
  mode = 'pair', // 'pair' | 'product'
  title = 'Cihaz Eşləməsi',
}) {
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pairedUser, setPairedUser] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerId = 'ios-qr-reader-container';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('QR scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setErrorMsg('');
    setPairedUser(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleDecoded(decodedText),
        () => {} // ignore frame parse errors
      );

      setScanning(true);

      // Check torch capability
      try {
        const capabilities = scannerRef.current.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch {}
    } catch (err) {
      console.warn('Kamera açılmadı:', err);
      setErrorMsg('Kameraya icazə verilmədi və ya kamera tapılmadı. Şəkil seçərək də daxil ola bilərsiniz.');
      setScanning(false);
    }
  };

  const handleDecoded = async (text) => {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (mode === 'pair') {
      if (payload && (payload.type === 'octorent_apple_pair' || payload.token)) {
        triggerAppleWatchHaptic();
        playAppleWatchSuccessChime();
        stopScanner();

        setPairedUser(payload.user || { name: 'İstifadəçi' });

        setTimeout(() => {
          onSuccess(payload);
        }, 1100);
        return;
      }

      setErrorMsg('Bu QR kod OctoRent cihaz eşləməsi üçün etibarlı deyil.');
      return;
    }

    // Product Barcode / QR Mode
    triggerAppleWatchHaptic();
    playAppleWatchSuccessChime();
    stopScanner();
    onSuccess({ text, payload });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleDecoded(decodedText);
    } catch {
      setErrorMsg('Seçilmiş şəkildə QR kod aşkarlanmadı.');
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const next = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(startScanner, 180);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ios-qr-root">
      {/* Edge-to-Edge Camera Stream */}
      <div id={containerId} className="ios-qr-camera" />

      {/* iOS Minimalist Reticle & Ambient Dimmer */}
      <div className="ios-qr-stage">
        <div className={`ios-qr-reticle ${pairedUser ? 'is-success' : ''}`}>
          <span className="ios-reticle-corner tl" />
          <span className="ios-reticle-corner tr" />
          <span className="ios-reticle-corner bl" />
          <span className="ios-reticle-corner br" />

          {pairedUser && (
            <div className="ios-qr-success-card">
              <div className="ios-qr-success-icon">
                <FeatherIcon name="Check" size={32} color="#ffffff" strokeWidth={3} />
              </div>
              <div className="ios-qr-success-title">Eşləndi</div>
              <div className="ios-qr-success-user">{pairedUser.name || pairedUser.username}</div>
            </div>
          )}
        </div>
      </div>

      {/* Minimalist iOS Top Bar */}
      <div className="ios-qr-topbar">
        <div className="ios-qr-title">{title}</div>
        <button className="ios-qr-circle-btn" onClick={onClose} aria-label="Bağla">
          <FeatherIcon name="X" size={20} color="#ffffff" />
        </button>
      </div>

      {/* Minimalist iOS Bottom Bar */}
      <div className="ios-qr-bottombar">
        <p className="ios-qr-hint">
          {pairedUser
            ? 'Uğurla qoşuldu, daxil olunur...'
            : 'QR kodu çərçivənin daxilində saxlayın'}
        </p>

        {errorMsg && <div className="ios-qr-error">{errorMsg}</div>}

        <div className="ios-qr-actions">
          {hasTorch && (
            <button
              className={`ios-qr-action-btn ${torchOn ? 'active' : ''}`}
              onClick={toggleTorch}
              aria-label="Fənər"
            >
              <FeatherIcon name={torchOn ? 'Zap' : 'ZapOff'} size={20} />
            </button>
          )}

          <button
            className="ios-qr-action-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Şəkil seç"
          >
            <FeatherIcon name="Image" size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
}
