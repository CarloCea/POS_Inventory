import React from 'react';
import AdminApp from './AdminApp';
import POSApp from './POSApp';

const App = () => {
  const hostname = window.location.hostname;
  
  // If the subdomain starts with 'pos.' or is 'pos.localhost', we route to the POS app.
  const isPOSDomain = hostname.startsWith('pos.') || hostname === 'pos.localhost';

  if (isPOSDomain) {
    return <POSApp />;
  }

  // Otherwise, default to the Admin / Back-Office app.
  return <AdminApp />;
};

export default App;