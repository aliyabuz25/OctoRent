import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "../../lib/api.js";
import FeatherIcon from "../common/FeatherIcon.jsx";
import { playAppleWatchChime, playAppleWatchSuccessChime } from "../common/appleWatchFX.js";

export default function DevicePairModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [pairData, setPairData] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [paired, setPaired] = useState(false);
  const pollTimerRef = useRef(null);

  const initPairing = async () => {
    setLoading(true);
    setPaired(false);
    try {
      const data = await api.fetch("/api/auth/pair/start", { method: "POST" }).then((r) => r.json());
      setPairData(data);
      const url = await QRCode.toDataURL(data.qrPayload || JSON.stringify(data), {
        width: 240,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrUrl(url);
      setTimeLeft(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
    } catch (err) {
      console.error("Pairing init error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Natural soft chime on opening
      playAppleWatchChime();
      initPairing();
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setPairData(null);
      setQrUrl("");
      setPaired(false);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !pairData?.code || paired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, pairData, paired]);

  useEffect(() => {
    if (!isOpen || !pairData?.code || paired) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.fetch(`/api/auth/pair/status/${pairData.code}`).then((r) => r.json());
        if (res.status === "paired") {
          playAppleWatchSuccessChime();
          setPaired(true);
          clearInterval(pollTimerRef.current);
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } catch (err) {
        console.warn("Pair poll error:", err);
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, pairData, paired, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="pair-modal-backdrop" onClick={onClose}>
      <div className="pair-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Kapa butonu - arxaplansız, minimalist və smooth */}
        <button className="pair-modal-close" onClick={onClose} aria-label="Bağla" title="Bağla">
          <FeatherIcon name="X" size={20} color="#64748b" />
        </button>

        {/* Başlıq */}
        <div className="pair-modal-header">
          <h2 className="pair-modal-title">Cihaz Eşləməsi</h2>
          <p className="pair-modal-sub">
            Telefonunuzda <b>/mobile</b> açıb QR kodu skan edin
          </p>
        </div>

        {/* QR Kod Çərçivəsi */}
        <div className="pair-stage-container">
          <div className={`pair-qr-wrapper ${paired ? "is-paired" : ""}`}>
            {loading ? (
              <div className="pair-qr-loading">
                <FeatherIcon name="RefreshCw" size={24} color="#64748b" className="spin-icon" />
                <span>Hazırlanır...</span>
              </div>
            ) : paired ? (
              <div className="pair-success-badge">
                <div className="pair-success-icon">
                  <FeatherIcon name="Check" size={32} color="#059669" strokeWidth={2.5} />
                </div>
                <h3>Eşləndi</h3>
                <p>{pairData?.user?.name || pairData?.user?.username} qoşuldu</p>
              </div>
            ) : (
              <div className="pair-qr-content">
                <img src={qrUrl} alt="OctoRent QR Code" className="pair-qr-image" />
              </div>
            )}
          </div>
        </div>

        {/* Status / Taymer (Süni parıldayan nöqtələr olmadan, təmiz mətn) */}
        <div className="pair-modal-footer">
          {paired ? (
            <div className="pair-status-line is-success">
              <FeatherIcon name="CheckCircle2" size={15} color="#059669" />
              <span>Cihaz uğurla qoşuldu</span>
            </div>
          ) : timeLeft > 0 ? (
            <div className="pair-status-line">
              <FeatherIcon name="Clock" size={14} color="#64748b" />
              <span>Qalan vaxt: {formattedTime}</span>
            </div>
          ) : (
            <div className="pair-status-line is-expired">
              <FeatherIcon name="AlertCircle" size={14} color="#dc2626" />
              <span>Vaxt bitdi</span>
              <button type="button" className="pair-refresh-btn" onClick={initPairing}>
                <FeatherIcon name="RefreshCw" size={12} /> Yenilə
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
