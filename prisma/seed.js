/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const crypto = require("crypto");

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaLibSql({ url });

const prisma = new PrismaClient({ adapter });

const hashPassword = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const onSitePeriods = [
  ["08:00", "08:45"],
  ["08:50", "09:35"],
  ["09:40", "10:25"],
  ["10:40", "11:25"],
  ["11:30", "12:15"],
  ["12:20", "13:05"],
];

const remotePeriods = [
  ["09:00", "09:35"],
  ["09:40", "10:15"],
  ["10:20", "10:55"],
  ["11:10", "11:45"],
  ["11:50", "12:25"],
];

async function main() {
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const adminPasswordHash = hashPassword(password);

  const currentYear = new Date().getFullYear();
  const defaultTerms = [
    {
      name: `الترم الأول ${currentYear}`,
      startDate: new Date(`${currentYear}-08-18T00:00:00.000Z`),
      endDate: new Date(`${currentYear}-11-30T23:59:59.000Z`),
    },
    {
      name: `الترم الثاني ${currentYear}`,
      startDate: new Date(`${currentYear}-12-15T00:00:00.000Z`),
      endDate: new Date(`${currentYear + 1}-03-01T23:59:59.000Z`),
    },
  ];

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      currentDayType: "ON_SITE",
      adminPasswordHash,
      schoolName: "مدرسة المستقبل",
      managerName: "أ. محمد العتيبي",
    },
    create: {
      currentDayType: "ON_SITE",
      adminPasswordHash,
      schoolName: "مدرسة المستقبل",
      managerName: "أ. محمد العتيبي",
    },
  });

  await prisma.period.deleteMany();

  await prisma.period.createMany({
    data: onSitePeriods.map(([start, end], index) => ({
      dayType: "ON_SITE",
      order: index + 1,
      name: `الحصة ${index + 1}`,
      startTime: start,
      endTime: end,
    })),
  });

  await prisma.period.createMany({
    data: remotePeriods.map(([start, end], index) => ({
      dayType: "REMOTE",
      order: index + 1,
      name: `الحصة ${index + 1}`,
      startTime: start,
      endTime: end,
    })),
  });

  await prisma.term.deleteMany();
  await prisma.term.createMany({ data: defaultTerms });

  console.log("Database seeded.");
  console.log(`Default admin password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
