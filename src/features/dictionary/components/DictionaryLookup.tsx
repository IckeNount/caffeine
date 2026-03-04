'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Volume2, Book, AlertCircle, Clock, Globe, Sparkles } from 'lucide-react';
import { DictionaryLookupResult } from '../types';

interface Suggestion {
  word: string;
  score: number;
}

const DATAMUSE_API = 'https://api.datamuse.com/sug';

export function DictionaryLookup() {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DictionaryLookupResult | null>(null);
  const [useAI, setUseAI] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions from Datamuse (free, no key)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(`${DATAMUSE_API}?s=${encodeURIComponent(query)}&max=8`);
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWord(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lookupWord = useCallback(async (searchWord: string) => {
    if (!searchWord.trim()) return;

    setWord(searchWord);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ word: searchWord });
      if (useAI) params.set('ai', 'true');

      const response = await fetch(`/api/dictionary?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch word');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [useAI]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    lookupWord(word);
  };

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      lookupWord(suggestions[activeIndex].word);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Error playing audio", e));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div ref={wrapperRef} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400 z-10" />
          <input
            ref={inputRef}
            type="text"
            value={word}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="Search for a word (e.g., apple, ubiquitous)..."
            className="w-full pl-12 pr-28 py-4 text-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            disabled={loading}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            aria-controls="suggestion-list"
          />
          <button
            type="submit"
            disabled={loading || !word.trim()}
            className="absolute right-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors z-10"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Looking up…
              </span>
            ) : 'Search'}
          </button>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="suggestion-list"
              role="listbox"
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden z-50"
            >
              {suggestions.map((s, i) => {
                const matchEnd = word.length;
                const matched = s.word.slice(0, matchEnd);
                const rest = s.word.slice(matchEnd);

                return (
                  <li
                    key={s.word}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`px-5 py-3 cursor-pointer text-base transition-colors flex items-center gap-3 ${
                      i === activeIndex
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      lookupWord(s.word);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <Search className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <span>
                      <span className="font-semibold">{matched}</span>
                      <span className="font-normal">{rest}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* AI Enhancement Toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none group w-fit">
          <div className="relative">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-violet-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className={`w-4 h-4 transition-colors ${useAI ? 'text-violet-500' : 'text-slate-400'}`} />
            <span className={`text-sm font-medium transition-colors ${useAI ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>
              Enhance with AI
            </span>
            <span className="text-xs text-slate-400">
              {useAI ? '(uses Gemini API quota)' : '(free — MyMemory)'}
            </span>
          </div>
        </label>
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Word not found</h4>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && result.entries.map((entry, idx) => {
        const audioPhonetic = entry.phonetics.find(p => p.audio && p.audio.length > 0);
        const textPhonetic = entry.phonetics.find(p => p.text) || { text: '' };
        const thai = result.thai;

        return (
          <div key={idx} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            
            {/* ── Header: Word, Phonetic, Thai ─────────────────── */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white capitalize tracking-tight">
                    {entry.word}
                  </h1>
                  {textPhonetic.text && (
                    <p className="text-xl text-indigo-600 dark:text-indigo-400 mt-1 font-medium tracking-wide">
                      {textPhonetic.text}
                    </p>
                  )}
                </div>
                
                {audioPhonetic?.audio && (
                  <button
                    onClick={() => playAudio(audioPhonetic.audio!)}
                    className="w-14 h-14 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full transition-colors flex-shrink-0"
                    aria-label="Play pronunciation"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
              </div>
              
              {/* Thai word translation */}
              {thai?.wordThai && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-2xl md:text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {thai.wordThai}
                  </span>
                </div>
              )}
            </div>

            {/* ── Meanings ─────────────────────────────────────── */}
            <div className="space-y-8">
              {entry.meanings.map((meaning, mIdx) => {
                const thaiMeaning = thai?.meanings?.[mIdx];
                
                return (
                  <div key={mIdx} className="space-y-4">
                    {/* Part of speech header */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white italic">
                        {meaning.partOfSpeech}
                      </h3>
                      {thaiMeaning?.partOfSpeechThai && (
                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium">
                          {thaiMeaning.partOfSpeechThai}
                        </span>
                      )}
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                    </div>

                    {/* Definitions list */}
                    <ul className="space-y-5">
                      {meaning.definitions.map((def, dIdx) => {
                        const thaiDef = thaiMeaning?.definitionsThai?.[dIdx];
                        const thaiExample = thaiMeaning?.examplesThai?.[dIdx];

                        return (
                          <li key={dIdx} className="flex gap-4 group">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-medium mt-0.5 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/50 dark:group-hover:text-indigo-400 transition-colors">
                              {dIdx + 1}
                            </span>
                            <div className="space-y-2 flex-1">
                              {/* English definition */}
                              <p className="text-slate-700 dark:text-slate-300 text-lg">
                                {def.definition}
                              </p>
                              
                              {/* Thai definition */}
                              {thaiDef && (
                                <p className="text-emerald-600 dark:text-emerald-400 text-base flex items-start gap-2">
                                  <span className="text-xs mt-1 opacity-60">🇹🇭</span>
                                  {thaiDef}
                                </p>
                              )}
                              
                              {/* English example */}
                              {def.example && (
                                <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
                                  <p className="text-slate-500 dark:text-slate-400 italic text-sm">
                                    &ldquo;{def.example}&rdquo;
                                  </p>
                                  {/* Thai example */}
                                  {thaiExample && thaiExample !== '' && (
                                    <p className="text-emerald-500/80 dark:text-emerald-400/70 text-sm">
                                      &ldquo;{thaiExample}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Synonyms */}
                              {def.synonyms?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Synonyms</span>
                                  {def.synonyms.map(syn => (
                                    <button key={syn} onClick={() => lookupWord(syn)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-transparent border-none p-0">
                                      {syn}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* General synonyms */}
                    {meaning.synonyms?.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-baseline pt-2">
                        <h4 className="text-sm font-medium text-slate-400">Similar:</h4>
                        <div className="flex flex-wrap gap-2">
                          {meaning.synonyms.map(syn => (
                            <button key={syn} onClick={() => lookupWord(syn)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition-colors cursor-pointer border-none">
                              {syn}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Footer ───────────────────────────────────────── */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {entry.sourceUrls && entry.sourceUrls.length > 0 && (
                  <a
                    href={entry.sourceUrls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <Book className="w-4 h-4" />
                    Wiktionary
                  </a>
                )}
                {/* Translation source badge */}
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  {useAI ? (
                    <><Sparkles className="w-3 h-3 text-violet-400" /> AI-enhanced</>
                  ) : (
                    <><Globe className="w-3 h-3 text-emerald-400" /> MyMemory (free)</>
                  )}
                </span>
              </div>
              
              {/* Timing badge */}
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <Clock className="w-3 h-3" />
                {result.timingMs}ms
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
