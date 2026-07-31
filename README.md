# Koora Live — النسخة الاحترافية

موقع نتائج مباريات مباشرة، متعدد البطولات ومتعدد اللغات، بدون أي API مدفوع
وبدون أي حد يومي (limit)، لأن المتصفح لا يتصل بأي API خارجي مباشرة إطلاقاً.

## الفكرة باختصار
- **GitHub Actions** (مجاني) يجلب البيانات من ESPN (غير رسمي، بدون مفتاح) كل ~دقيقة
  ويخزّنها كملفات JSON ثابتة في فرع منفصل اسمه `data`.
- **jsDelivr** (CDN مجاني وبدون حدود) يوزّع هذه الملفات على كل الزوار مهما كان عددهم.
- المتصفح (`app.js`) لا يكلّم ESPN أبداً — فقط يقرأ ملفات JSON الجاهزة.

## خطوات التركيب (مرة واحدة فقط)

### 1. ارفع هذا المشروع إلى مستودعك
```bash
git init
git remote add origin https://github.com/USERNAME/koora-live-scores.git
git add .
git commit -m "Koora Live Pro"
git branch -M main
git push -u origin main
```

### 2. أنشئ فرع `data` فارغ (orphan) — الـ workflow سيدفع البيانات هنا
```bash
git checkout --orphan data
git rm -rf .
mkdir data
echo '{}' > data/.gitkeep
git add data/.gitkeep
git commit -m "init data branch"
git push -u origin data
git checkout main
```
> **مهم:** هذا الفرع منفصل تماماً عن كودك، وهذا يخلي تحديثات البيانات
> (كل دقيقة) لا تُغرق تاريخ الفرع الرئيسي `main` بمئات الـ commits.

### 3. عدّل بيانات المستخدم في `app.js`
افتح `app.js` وغيّر أول 3 أسطر:
```js
const GITHUB_USER = "USERNAME";       // اسمك على GitHub
const GITHUB_REPO = "koora-live-scores";
const DATA_BRANCH = "data";
```

### 4. فعّل GitHub Pages
Settings → Pages → Source: `Deploy from a branch` → اختر `main` → `/ (root)`.

### 5. فعّل صلاحية الكتابة لـ Actions
Settings → Actions → General → Workflow permissions → اختر
**"Read and write permissions"** ثم Save.
(بدون هذا، الـ workflow لن يقدر يعمل `git push` للبيانات.)

### 6. شغّل الـ workflow يدوياً أول مرة للتجربة
تبويب **Actions** → اختر **Update Live Scores Data** → **Run workflow**.
بعد نجاحه، تحقق من فرع `data` وشوف إذا ملفات `data/epl/scores.json` إلخ
اتولّدت فعلاً.

بعدها الـ workflow راح يشتغل تلقائياً كل 5 دقائق، وداخلياً يعمل 5 دورات
تحديث (كل 60 ثانية) — يعني تحديث شبه لحظي كل دقيقة تقريباً، طول اليوم.

## إضافة بطولة جديدة
افتح `scripts/leagues.config.mjs` وأضف سطر جديد بنفس الشكل، وأضف نفس المُعرّف (`id`)
في `assets/leagues.js`، ثم أضف الترجمة المقابلة في كل ملف داخل `i18n/`.
لازم تعرف "slug" البطولة من ESPN (مثال: `eng.1` للإنجليزي، `esp.1` للإسباني).
أسهل طريقة لمعرفة slug بطولة جديدة: افتح
`https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard`
وجرّب slugs معروفة أو ابحث عنها في مصادر مفتوحة.

## إضافة لغة جديدة
1. انسخ `i18n/en.json` إلى `i18n/xx.json` وترجم القيم.
2. أضف `"xx"` إلى `SUPPORTED_LANGS` في `app.js`.
3. أضف زر `<button class="lang-btn" data-lang="xx">XX</button>` في `index.html`.

## حدود يجب معرفتها بصراحة (لا نخفي عنك شيء)
- **ESPN غير رسمي وغير موثّق**: احتمال يتغيّر شكله أو يتوقف مستقبلاً. الحل
  الاحترافي على المدى الطويل هو إضافة مصدر بديل ثاني داخل `fetch-data.mjs`
  (نفس فكرة fallback الموجودة أصلاً) بمجرد ما يتوفر وقت لذلك.
- **جدولة GitHub الرسمية لا تقل عن 5 دقائق** — نحن نلتف حول هذا بالحلقة
  الداخلية (5 دورات × 60 ثانية)، وهذا مسموح ومستقر، لكنه ليس ضماناً رسمياً
  100% من GitHub وقد يتأخر بضع ثوانٍ وقت الضغط الشديد على سيرفراتهم.
- **jsDelivr يخزّن مؤقتاً (cache)** الملفات، لذلك الـ workflow يستدعي رابط
  "purge" بعد كل تحديث لإجبار الكاش على التحديث الفوري تقريباً.
