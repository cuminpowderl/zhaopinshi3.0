import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultRules = {
  educations: [],
  cities: [],
  yearsMin: null,
  yearsMax: null,
  salaryMinK: null,
  salaryMaxK: null,
  assessmentMins: { written: 60, coding: 60 },
  resumeAssessmentMinKeys: ["written", "coding"],
  resumeUse: { education: true, city: true, years: true, salary: true },
  targetStages: ["RESUME_FIRST", "ONLINE_TEST"],
  resumeRuleStages: ["RESUME_FIRST"],
  resumePassStage: "PHONE",
  personalityStages: ["ONLINE_TEST"],
  personalityAssessmentKey: "personality",
  personalityMinScore: 60,
  personalityMaxScore: null,
  personalityPassStage: "WRITTEN_EXAM",
};

async function main() {
  await prisma.candidateScore.deleteMany();
  await prisma.candidateFieldValue.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.customField.deleteMany();
  await prisma.agentSettings.deleteMany();

  const edu = await prisma.customField.create({
    data: {
      key: "education",
      label: "学历",
      type: "SELECT",
      options: JSON.stringify(["专科", "本科", "硕士", "博士"]),
      sortOrder: 0,
    },
  });
  const years = await prisma.customField.create({
    data: {
      key: "years",
      label: "工作年限",
      type: "NUMBER",
      sortOrder: 1,
    },
  });
  const city = await prisma.customField.create({
    data: {
      key: "city",
      label: "期望城市",
      type: "TEXT",
      sortOrder: 2,
    },
  });

  const written = await prisma.assessment.create({
    data: {
      key: "written",
      label: "笔试",
      maxScore: 100,
      sortOrder: 0,
    },
  });
  const coding = await prisma.assessment.create({
    data: {
      key: "coding",
      label: "机试",
      maxScore: 100,
      sortOrder: 1,
    },
  });
  const personality = await prisma.assessment.create({
    data: {
      key: "personality",
      label: "性格测试",
      maxScore: 100,
      sortOrder: 2,
    },
  });

  await prisma.agentSettings.create({
    data: {
      id: "default",
      enabled: false,
      mascotHidden: false,
      rulesJson: JSON.stringify(defaultRules),
    },
  });

  const rows: {
    name: string;
    email: string;
    phone: string;
    education: string;
    years: string;
    city: string;
    written: number;
    coding: number;
    personality: number;
    stage: string;
    source: string;
    expectedSalary: string;
  }[] = [
    {
      name: "林晨",
      email: "linchen@example.com",
      phone: "13800001001",
      education: "硕士",
      years: "4",
      city: "上海",
      written: 82,
      coding: 76,
      personality: 72,
      stage: "RESUME_FIRST",
      source: "BOSS_ZHIPIN",
      expectedSalary: "25-35K",
    },
    {
      name: "周予安",
      email: "zhouya@example.com",
      phone: "13800001002",
      education: "本科",
      years: "2",
      city: "杭州",
      written: 71,
      coding: 88,
      personality: 55,
      stage: "ONLINE_TEST",
      source: "REFERRAL",
      expectedSalary: "15-22K",
    },
    {
      name: "沈知远",
      email: "shenzy@example.com",
      phone: "13800001003",
      education: "本科",
      years: "6",
      city: "深圳",
      written: 90,
      coding: 70,
      personality: 80,
      stage: "FIRST_INTERVIEW",
      source: "JOB51",
      expectedSalary: "30-40K",
    },
    {
      name: "顾清和",
      email: "guqh@example.com",
      phone: "13800001004",
      education: "博士",
      years: "1",
      city: "北京",
      written: 94,
      coding: 92,
      personality: 88,
      stage: "OFFER",
      source: "SHIXISENG",
      expectedSalary: "面议",
    },
    {
      name: "江晚晴",
      email: "jiangwq@example.com",
      phone: "13800001005",
      education: "硕士",
      years: "3",
      city: "上海",
      written: 68,
      coding: 81,
      personality: 48,
      stage: "RESUME_FIRST",
      source: "OTHER",
      expectedSalary: "20-28K",
    },
  ];

  for (const r of rows) {
    await prisma.candidate.create({
      data: {
        name: r.name,
        email: r.email,
        phone: r.phone,
        stage: r.stage,
        source: r.source,
        expectedSalary: r.expectedSalary,
        agentProcessedAt:
          r.stage === "RESUME_FIRST" || r.stage === "ONLINE_TEST"
            ? null
            : new Date(),
        fieldValues: {
          create: [
            { fieldId: edu.id, value: r.education },
            { fieldId: years.id, value: r.years },
            { fieldId: city.id, value: r.city },
          ],
        },
        scores: {
          create: [
            { assessmentId: written.id, score: r.written },
            { assessmentId: coding.id, score: r.coding },
            { assessmentId: personality.id, score: r.personality },
          ],
        },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
