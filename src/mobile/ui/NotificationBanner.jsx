import React, { useState, useEffect } from 'react';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';
import { requestNotificationPermission, showSystemNotification } from '../lib/notifications.js';

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const dismissed = localStorage.getItem('runstock.notif_banner_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      setVisible(true);
    }
  }, []);

  const handleEnable = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      showSystemNotification('Bildirişlər Aktivdir! 🎉', {
        body: 'Məhsul və stok yeniləmələri anında telefonunuza göndəriləcək.',
        url: '/mobile/stock',
      });
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('runstock.notif_banner_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="swift-notif-banner">
      <div className="swift-notif-icon">
        <FeatherIcon name="Bell" size={20} />
      </div>
      <div className="swift-notif-content">
        <div className="swift-notif-title">OctoRent Bildirişləri</div>
        <div className="swift-notif-desc">
          Məhsul və icarə dəyişikliklərini Android cihazınızda anında görün.
        </div>
      </div>
      <div className="swift-notif-actions">
        <button className="swift-notif-btn" onClick={handleEnable}>
          Aktivləşdir
        </button>
        <button className="swift-notif-close" onClick={handleDismiss} aria-label="Bağla">
          <FeatherIcon name="X" size={16} />
        </button>
      </div>
    </div>
  );
}
