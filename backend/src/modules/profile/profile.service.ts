import prisma from "../../lib/prisma.js";

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      email: true,
      username: true,

      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,

      age: true,
      city: true,
      country: true,
      nationality: true,
      phone: true,

      languages: true,
      interests: true,
      sex: true,

      program: true,
      year: true,

      role: true,
      createdAt: true,

      institution: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          city: true,

          university: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      _count: {
        select: {
          posts: true,
          clubMemberships: true,
          eventAttendance: true,
        },
      },
    },
  });
}