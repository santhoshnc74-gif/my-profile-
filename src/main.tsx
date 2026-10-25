import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/inter';
import {App} from './App.tsx';
import './portfolio.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
