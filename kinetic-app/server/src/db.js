const { PrismaClient } = require('../prisma/generated/client')
require('dotenv').config()

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('CRITICAL ERROR: DATABASE_URL is not defined in the environment.')
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

module.exports = prisma
