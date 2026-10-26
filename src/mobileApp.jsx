import React from 'react';
import ReactDOM from 'react-dom/client';
import MobileMain from './mobile/Main.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './mobile/styles/mobile.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <MobileMain />
    </AuthProvider>
  </React.StrictMode>
);
