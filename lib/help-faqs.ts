/**
 * Account & product questions shown at the bottom of the help centre.
 *
 * These answers are hosted inside this file so the help centre works with no
 * database or admin panel — edit them here and redeploy to publish a change.
 * The content is the same set of questions published by the t3n help centre.
 */

export interface HelpFaq {
  id: string;
  question_ar: string;
  question_en: string | null;
  answer_ar: string;
  answer_en: string | null;
  /** Built-in illustration, served from /public/help. */
  image_url?: string | null;
  keywords: string[];
  category_id: string;
  is_pinned: boolean;
  sort_order: number;
  views: number;
  createdAt: string;
}

export interface HelpFaqCategory {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  sort_order: number;
}

export const HELP_FAQ_CATEGORIES: HelpFaqCategory[] = [
  {
    id: 'cat-keys',
    name_ar: 'المفاتيح والتفعيل',
    name_en: 'Keys & Activation',
    description_ar: 'كل ما يتعلق بتفعيل المفاتيح وحالتها والمدة المتبقية.',
    description_en: 'Everything related to key activation, status, and duration.',
    sort_order: 1,
  },
  {
    id: 'cat-products',
    name_ar: 'المنتجات والشروحات',
    name_en: 'Products & Guides',
    description_ar: 'شروحات المنتجات، اللودرات، وروابط التنزيل المباشرة.',
    description_en: 'Product guides, loaders, and direct download links.',
    sort_order: 2,
  },
];

export const HELP_FAQS: HelpFaq[] = [
  {
    id: 'faq-watch-guides',
    question_ar: 'كيف أشاهد الشروحات؟',
    question_en: 'How do I watch the guides?',
    answer_ar: 'عند تفعيل منتج توجد أزرار مكتوبة عليها "دليل المنتج"، ومنها تفتح الشرح الكامل الخاص بمنتجك.',
    answer_en: 'Once a product is active you will find a "product guide" button that opens the full walkthrough for that product.',
    image_url: '/help/faq-guides.png',
    keywords: ['شروحات', 'دليل', 'شرح'],
    category_id: 'cat-products',
    is_pinned: true,
    sort_order: 1,
    views: 18,
    createdAt: '2026-09-29T12:45:43.746Z',
  },
  {
    id: 'faq-redeem-key',
    question_ar: 'طريقة تفعيل المفتاح',
    question_en: 'How do I activate my key?',
    answer_ar: 'كيفية تفعيل المفتاح الخاص بك: انقر على زر استرداد المفتاح ثم الصق المفتاح وأكّده.',
    answer_en: 'How to activate your key: open the redeem key button, paste your key and confirm it.',
    image_url: '/help/faq-redeem-key.png',
    keywords: ['مفتاح', 'تفعيل', 'استرداد'],
    category_id: 'cat-keys',
    is_pinned: true,
    sort_order: 2,
    views: 11,
    createdAt: '2026-09-29T13:09:12.717Z',
  },
  {
    id: 'faq-duration',
    question_ar: 'كيف أعرف مدة اشتراكي؟',
    question_en: 'How do I know my subscription duration?',
    answer_ar: 'كيفية معرفة مدة المنتج أو انتهاء المدة: تظهر المدة المتبقية داخل بطاقة المنتج في صفحة "منتجاتي".',
    answer_en: 'The remaining duration is shown inside the product card on the "My products" page.',
    image_url: '/help/faq-duration.png',
    keywords: ['مدة', 'اشتراك', 'انتهاء'],
    category_id: 'cat-products',
    is_pinned: true,
    sort_order: 3,
    views: 12,
    createdAt: '2026-09-29T13:10:52.937Z',
  },
  {
    id: 'faq-reset',
    question_ar: 'كيفية طلب رستات',
    question_en: 'How do I request a key reset?',
    answer_ar: 'مرفق في الصورة خطوات طلب الرستات من بطاقة المنتج.',
    answer_en: 'The image shows the reset request steps from the product card.',
    image_url: '/help/faq-reset.png',
    keywords: ['رستات', 'طلب'],
    category_id: 'cat-keys',
    is_pinned: true,
    sort_order: 4,
    views: 9,
    createdAt: '2026-09-29T13:27:34.172Z',
  },
];
