import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AIChat from './LLM2';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AIChat/>
  </React.StrictMode>
);
