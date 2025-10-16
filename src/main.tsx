import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGate from './auth/AuthGate';
import './styles/_tokens.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
