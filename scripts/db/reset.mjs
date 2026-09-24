// Drops and recreates the local database, then migrates and seeds. Local only — refuses a remote URL.
import { connect, ADMIN_URL, DATABASE_URL, IS_LOCAL } from './lib.mjs';
if (!IS_LOCAL) { console.error('db:reset only runs against a local database'); process.exit(1); }
const dbName = new URL(DATABASE_URL).pathname.slice(1);
const admin = connect(ADMIN_URL);
await admin.unsafe(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${dbName}' and pid <> pg_backend_pid()`);
await admin.unsafe(`drop database if exists "${dbName}"`);
await admin.unsafe(`create database "${dbName}"`);
await admin.end();
await import('./migrate.mjs');
await import('./seed.mjs');
