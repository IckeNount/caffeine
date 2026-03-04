import type { Metadata } from 'next';
import { DictionaryLookup } from '@/features/dictionary/components/DictionaryLookup';

export const metadata: Metadata = {
  title: 'Dictionary Lookup Test — Caffaine',
  description: 'Test page for the high-speed dictionary lookup service.',
};

export default function DictionaryPage() {
  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header content explaining this is a test page */}
        <div className="text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium tracking-wide">
            Test Environment
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            This page provides direct access to the Dictionary API integration.
            It uses the Free Dictionary API for ~100-300ms latency definitions.
          </p>
        </div>

        {/* The Lookup Tool */}
        <DictionaryLookup />
      </div>
    </div>
  );
}
