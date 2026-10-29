import { createReviewHandler } from '../server/journal-review.mjs';
export const config = { runtime: 'nodejs' };
export default createReviewHandler('analyze');
