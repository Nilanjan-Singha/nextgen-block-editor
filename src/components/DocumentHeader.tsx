import React from 'react';

export interface DocumentHeaderProps {
  coverUrl?: string;
  gradient?: string;
  icon?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  coverUrl,
  gradient = 'linear-gradient(135deg, #27272a 0%, #52525b 100%)',
  icon,
  title,
  subtitle,
  className,
}) => {
  const bannerStyle: React.CSSProperties = coverUrl
    ? { backgroundImage: `url("${coverUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradient };

  return (
    <header className={className ? `editor-cover-card ${className}` : 'editor-cover-card'}>
      <div className="editor-cover-banner" style={bannerStyle} />
      {icon ? <div className="editor-cover-icon">{icon}</div> : null}
      <div className="editor-cover-meta">
        <h1 className="editor-cover-title">{title}</h1>
        {subtitle ? <p className="editor-cover-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
};
