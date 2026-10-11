import React from 'react';

/**
 * Full-viewport placeholder shown while a lazy route chunk downloads.
 * It paints the destination page's background immediately (dark for the team pages,
 * anodized silver otherwise) so there is no white flash or layout jump, and only
 * reveals the telemetry-style label after a short delay so fast loads show nothing.
 */
export function RouteFallback({ tone = 'dark' }) {
  return (
    <div className={`route-status route-status--${tone}`} role="status" aria-live="polite">
      <span className="route-status__label">Loading</span>
    </div>
  );
}

/**
 * Catches errors thrown while rendering a route, most importantly a failed chunk
 * download (flaky network, or a stale tab after a new deploy replaced the hashed files).
 * Offers a reload instead of leaving the user on a blank screen.
 */
export class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Navigating elsewhere clears the error so the next route can render.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const tone = this.props.tone || 'dark';
    return (
      <div className={`route-status route-status--${tone} route-status--error`} role="alert">
        <span className="route-status__eyebrow">Connection interrupted</span>
        <p className="route-status__message">This page could not be loaded.</p>
        <div className="route-status__actions">
          <button type="button" className="route-status__btn" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="route-status__link" href="/">
            Go to home
          </a>
        </div>
      </div>
    );
  }
}
