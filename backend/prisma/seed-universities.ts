import { prisma } from "../src/lib/prisma";

type SeedData = {
  institutions: Array<{
    university: string;
    institution: string;
    abbreviation: string | null;
    studentCount2023_2024: number | null;
    institutionArabic: string | null;
    universityArabic: string | null;
    city: string;
    country: string;
    address: string | null;
    phone: string | number | null;
    fax: string | number | null;
  }>;
  universities: string[];
};

const data = (await Bun.file(
  new URL("./morocco-public-universities-2024-2025.json", import.meta.url),
).json()) as SeedData;

async function main() {
  const universityCache = new Map<string, string>();

  for (const row of data.institutions) {
    let universityId = universityCache.get(row.university);

    if (!universityId) {
      const university = await prisma.university.upsert({
        where: { name: row.university },
        update: {
          nameArabic: row.universityArabic ?? undefined,
          country: row.country,
        },
        create: {
          name: row.university,
          nameArabic: row.universityArabic ?? undefined,
          country: row.country,
        },
      });

      universityId = university.id;
      universityCache.set(row.university, university.id);
    }

    await prisma.institution.upsert({
      where: {
        name_city: {
          name: row.institution,
          city: row.city,
        },
      },
      update: {
        abbreviation: row.abbreviation ?? undefined,
        nameArabic: row.institutionArabic ?? undefined,
        country: row.country,
        address: row.address ?? undefined,
        phone: row.phone?.toString() ?? undefined,
        fax: row.fax?.toString() ?? undefined,
        studentCount2023_2024: row.studentCount2023_2024 ?? undefined,
        universityId,
      },
      create: {
        name: row.institution,
        abbreviation: row.abbreviation ?? undefined,
        nameArabic: row.institutionArabic ?? undefined,
        city: row.city,
        country: row.country,
        address: row.address ?? undefined,
        phone: row.phone?.toString() ?? undefined,
        fax: row.fax?.toString() ?? undefined,
        studentCount2023_2024: row.studentCount2023_2024 ?? undefined,
        universityId,
      },
    });
  }

  console.log(
    `Seeded ${data.universities.length} universities and ${data.institutions.length} institutions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
