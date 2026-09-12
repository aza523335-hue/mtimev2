This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Database startup

`npm start` runs `db:init` before starting Next.js. Set `DATABASE_URL` to a SQLite
file (for example `file:/app/data/dev.db`). Missing parent directories and the
database are created automatically. Startup applies committed Prisma migrations,
then seeds only when Settings, Period, and Term are all empty. Seeding is a single
transaction; existing data, including customized passwords and schedules, is
never reset by the seed. A partially populated database is also left unchanged.
Initialization failure prevents the web server from starting.

Databases created by the previous `db push` startup are automatically baselined
when their schema matches the initial migration. A different legacy schema stops
startup for manual reconciliation instead of risking existing data.

Set `DEFAULT_ADMIN_PASSWORD` for the first seed (otherwise the existing default,
`admin123`, is used). Docker initializes at runtime; no seeded database is baked
into the image. Compose persists `/app/data` in the `mtime-data` volume. When
upgrading an existing deployment, back up and move its database to that volume
before replacing the old container, or mount its existing database directory at
`/app/data`. Otherwise the new volume starts with a fresh database.

For local development, run `npm run db:init` before `npm run dev`. For future
schema changes, run `npx prisma migrate dev --name <change>` against a development
database and commit the generated `prisma/migrations` files. Startup applies
pending migrations with `prisma migrate deploy`; it does not generate migrations.
`npm run db:seed` is also safe to repeat, but requires an existing schema.
Run `npm run test:db` to exercise startup against isolated temporary databases.

The `@prisma/config` override in `package.json` selects `deepmerge-ts` 8.0.2
to fix GHSA-ggr8-5vv4-36mx. Prisma 6.19.3 still pins the affected 7.1.5 release.
Recheck this override when upgrading Prisma; the startup tests cover config
loading, baselining, migrations, and seeding with the overridden dependency.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## نمط الدوام

من لوحة المدير اختر «حضوري دائمًا» أو «عن بُعد دائمًا» أو «جدول تلقائي»، ثم احفظ.
في الجدول التلقائي حدد نوع أيام الدوام من الأحد إلى الخميس، واختر تاريخ ثلاثاء ميلاديًا وحالته كنقطة مرجعية.
يتناوب الثلاثاء كل سبعة أيام بتوقيت الرياض، بما في ذلك الإجازات والانتقال بين الأترام.
المعاينة تعرض أيام الثلاثاء الأربعة القادمة بحسب الاختيارات قبل الحفظ.
الوضع الثابت يتقدم على الجدول، والعودة للتلقائي تستأنف التناوب بحسب التاريخ الأصلي.

تضيف الترقية حقول الجدول دون تغيير إعدادات الدوام السابقة؛ يستمر السلوك القديم
حتى أول حفظ لنمط الدوام الجديد. يلزم اختيار تاريخ ثلاثاء قبل تفعيل الجدول الجديد.
الأيام غير المحددة أو المتعارضة سابقًا تظهر حضورية عند إعداد الجدول الجديد.
تشغيل `npm start` يطبق ترقية قاعدة البيانات تلقائيًا؛ في التطوير شغّل `npm run db:init`.
لا توجد استثناءات مؤقتة في هذا الإصدار. اختبارات التناوب: `npm run test:schedule`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
