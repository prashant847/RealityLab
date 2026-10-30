import { Component, type ReactNode } from "react";

/** If a drawing ever throws, show the fallback (the original image art) instead of taking the page down. */
export class ArtBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* nothing to report: the fallback is shown */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
