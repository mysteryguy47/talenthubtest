import '../styles/loading.css';

interface LoadingScreenProps {
  /** Optional context label shown below the sweep line. e.g. "Mental Math" */
  context?: string;
  /** true = position:fixed fullscreen overlay. Default: true */
  fullScreen?: boolean;
  /** true = semi-transparent bg with blur, for overlays on content. Default: false */
  transparent?: boolean;
}

export function LoadingScreen({
  context,
  fullScreen = true,
  transparent = false,
}: LoadingScreenProps) {
  return (
    <div
      className={[
        'th-loading',
        fullScreen  ? 'th-loading--fullscreen'  : 'th-loading--inline',
        transparent ? 'th-loading--transparent' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label={context ? `Loading ${context}` : 'Loading Talent Hub'}
      aria-live="polite"
    >
      {/* Atmospheric glow */}
      <div className="th-loading__glow" aria-hidden="true" />

      <div className="th-loading__content">

        {/* Brand name */}
        <div className="th-loading__brand" aria-hidden="true">
          <span className="th-loading__brand-main">Talent Hub</span>
          <span className="th-loading__brand-sub">EXCELLENCE LAB</span>
        </div>

        {/* Sweeping gradient line */}
        <div className="th-loading__line-track" aria-hidden="true">
          <div className="th-loading__line-fill" />
        </div>

        {/* Context label — only renders when prop is provided */}
        {context && (
          <p className="th-loading__context">{context}</p>
        )}

      </div>
    </div>
  );
}

export default LoadingScreen;
