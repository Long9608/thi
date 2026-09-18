import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './redesign.css';
import App from './AppRedesign.jsx';
import ApartmentBuildingWorkspace from './components/ApartmentBuildingWorkspace';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
