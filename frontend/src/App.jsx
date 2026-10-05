import React from 'react';
import AdminApp from './AdminApp';
import POSApp from './POSApp';

const App = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  const isPOSDomain = hostname.startsWith('pos.') || hostname === 'pos.localhost' || port === '3001' || window.location.pathname.startsWith('/pos');

  if (isPOSDomain) {
    return <POSApp />;
  }

  return <AdminApp />;
};

export default App;