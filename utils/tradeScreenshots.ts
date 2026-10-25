import type { UserTier } from '../components/UserContext';

export const screenshotLimit = (tier: UserTier): number => tier === 'free' ? 2 : Infinity;

/** A present empty gallery means all attachments were removed. */
export const readTradeScreenshots = (row: { screenshot_urls?: string[] | null; screenshot_url?: string | null }): string[] =>
  Array.isArray(row.screenshot_urls) ? row.screenshot_urls : row.screenshot_url ? [row.screenshot_url] : [];

export const validateScreenshotCount = (tier: UserTier, count: number): void => {
  if (count > screenshotLimit(tier)) throw new Error('每笔交易最多可上传 2 张截图 / Maximum 2 screenshots per trade on the free plan');
};

/** Keep existing URLs; fail before saving the journal if any new upload fails. */
export const persistTradeScreenshots = async (
  images: string[],
  upload: (image: string) => Promise<string | null>,
): Promise<string[]> => {
  const urls: string[] = [];
  for (const image of images) {
    const url = image.startsWith('data:') ? await upload(image) : image;
    if (!url) throw new Error('截图上传失败，请重试 / Screenshot upload failed. Please retry.');
    urls.push(url);
  }
  return urls;
};
