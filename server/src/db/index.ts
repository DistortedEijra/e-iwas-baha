import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://eiwas:eiwas_pw@localhost:5432/eiwas_baha',
});
