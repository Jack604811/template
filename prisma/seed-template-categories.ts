import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Automation",
    description: "Workflow automation templates",
    order: 0,
  },
  {
    name: "AI & ML",
    description: "AI and machine learning workflows",
    order: 1,
  },
  {
    name: "Integrations",
    description: "Third-party service integrations",
    order: 2,
  },
  {
    name: "Data Processing",
    description: "Data transformation and processing",
    order: 3,
  },
  {
    name: "Notifications",
    description: "Notification and alert workflows",
    order: 4,
  },
  {
    name: "Other",
    description: "Miscellaneous templates",
    order: 5,
  },
];

async function main() {
  console.log("Seeding template categories...");

  for (const category of categories) {
    await prisma.templateCategory.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
    console.log(`✓ Seeded category: ${category.name}`);
  }

  console.log("Template categories seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


