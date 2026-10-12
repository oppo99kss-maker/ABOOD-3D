/**
 * Help centre guide library.
 *
 * Content ported from the live t3n help centre (https://t3nn.wtf) so SpooFX
 * customers read exactly the same explanations, watch the same videos, and see
 * the same screenshots. Sources of the written material:
 *   BIOS Config ............ https://spiritxx.gitbook.io/eon/getting-started/step-2-bios-config
 *   RAID Reinstallation .... https://spiritxx.gitbook.io/eon/getting-started/quickstart/raid-reinstallation
 *   Normal Permanent Spoof . https://spiritxx.gitbook.io/eon/setup-spoofing/step-6-permanent-spoofing/normal-permanent-spoof
 *   ASUS Permanent Spoof ... https://spiritxx.gitbook.io/eon/setup-spoofing/step-6-permanent-spoofing/asus-permanent-spoof
 *   Network Unflag ......... https://spiritxx.gitbook.io/eon/setup-spoofing/step-7-network-unflag
 *   VPN Usage .............. https://spiritxx.gitbook.io/eon/setup-spoofing/step-8-usage-of-vpn
 *   Disk Bypass ............ https://spiritxx.gitbook.io/eon/miscellaneous/disk-bypass-eac-be-rico-ace
 */

export type GuideCategory =
  | 'BIOS'
  | 'Windows'
  | 'RAID'
  | 'Permanent Spoof'
  | 'Network'
  | 'VPN'
  | 'Disk'
  | 'Visual C++'
  | 'تشغيل البرنامج'
  | 'أخطاء البرنامج';

export interface GuideStep {
  title: string;
  text: string;
  value?: string;
  path?: string;
  image?: string;
  commands?: string[];
  links?: { label: string; url: string }[];
}

export interface GuideArticle {
  id: string;
  title: string;
  description: string;
  category: GuideCategory;
  stage: number;
  source?: string;
  image?: string;
  video?: string;
  videoLabel?: string;
  warning?: string;
  steps: GuideStep[];
  links?: { label: string; url: string }[];
  variantStepIndex?: number;
  variants?: { id: string; label: string; video?: string; steps: GuideStep[] }[];
}

export const GUIDE_STAGES = [
  'قبل البدء',
  'إعداد BIOS',
  'تجهيز Windows',
  'إعداد النظام',
  'تشغيل المنتج',
  'الخطوات النهائية',
  'المشاكل الشائعة',
];

export const GUIDE_CATEGORIES: GuideCategory[] = [
  'Windows',
  'BIOS',
  'Network',
  'VPN',
  'RAID',
  'Disk',
  'تشغيل البرنامج',
  'Visual C++',
  'أخطاء البرنامج',
  'Permanent Spoof',
];

const FILES = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663152548301/';
const PERMANENT_IMAGE =
  'https://3845978534-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FUSC6VrOP0gtVeq3Dc1gX%2Fuploads%2F4a9fbfPCtIWvMcv9rRZV%2Fspoof.png?alt=media&token=cfc99705-d4e5-443f-8d5f-ecd7953fad6f';

export const MAIN_VIDEO_FALLBACK = FILES + 'mHiKjOdRBJBDsCnu.mp4';

// Concise Arabic summaries of the seven requested pages. Technical option names keep their original spelling.
// BIOS intentionally contains no ASUS instructions; ASUS Permanent Spoof is an independent opt-in article.
export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: 'bios',
    title: 'إعداد BIOS',
    description: 'إعدادات TPM والاتصال حسب اللوحة الأم.',
    category: 'BIOS',
    stage: 1,
    variantStepIndex: 3,
    warning: 'بحسب المصدر، شريحة TPM الجديدة لا تتطلب تعطيلها. خطوات Wi-Fi وBluetooth تخص الأجهزة التي تحتوي عليهما فقط.',
    steps: [
      {
        title: 'TPM',
        value: 'Disabled',
        text: 'اختر الشركة أدناه وشاهد موضع الخيار. يبدأ Intel عند 00:00 وAMD عند 01:20 في الفيديو المرفق.',
      },
      {
        title: 'إذا تعذّر تعطيل TPM',
        text: 'من PowerShell بصلاحية المسؤول، افحص BitLocker بالأمر الأول. نفّذ الثاني فقط إذا كانت الحماية مفعّلة. بعد توقف الحماية يذكر المصدر خيار Permanent TPM Bypass داخل اللودر.',
        commands: ['Get-BitLockerVolume', 'Disable-BitLocker -MountPoint "C:"'],
      },
      {
        title: 'الاتصال السلكي',
        text: 'يفضّل المصدر Ethernet. عند تعذّره يذكر خيار MAC - NATURAL SPOOFER في Custom، أو استبدال محول Wi-Fi الخارجي عند انطباق الحالة.',
      },
      {
        title: 'الحفظ',
        value: 'Save & Exit',
        text: 'احفظ التغييرات واخرج. يشير المصدر إلى ظهور N/A HARDWARE في فحص MAC بعد تعطيل الأجهزة اللاسلكية.',
      },
    ],
    variants: [
      {
        id: 'msi',
        label: 'MSI',
        video: 'https://streamable.com/n7q3dk',
        steps: [
          {
            title: 'Wi-Fi / Bluetooth',
            path: 'Advanced > Integrated Peripherals',
            value: 'Disabled',
            text: 'عطّل الجهازين إذا توفرا وكان اتصال Ethernet متاحًا.',
          },
        ],
      },
      {
        id: 'gigabyte',
        label: 'GIGABYTE / AORUS',
        video: 'https://streamable.com/1qhn35',
        steps: [
          {
            title: 'Wi-Fi / Bluetooth',
            path: 'Advanced / Peripherals',
            value: 'Disabled',
            text: 'عطّل الجهازين إذا توفرا وكان اتصال Ethernet متاحًا.',
          },
        ],
      },
      {
        id: 'asrock',
        label: 'ASROCK',
        video: 'https://streamable.com/ec8u3s',
        steps: [
          {
            title: 'Wi-Fi / Bluetooth',
            path: 'Advanced > Chipset Configuration',
            value: 'Disabled',
            text: 'عطّل الجهازين إذا توفرا وكان اتصال Ethernet متاحًا.',
          },
        ],
      },
    ],
  },
  {
    id: 'windows',
    title: 'تجهيز فلاش Windows',
    description: 'شرحا Windows 11 وWindows 10 الموجودان بالموقع.',
    category: 'Windows',
    stage: 2,
    steps: [
      {
        title: 'اختر النظام',
        text: 'افتح الفيديو المناسب لنظامك، وأكمل تجهيز USB قبل متابعة فيديو المنتج.',
      },
    ],
    variants: [
      {
        id: 'win11',
        label: 'Windows 11',
        video: 'https://youtu.be/XZ-9RbqlA2k',
        steps: [
          {
            title: 'تجهيز Windows 11',
            text: 'تابع شرح تجهيز الفلاش المرفق، ثم ارجع إلى دليل المنتج بعد إكماله.',
          },
        ],
      },
      {
        id: 'win10',
        label: 'Windows 10',
        video: 'https://youtu.be/WaFxvUmsNWs',
        steps: [
          {
            title: 'تجهيز Windows 10',
            text: 'تابع شرح تجهيز الفلاش المرفق، ثم ارجع إلى دليل المنتج بعد إكماله.',
          },
        ],
      },
    ],
  },
  {
    id: 'raid',
    title: 'إعادة تثبيت RAID',
    description: 'تحضير USB وإعداد الأقراص وتثبيت Windows.',
    category: 'RAID',
    stage: 3,
    video: 'https://streamable.com/9o2zci',
    variantStepIndex: 3,
    warning: 'هذه العملية تمسح بيانات الأقراص. انسخ ملفاتك احتياطيًا أولًا. المصدر موجّه أساسًا إلى AMD، ولا يقدّم مسار Intel مفصلًا.',
    steps: [
      {
        title: 'التجهيز',
        text: 'جهّز USB بسعة 8–32GB باستخدام Media Creation Tool، وتعريفات RAID من أرشيف اللودر وتعريف LAN للوحة. صوّر الأرقام التسلسلية.',
      },
      {
        title: 'وضع التخزين',
        path: 'Advanced > Integrated Peripherals / Storage Configurations',
        value: 'SATA / NVMe: RAID',
        text: 'احفظ ثم عد إلى BIOS وافتح RAIDXpert2. في Gigabyte يوجد تحت Settings > IO Ports.',
      },
      {
        title: 'المصفوفات',
        text: 'من Array Management احذف المصفوفات المطلوبة بعد النسخ الاحتياطي. أنشئ مصفوفة Raidable لكل قرص: حدده، فعّله، طبّق التغييرات ثم Create Array.',
      },
      {
        title: 'التثبيت والتعريفات',
        text: 'اختر Windows 10 Pro. استخدم Load driver مرتين: AMD-RAID Bottom Device ثم AMD-RAID Controller. حدّد القرص وأكمل التثبيت.',
      },
      {
        title: 'بعد التثبيت',
        text: 'استخدم حسابًا محليًا أو Microsoft جديدًا، وحسابات جديدة في OneDrive وGeForce Experience وMedal. أوقف خيارات الخصوصية وثبّت Visual C++.',
      },
      {
        title: 'التحقق',
        path: 'Task Manager > Performance > Disk 0',
        value: 'AMD-RAID',
        text: 'قارن الأرقام الجديدة بالقديمة بأداة Serial Checker. تواصل مع الدعم إذا لم تتغير.',
      },
    ],
    variants: [
      {
        id: 'am4',
        label: 'AMD AM4',
        steps: [
          {
            title: 'مجلد التعريف',
            path: 'Put this folder on USB > NVMe_RAID / SATA_RAID',
            text: 'اختر مجلد نوع القرص عند تحميل التعريفين.',
          },
        ],
      },
      {
        id: 'am5',
        label: 'AMD AM5',
        steps: [
          {
            title: 'مجلد التعريف',
            path: 'Put this folder on USB',
            text: 'اختر هذا المجلد مباشرة عند تحميل التعريفين.',
          },
        ],
      },
    ],
  },
  {
    id: 'normal',
    title: 'Normal Permanent Spoof',
    description: 'المسار العادي وخيار EFI عند عدم تغير الأرقام.',
    category: 'Permanent Spoof',
    stage: 4,
    image: PERMANENT_IMAGE,
    steps: [
      {
        title: 'اكتمال العملية',
        text: 'عند ظهور رسالة اكتمال Permanent Spoof، أغلق الأداة وأعد تشغيل الجهاز.',
      },
      {
        title: 'إذا لم تتغير الأرقام',
        path: 'Custom Spoofing > EFI SPOOF - Auto',
        text: 'انتظر انتهاء الخيار، ثم افتح BIOS وأقلع من UEFI OS أو UEFI Partition 1. اختر UEFI ثم افحص الأرقام مجددًا.',
      },
      {
        title: 'المراجعة',
        text: 'قارن جميع الأرقام بصورة Serial Checker السابقة. يذكر المصدر MAC SPOOF - NIC لتغيير MAC الدائم.',
      },
      {
        title: 'الأقراص',
        text: 'إذا لم تنفذ RAID Reinstallation، انتقل إلى قسم Disk Guide المستقل.',
      },
    ],
  },
  {
    id: 'asus',
    title: 'ASUS Permanent Spoof',
    description: 'مسار مستقل للمنتجات التي تدعم لوحات ASUS.',
    category: 'Permanent Spoof',
    stage: 4,
    image: PERMANENT_IMAGE,
    warning: 'يشترط المصدر استمرار الإقلاع عبر قسم UEFI الخاص بهذه الطريقة. هذا المسار يغيّر إعدادات الإقلاع ومفاتيح Secure Boot؛ اتبعه فقط للمنتج واللوحة المدعومين.',
    steps: [
      {
        title: 'بعد الاكتمال',
        text: 'أغلق الأداة عند اكتمال Permanent Spoof، وأعد التشغيل إلى BIOS. يذكر المصدر الأمر التالي من CMD بصلاحية المسؤول.',
        commands: ['shutdown /r /fw /t 0'],
      },
      {
        title: 'ترتيب الإقلاع',
        path: 'Advanced Mode > Boot',
        value: 'Boot Option #1: UEFI OS',
        text: 'اجعل Windows Boot Manager الخيار الثاني.',
        image: 'https://content.gitbook.com/content/USC6VrOP0gtVeq3Dc1gX/blobs/4ab0hauRuFdZv2EWst01/image.png',
      },
      {
        title: 'Secure Boot',
        value: 'Other OS',
        path: 'Secure Boot > Key Management',
        text: 'يطلب المصدر اختيار Other OS ثم مسح مفاتيح Secure Boot. بعد الإقلاع تظهر أوامر الطريقة على الشاشة.',
      },
      {
        title: 'التحقق',
        text: 'قارن جميع الأرقام بالنسخة السابقة. يذكر المصدر MAC SPOOF - NIC، ثم Disk Guide إذا لم تستخدم RAID.',
      },
    ],
  },
  {
    id: 'network',
    title: 'إعدادات الشبكة / Network Unflag',
    description: 'مسار إضافي لإعدادات محول Ethernet.',
    category: 'Network',
    stage: 5,
    image: 'https://content.gitbook.com/content/USC6VrOP0gtVeq3Dc1gX/blobs/CtMdCAXLFF94mzUDMxhq/image.png',
    warning: 'المصدر يخص هذا المسار الإضافي بحالات حظر البلاغات أو حظر 24 ساعة، وليس بكل مشكلة اتصال. تجاوز الخيارات غير الموجودة في جهازك.',
    steps: [
      {
        title: 'محولات الاتصال',
        path: 'Win + R > ncpa.cpl',
        text: 'عطّل الاتصالات عدا Ethernet. افتح خصائص الاتصال المستخدم واترك IPv4 وحده مفعّلًا، كما في صورة المصدر.',
      },
      {
        title: 'إعدادات المحول',
        path: 'Win + R > devmgmt.msc > Network Adapters > Properties > Advanced',
        value: 'Disabled',
        text: 'عطّل الخيارات المتاحة التالية: Advanced EEE، Energy Efficient Ethernet، Green Ethernet، Auto Disable Gigabit، NS Offload، Power Saving Mode، ARP Offload، Flow Control، IPv4 Checksum Offload، Large Send Offload v2 (IPv6)، TCP Checksum Offload (IPv6)، UDP Checksum Offload (IPv6).',
      },
      {
        title: 'إعادة التشغيل',
        text: 'أعد تشغيل الجهاز بعد تطبيق الإعدادات.',
      },
    ],
  },
  {
    id: 'vpn',
    title: 'استخدام VPN',
    description: 'إعدادات الاتصال الواردة في دليل المنتج.',
    category: 'VPN',
    stage: 5,
    warning: 'هذه توصيات المصدر لمنتجه؛ لا تمثل ضمانًا لمنع الحظر. يذكر أن NordVPN وProtonVPN غير مناسبين لهذا المسار.',
    steps: [
      {
        title: 'المدة المذكورة',
        text: 'يوصي المصدر باستخدام VPN خلال الأسبوع الأول مع EAC وBE، ثم يسمح بإيقافه بعد الأسبوع.',
      },
      {
        title: 'الخدمة',
        text: 'يسمّي المصدر Windscribe وIPVanish، ويخص Mysteriumdark بلعبة Rust واتصال Residential. كما يشترط دعم Double-hop.',
        links: [
          { label: 'موقع Mysterium Dark', url: 'https://www.mysteriumdark.com/' },
          { label: 'موقع Windscribe (استخدام مجاني)', url: 'https://windscribe.com/features/use-for-free' },
        ],
      },
      {
        title: 'Windscribe',
        value: 'Stealth / Firewall: Automatic',
        text: 'اختر Stealth وفعّل Firewall مع وضع Automatic بحسب المصدر.',
        links: [{ label: 'رابط تثبيت واستخدام Windscribe مجاناً', url: 'https://windscribe.com/features/use-for-free' }],
      },
    ],
    links: [
      { label: 'تحميل واستخدام Windscribe مجاناً', url: 'https://windscribe.com/features/use-for-free' },
      { label: 'موقع Mysterium Dark الرسمي', url: 'https://www.mysteriumdark.com/' },
    ],
  },
  {
    id: 'disk',
    title: 'مشاكل القرص / Disk Guide',
    description: 'دليل VHD مستقل عن مشاكل Windows العامة.',
    category: 'Disk',
    stage: 3,
    video: 'https://spiritx.wtf/cdn/0cab4d685f5ef464/8e0fd169486d5811.mp4',
    warning: 'يصف المصدر هذا المسار بأنه بديل مؤقت لمن تعذّر عليه تنفيذ RAID Reinstallation. اختر قرص VHD مكانًا لتثبيت اللعبة.',
    steps: [
      {
        title: 'إنشاء VHD',
        text: 'اتبع فيديو المصدر لإنشاء المصفوفة باستخدام VHD؛ لا تضف إعدادات خارج الشرح.',
      },
      {
        title: 'مكان التثبيت',
        text: 'بعد إعداد VHD، ثبّت Epic Games Launcher على C:، ثم ثبّت Fortnite على قرص VHD.',
      },
      {
        title: 'التشغيل',
        text: 'بعد اكتمال التثبيت افتح اللعبة.',
      },
      {
        title: 'إذا اختفى القرص بعد إعادة التشغيل',
        text: 'أعد إرفاق VHD الأول ثم الثاني. يذكر المصدر احتمال ظهور رسالة خطأ أثناء الإرفاق. افحص ظهور القرصين في File Explorer، وكرر الإرفاق إذا لم يظهرا.',
      },
    ],
  },
  {
    id: 'runtime',
    title: 'خطأ Visual C++ أو رسالة بيضاء',
    description: 'MSVCP140.dll · VCRUNTIME140.dll · VCRUNTIME140_1.dll',
    category: 'Visual C++',
    stage: 6,
    image: '/assets/guides/visual-cpp-runtime-error.png',
    steps: [
      {
        title: 'سبب الرسالة',
        text: 'قد تكون مكتبات Visual C++ اللازمة للتشغيل مفقودة أو تحتاج إلى تحديث.',
      },
      {
        title: 'التثبيت',
        text: 'نزّل حزمة Microsoft الرسمية من الزر أدناه وثبّتها.',
      },
      {
        title: 'إعادة التجربة',
        text: 'أعد تشغيل Windows، ثم افتح اللودر مجددًا. أرفق صورة الخطأ للدعم إذا استمر.',
      },
    ],
    links: [{ label: 'تحميل Visual C++ x64 من Microsoft', url: 'https://aka.ms/vc14/vc_redist.x64.exe' }],
  },
  {
    id: 'connection',
    title: 'مشكلة الشبكة أو إيقاف Wi-Fi',
    description: 'رسالة تعذّر الوصول إلى اسم المضيف أو فشل الاتصال.',
    category: 'أخطاء البرنامج',
    stage: 6,
    image: FILES + 'witHZYIQKdMeiaUM.png',
    video: FILES + 'YDCQGNGzJcLXDrXO.mp4',
    steps: [
      {
        title: 'طابق الخطأ',
        text: 'قارن الرسالة بالصورة، ثم اتبع فيديو الحل الموجود بالموقع.',
      },
      {
        title: 'الاتصال',
        text: 'أداة Cloudflare WARP اختيارية للمساعدة في استعادة الاتصال، كما في الشرح الحالي.',
      },
    ],
    links: [{ label: 'تحميل Cloudflare WARP', url: 'https://downloads.cloudflareclient.com/v1/download/windows/ga' }],
  },
  {
    id: 'clock',
    title: 'خطأ الوقت والتحقق',
    description: 'تنبيه مزامنة وقت Windows أو التحقق من التوقيع.',
    category: 'أخطاء البرنامج',
    stage: 6,
    image: FILES + 'iUIBJOOTPsAnQTJW.png',
    video: FILES + 'dMYRLGIaslnDGgDt.mp4',
    steps: [
      {
        title: 'طابق الرسالة',
        text: 'قارن رسالة جهازك بالصورة المرفقة.',
      },
      {
        title: 'شاهد الحل',
        text: 'تابع فيديو الموقع الخاص بالوقت والتحقق، ثم جرّب التشغيل وأرسل صورة للدعم إذا استمر الخطأ.',
      },
    ],
  },
  {
    id: 'menu',
    title: 'مشكلة عدم ظهور قائمة البرنامج',
    description: 'يعمل WebUI لكن قائمة Spoofer لا تظهر.',
    category: 'تشغيل البرنامج',
    stage: 6,
    image: '/spoofer-list-fix.png',
    video: '/spoofer-list-fix.mp4',
    steps: [
      {
        title: 'تحديد الحالة',
        text: 'استخدم هذا الشرح إذا كان WebUI يعمل والقائمة لا تظهر، كما في الصورة.',
      },
      {
        title: 'تطبيق الفيديو',
        text: 'نفّذ الخطوات المصورة في فيديو الموقع، ثم تحقق من ظهور القائمة. تواصل مع الدعم إذا استمرت المشكلة.',
      },
    ],
  },
];

export function getGuideArticle(id: string) {
  return GUIDE_ARTICLES.find((article) => article.id === id);
}

export function guideStepEntries(article: GuideArticle, variantId: string) {
  const variant = article.variants?.find((item) => item.id === variantId);
  const entries = article.steps.map((step, index) => ({ ...step, id: `${article.id}:base:${index}` }));
  const variantSteps = (variant?.steps || []).map((step, index) => ({ ...step, id: `${article.id}:${variantId}:${index}` }));
  entries.splice(article.variantStepIndex ?? entries.length, 0, ...variantSteps);
  return entries;
}

export function normalizeGuideSearch(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .trim();
}

export function matchesGuide(article: GuideArticle, query: string) {
  return normalizeGuideSearch(
    [article.title, article.description, article.category, ...article.steps.map((step) => step.title + ' ' + step.text)].join(' ')
  ).includes(normalizeGuideSearch(query));
}
