import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AIPromptChat from './LLM';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AIPromptChat />
  </React.StrictMode>
);
