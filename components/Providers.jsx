"use client";
import { ToastProvider } from './Toast';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';
import KeyboardShortcuts from './KeyboardShortcuts';
import GlobalSearch from './GlobalSearch';

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        {children}
        <KeyboardShortcuts />
        <GlobalSearch />
      </ToastProvider>
    </ErrorBoundary>
  );
}
