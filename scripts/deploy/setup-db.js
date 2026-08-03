#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DB_NAME = process.argv[2] || 'rumaq'
const MIGRATIONS_DIR = resolve('backend', 'migrations')

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
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

console.log(`Setting up RumaQ D1 database: ${DB_NAME}\n`)

if (runCapture('wrangler', ['--version']).status !== 0) {
  console.error('wrangler CLI is not installed. Run: bun add -g wrangler')
  process.exit(1)
}

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`)
  process.exit(1)
}

const WRANGLER_TOML = resolve('backend', 'wrangler.cloudflare.toml')
if (!existsSync(WRANGLER_TOML)) {
  console.error(
    `backend/wrangler.cloudflare.toml not found. Run \`./scripts/deploy.sh cloudflare\` first.`
  )
  process.exit(1)
}

const list = runCapture('wrangler', ['d1', 'list', '--config', WRANGLER_TOML])
if (list.status !== 0) {
  console.error('Unable to list D1 databases. Are you logged in? (wrangler login)')
  process.exit(1)
}

const hasDb = list.stdout.includes(`"${DB_NAME}"`) || list.stdout.includes(`'${DB_NAME}'`)

if (!hasDb) {
  console.log(`Creating D1 database "${DB_NAME}"...`)
  const create = runCapture('wrangler', ['d1', 'create', DB_NAME, '--config', WRANGLER_TOML])
  if (create.status !== 0) {
    console.error('Failed to create database:')
    console.error(create.stderr)
    process.exit(1)
  }
  console.log(create.stdout)
  console.log(
    '\nIMPORTANT: export the database_id above as CLOUDFLARE_DATABASE_ID or add it to your .env file.\n' +
      'Do not commit it to backend/wrangler.cloudflare.toml.\n'
  )
} else {
  console.log(`Database "${DB_NAME}" already exists.`)
}

console.log('Applying migrations...')
const LOCAL_TOML = resolve('backend', 'wrangler.local.toml')
run('wrangler', ['d1', 'migrations', 'apply', DB_NAME, '--local', '--config', LOCAL_TOML], {
  cwd: resolve('backend'),
})

console.log('\nDone. Run the following to apply to production:')
console.log(`  vp run db:migrate --filter backend`)
