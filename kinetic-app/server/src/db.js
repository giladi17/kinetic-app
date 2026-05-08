const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('../prisma/generated/client')
require('dotenv').config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('CRITICAL ERROR: DATABASE_URL is not defined.')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

module.exports = prisma
