import type { Product } from '@/src/domain/models';
import { getProductHealth } from '@/src/services/products/productService';

export type VoiceOperation = 'sale' | 'entry';
export type VoiceQuery = 'stock' | 'low-stock' | 'out-of-stock';

export type VoiceCommand =
  | { kind: 'operation'; operation: VoiceOperation; quantity: number | null; productCandidates: Product[] }
  | { kind: 'query'; query: VoiceQuery; productCandidates: Product[] }
  | { kind: 'unknown' };

const NUMBER_WORDS: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  veinte: 20,
};

export function normalizeVoiceText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[¿?¡!,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemDiminutive(word: string): string {
  if (word.length > 5 && word.endsWith('itas')) return `${word.slice(0, -4)}as`;
  if (word.length > 5 && word.endsWith('itos')) return `${word.slice(0, -4)}os`;
  if (word.length > 4 && word.endsWith('ita')) return `${word.slice(0, -3)}a`;
  if (word.length > 4 && word.endsWith('ito')) return `${word.slice(0, -3)}o`;
  return word;
}

function stripDiminutives(value: string): string {
  return value
    .split(' ')
    .map(stemDiminutive)
    .join(' ');
}

function wordsOf(value: string): string[] {
  return value.split(' ').filter(Boolean);
}

function matchesByWords(search: string, target: string): boolean {
  const searchWords = wordsOf(search);
  const targetWords = wordsOf(target);
  if (searchWords.length === 0 || targetWords.length === 0) return false;
  return searchWords.every((searchWord) =>
    targetWords.some((targetWord) => targetWord.includes(searchWord) || searchWord.includes(targetWord)),
  );
}

export function parseQuantity(value: string): number | null {
  const normalized = normalizeVoiceText(value);
  const numeric = normalized.match(/\b\d+\b/)?.[0];
  if (numeric) return Number(numeric);
  const word = normalized.split(' ').find((token) => NUMBER_WORDS[token] !== undefined);
  return word ? NUMBER_WORDS[word] : null;
}

export function parseVoiceCommand(transcript: string, products: Product[]): VoiceCommand {
  const text = normalizeVoiceText(transcript).replace(/^gwen[\s,:-]*/, '').trim();
  if (!text) return { kind: 'unknown' };

  if (/que productos tienen (poco stock|stock bajo)|productos con (poco stock|stock bajo)/.test(text)) {
    return { kind: 'query', query: 'low-stock', productCandidates: [] };
  }
  if (/que productos estan agotados|productos agotados|que esta agotado/.test(text)) {
    return { kind: 'query', query: 'out-of-stock', productCandidates: [] };
  }

  const stockMatch = text.match(/cuantas?\s+(.+?)\s+tengo/);
  if (stockMatch) {
    return { kind: 'query', query: 'stock', productCandidates: findProducts(stockMatch[1], products) };
  }

  const saleMatch = text.match(/(?:vendi|vender|venta)\s*(.*)/);
  if (saleMatch) {
    return parseOperation('sale', saleMatch[1], products);
  }

  const entryMatch = text.match(/(?:llegaron|llego|recibi|recibimos|entraron|agrega|agregar)\s*(.*)/);
  if (entryMatch) {
    return parseOperation('entry', entryMatch[1], products);
  }

  return { kind: 'unknown' };
}

function parseOperation(operation: VoiceOperation, remainder: string, products: Product[]): VoiceCommand {
  const quantity = parseQuantity(remainder);
  const productText = remainder
    .replace(/\b\d+\b/g, ' ')
    .replace(new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'g'), ' ')
    .replace(/\b(unidades?|paquetes?|productos?|de|del|la|el|las|los)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { kind: 'operation', operation, quantity, productCandidates: findProducts(productText, products) };
}

function findProducts(productText: string, products: Product[]): Product[] {
  const search = stripDiminutives(normalizeVoiceText(productText));
  if (!search) return [];
  return products.filter((product) => {
    const name = stripDiminutives(normalizeVoiceText(product.name));
    const brand = stripDiminutives(normalizeVoiceText(product.brand));
    return (
      name.includes(search) ||
      search.includes(name) ||
      (brand && brand.includes(search)) ||
      matchesByWords(search, name) ||
      (brand ? matchesByWords(search, brand) : false)
    );
  });
}

export function getHealthQueryProducts(query: VoiceQuery, products: Product[]): Product[] {
  return products.filter((product) => {
    const health = getProductHealth(product);
    if (query === 'low-stock') return health.lowStock && !health.outOfStock;
    return health.outOfStock;
  });
}