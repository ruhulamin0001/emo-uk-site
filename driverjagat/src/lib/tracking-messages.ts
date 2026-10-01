/**
 * Tracking patar lekha - stage onujayi manush ke ki bola hobe.
 *
 * Ei file ALADA karon lib/server/tracking.ts er prothom line
 * `import 'server-only'` - okhan theke client component e dhorle
 * build i bhenge jeto. (TutorJagat er ek i shikkha.)
 */

export const STAGE_MESSAGE: Record<string, string> = {
  pending: 'আপনার ড্রাইভার চাই পোস্ট জমা হয়েছে। অ্যাডমিন যাচাই করছেন।',
  published: 'আপনার পোস্ট প্রকাশিত হয়েছে। আগ্রহী ড্রাইভার পেলে আমরা ফোন করব।',
  shortlisted: 'কয়েকজন আগ্রহী ড্রাইভারের সাথে আলোচনা চলছে। আমরা আপনার সাথে যোগাযোগে আছি।',
  onboarding: 'ইন্টারভিউ ও ট্রায়াল চলছে।',
  completed: 'নিয়োগ চূড়ান্ত হয়েছে।',
  rejected: 'পোস্টটি প্রকাশ করা যায়নি। বিস্তারিত জানতে যোগাযোগ করুন।',
  needs_edit: 'কিছু তথ্য সংশোধন প্রয়োজন। আমরা ফোনে জানিয়েছি।',
  expired: 'মেয়াদ শেষ হয়েছে। নবায়ন করতে যোগাযোগ করুন।',
  cancelled: 'পোস্টটি প্রত্যাহার করা হয়েছে।',
  hired_outside: 'অন্যভাবে ড্রাইভার নিয়োগ হয়ে গেছে বলে জানানো হয়েছে।',
};
