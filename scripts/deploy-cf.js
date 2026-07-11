#!/usr/bin/env node
import Cloudflare from 'cloudflare'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CLOUDFLARE_API_TOKEN
const command = process.argv[2]

if (!accountId || !apiToken) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN')
  process.exit(1)
}

const cf = new Cloudflare({ apiToken })

async function d1Setup() {
  const dbName = process.env.D1_DATABASE_NAME || 'rumaq'
  const resp = await cf.d1.database.list({ account_id: accountId })
  const dbs = resp.result
  const existing = dbs?.find((d) => d.name === dbName)
  if (existing) {
    console.log(existing.uuid)
    return
  }
  const created = await cf.d1.database.create({
    account_id: accountId,
    name: dbName,
  })
  console.log(created.uuid)
}

async function r2Ensure() {
  const bucketName = process.env.R2_BUCKET_NAME || 'rumaq-receipts'
  const { buckets } = await cf.r2.buckets.list({ account_id: accountId })
  const existing = buckets?.find((b) => b.name === bucketName)
  if (existing) {
    console.log('EXISTS')
    return
  }
  await cf.r2.buckets.create({ account_id: accountId, name: bucketName })
  console.log('CREATED')
}

async function putSecrets() {
  const scriptName = 'api'
  const secrets = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'WORKER_JWT_SECRET',
    'WORKER_ENCRYPTION_KEY',
  ]
  const results = []
  for (const name of secrets) {
    const val = process.env[name]
    if (!val) {
      results.push({ name, status: 'skipped' })
      continue
    }
    try {
      await cf.workers.scripts.secrets.update(scriptName, {
        account_id: accountId,
        name,
        text: val,
        type: 'secret_text',
      })
      results.push({ name, status: 'set' })
    } catch (e) {
      results.push({ name, status: 'error', error: e.message })
    }
  }
  console.log(JSON.stringify(results))
}

async function pagesBindings() {
  const projectName = process.env.PAGES_PROJECT_NAME || 'rumaq'
  const dbName = process.env.D1_DATABASE_NAME || 'rumaq'
  const bucketName = process.env.R2_BUCKET_NAME || 'rumaq-receipts'

  // Get database ID
  const dbs = await cf.d1.database.list({ account_id: accountId })
  const db = dbs.result?.find((d) => d.name === dbName)
  if (!db) {
    console.error(`D1 database "${dbName}" not found`)
    process.exit(1)
  }

  // Get current project to preserve existing config
  const project = await cf.pages.projects.get(projectName, {
    account_id: accountId,
  })
  const prod = project.deployment_configs?.production || {}
  const preview = project.deployment_configs?.preview || {}

  // Pages API uses dictionary format: binding name is the key
  const d1Databases = { ...(prod.d1_databases || {}), DB: { id: db.uuid } }
  const r2Buckets = {
    ...(prod.r2_buckets || {}),
    RECEIPTS: { name: bucketName },
  }

  await cf.pages.projects.edit(projectName, {
    account_id: accountId,
    deployment_configs: {
      production: { ...prod, d1_databases: d1Databases, r2_buckets: r2Buckets },
      preview: { ...preview, d1_databases: d1Databases, r2_buckets: r2Buckets },
    },
  })
  console.log('OK')
}

async function main() {
  try {
    switch (command) {
      case 'd1-setup':
        await d1Setup()
        break
      case 'r2-ensure':
        await r2Ensure()
        break
      case 'put-secrets':
        await putSecrets()
        break
      case 'pages-bindings':
        await pagesBindings()
        break
      default:
        console.error(
          `Usage: deploy-cf.js <d1-setup|r2-ensure|put-secrets|pages-bindings>`
        )
        process.exit(1)
    }
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }
}

main()
