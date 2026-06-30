#!/usr/bin/env node
/**
 * RumaQ D1 setup script
 *
 * Usage:
 *   node scripts/setup-db.js [database-name]
 *
 * Defaults to "rumaq". The script creates the D1 database (if it does not exist)
 * and applies migrations from worker/migrations/.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DB_NAME = process.argv[2] || 'rumaq'
const MIGRATIONS_DIR = resolve('worker', 'migrations')

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  if (result.status !== 0) {
    console.error(`\nCommand failed: ${command} ${args.join(' ')}`)
    process.exit(result.status || 1)
  }
  return result
}

function runCapture(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

console.log(`Setting up RumaQ D1 database: ${DB_NAME}\n`)

// Verify wrangler is installed.
if (runCapture('wrangler', ['--version']).status !== 0) {
  console.error('wrangler CLI is not installed. Run: npm install -g wrangler')
  process.exit(1)
}

// Verify migrations directory exists.
if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`)
  process.exit(1)
}

const WRANGLER_TOML = resolve('worker', 'wrangler.toml')
if (!existsSync(WRANGLER_TOML)) {
  console.error(`worker/wrangler.toml not found. Copy it from worker/wrangler.toml.example first.`)
  process.exit(1)
}

// Check whether the database already exists.
const list = runCapture('wrangler', ['d1', 'list'])
if (list.status !== 0) {
  console.error('Unable to list D1 databases. Are you logged in? (wrangler login)')
  process.exit(1)
}

const hasDb = list.stdout.includes(`"${DB_NAME}"`) || list.stdout.includes(`'${DB_NAME}'`)

if (!hasDb) {
  console.log(`Creating D1 database "${DB_NAME}"...`)
  const create = runCapture('wrangler', ['d1', 'create', DB_NAME])
  if (create.status !== 0) {
    console.error('Failed to create database:')
    console.error(create.stderr)
    process.exit(1)
  }
  console.log(create.stdout)
  console.log('\nIMPORTANT: copy the database_id above into worker/wrangler.toml under [[d1_databases]].\n')
} else {
  console.log(`Database "${DB_NAME}" already exists.`)
}

// Apply migrations.
console.log('Applying migrations...')
run('wrangler', ['d1', 'migrations', 'apply', DB_NAME, '--local'], { cwd: resolve('worker') })

console.log('\nDone. Run the following to apply to production:')
console.log(`  cd worker && wrangler d1 migrations apply ${DB_NAME}`)
