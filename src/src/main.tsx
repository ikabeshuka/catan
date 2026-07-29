import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { UserProvider } from './context/UserContext';
import './fonts.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>
);
