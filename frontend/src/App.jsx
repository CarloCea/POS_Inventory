import React from 'react';
import AdminApp from './AdminApp';
import POSApp from './POSApp';
import { ToastProvider } from './context/ToastContext';

const App = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  const isPOSDomain = hostname.startsWith('pos.') || hostname === 'pos.localhost' || port === '3001' || window.location.pathname.startsWith('/pos');

  React.useEffect(() => {
    document.title = isPOSDomain ? 'POS' : 'Inventory';
  }, [isPOSDomain]);

  return (
    <ToastProvider>
      {isPOSDomain ? <POSApp /> : <AdminApp />}
    </ToastProvider>
  );
};

export default App;