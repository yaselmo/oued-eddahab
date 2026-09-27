import prisma from "../../lib/prisma.js";

export async function getCities() {
  const rows = await prisma.institution.findMany({
    where: {
      country: "Morocco",
    },
    select: {
      city: true,
    },
    distinct: ["city"],
    orderBy: {
      city: "asc",
    },
  });

  return rows.map((row) => row.city);
}

export async function getInstitutionsByCity(city: string) {
  return prisma.institution.findMany({
    where: {
      city,
      country: "Morocco",
    },
    select: {
      id: true,
      name: true,
      abbreviation: true,
      university: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}