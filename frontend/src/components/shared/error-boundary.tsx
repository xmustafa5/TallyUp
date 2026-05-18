'use client';

import { Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

function DefaultErrorFallback({ onReset }: { onReset: () => void }) {
  const t = useTranslations('errors');
  return (
    <div className="flex min-h-[300px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">{t('somethingWentWrong')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('unexpected')}</p>
        <Button className="mt-4" onClick={onReset}>
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
