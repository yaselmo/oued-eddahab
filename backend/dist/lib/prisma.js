import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
export default prisma;
//# sourceMappingURL=prisma.js.map