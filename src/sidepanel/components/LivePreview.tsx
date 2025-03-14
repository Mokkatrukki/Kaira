import React from 'react';
import { LivePreviewInfo } from '../store';

interface LivePreviewProps {
  info: LivePreviewInfo | null;
  visible: boolean;
}

const LivePreview: React.FC<LivePreviewProps> = ({ info, visible }) => {
  if (!visible || !info) {
    return null;
  }
  
  const cleanText = info.text ? info.text.trim().replace(/\s+/g, ' ') : '-';
  
  return (
    <div className="live-preview">
      <h3>Current Element: <span className="element-tag">{info.tagName}</span></h3>
      <div className="live-preview-content">{cleanText}</div>
    </div>
  );
};

export default LivePreview; 