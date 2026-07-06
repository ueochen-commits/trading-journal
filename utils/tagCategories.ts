import { TagCategoryDefinition } from '../types';

export const TAG_CATEGORY_COLORS = [
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
];

const LEGACY_MISTAKE_OPTIONS = [
  'FOMO',
  'Revenge Trading',
  'Too Large Size',
  'Hesitation',
  'Early Exit',
  'No Stop Loss',
  'Chasing',
  'Impulsive',
  'Distracted',
];

const LEGACY_SETUP_OPTIONS = [
  'Breakout',
  'Trend Pullback',
  'Liquidity Sweep',
  'Fib Retracement',
  'Support Bounce',
  'Gap Fill',
  'Gap and Go',
  'Reversal',
];

const LEGACY_CUSTOM_OPTIONS = ['纪律差', '睡眠不足', '消息面影响', 'Did not sleep well', 'Phone Distraction'];

const LEGACY_OPTION_SETS: Record<string, string[]> = {
  mistakes: LEGACY_MISTAKE_OPTIONS,
  setup: LEGACY_SETUP_OPTIONS,
  custom_tags: LEGACY_CUSTOM_OPTIONS,
};

export const DEFAULT_TAG_CATEGORIES: TagCategoryDefinition[] = [
  {
    id: 'mistakes',
    label: '交易错误',
    options: [],
    type: 'multi',
    isSystem: false,
    iconKey: 'tag',
    color: '#f59e0b',
  },
  {
    id: 'custom_tags',
    label: '自定义标签',
    options: [],
    type: 'multi',
    isSystem: false,
    iconKey: 'tag',
    color: '#10b981',
  },
];

export const normalizeTagCategories = (
  input: unknown,
): TagCategoryDefinition[] => {
  const fallback = DEFAULT_TAG_CATEGORIES.map(category => ({ ...category, options: [...category.options] }));

  if (!Array.isArray(input)) {
    return fallback;
  }

  const sanitized = input
    .filter(Boolean)
    .map((raw: any): TagCategoryDefinition | null => {
      if (!raw || typeof raw !== 'object' || !raw.id || !raw.label) return null;
      const id = String(raw.id);
      const rawOptions = Array.isArray(raw.options) ? raw.options.map(String).filter(Boolean) : [];
      const sanitizedOptions = rawOptions.filter(option => !(LEGACY_OPTION_SETS[id] || []).includes(option));
      return {
        id,
        label: String(raw.label),
        options: sanitizedOptions,
        type: raw.type === 'single' ? 'single' : 'multi',
        isSystem: false,
        iconKey: raw.iconKey || 'tag',
        color: typeof raw.color === 'string' && raw.color ? raw.color : '#10b981',
      };
    })
    .filter((category): category is TagCategoryDefinition => Boolean(category) && category.id !== 'setup');

  const merged = fallback.map(defaultCategory => {
    const matched = sanitized.find(category => category.id === defaultCategory.id);
    if (!matched) {
      return null;
    }
    return {
      ...matched,
      label: matched.label,
    };
  }).filter((category): category is TagCategoryDefinition => Boolean(category));

  const customs = sanitized.filter(
    category => !merged.some(defaultCategory => defaultCategory.id === category.id),
  );

  return [...merged, ...customs];
};

export const buildCategoryId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '');
