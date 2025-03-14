import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { setupElementSelectionListeners } from './elementSelection';

// Set up element selection listeners
setupElementSelectionListeners();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    console.error('Could not find app container element!');
    return;
  }
  
  const root = createRoot(container);
  root.render(<App />);
  
  console.log('React app mounted successfully');
}); 