import React from 'react';
import { LivePreviewInfo } from '../store';

interface LivePreviewProps {
  info: LivePreviewInfo;
  visible: boolean;
}

const LivePreview: React.FC<LivePreviewProps> = ({ info, visible }) => {
  if (!visible || !info) return null;
  
  return (
    <div className="live-preview">
      <div className="preview-tag">{info.tagName}</div>
      <div className="preview-text">{info.text}</div>
      <div className="preview-xpath">{info.xpath}</div>
      {info.relativeXPath && (
        <div className="preview-relative-xpath">
          Relative XPath: {info.relativeXPath}
          {info.matchingCount && (
            <span className="matching-count">
              {' '}(Matches {info.matchingCount} elements)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default LivePreview; 