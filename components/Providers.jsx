"use client";
import { ToastProvider } from './Toast';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';
import KeyboardShortcuts from './KeyboardShortcuts';
import GlobalSearch from './GlobalSearch';
import QuickActionsMenu from './QuickActionsMenu';
import { I18nProvider } from '@/lib/i18n';

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ToastProvider>
          <OfflineBanner />
          {children}
          <KeyboardShortcuts />
          <GlobalSearch />
          <QuickActionsMenu />
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
