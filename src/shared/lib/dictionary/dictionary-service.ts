import { DictionaryEntry, DictionaryError } from '@/features/dictionary/types';

const API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Fetches the definition of an English word using the Free Dictionary API.
 * This service is optimized for fast, simple REST lookups without authentication.
 * 
 * @param word The word to look up
 * @returns Array of DictionaryEntry objects or throws an error
 */
export async function fetchWordDefinition(word: string): Promise<DictionaryEntry[]> {
  const sanitizedWord = encodeURIComponent(word.trim());
  
  try {
    const response = await fetch(`${API_BASE_URL}/${sanitizedWord}`, {
      // Use next.js caching for extreme speed on repeated lookups if acceptable
      // next: { revalidate: 3600 } 
      cache: 'force-cache'
    });

    if (!response.ok) {
      if (response.status === 404) {
        // The API returns a specific error object when a word is not found
        const errorData = await response.json() as DictionaryError;
        throw new Error(errorData.message || 'Word not found');
      }
      throw new Error(`Failed to fetch dictionary definition: ${response.statusText}`);
    }

    const data: DictionaryEntry[] = await response.json();
    return data;
  } catch (error) {
    console.error('[Dictionary Service Error]', error);
    throw error;
  }
}
