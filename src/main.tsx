import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './m2.css';
import './accounts/accounts.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
