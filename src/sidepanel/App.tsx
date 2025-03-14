import React, { useEffect } from 'react';
import JsonBuilder from './components/JsonBuilder';
import { useJsonBuilderStore, useStore } from './store';

const App: React.FC = () => {
  const { addItem } = useJsonBuilderStore();
  
  // Initialize with one empty key-value pair
  useEffect(() => {
    // Check if there are already items
    const items = useJsonBuilderStore.getState().items;
    if (items.length === 0) {
      addItem();
    }
  }, [addItem]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Kaira JSON Builder</h1>
      </header>
      <main className="app-content">
        <JsonBuilder />
      </main>
      <footer className="app-footer">
        <p>Kaira Extension - JSON Builder</p>
      </footer>
    </div>
  );
};

export default App; 