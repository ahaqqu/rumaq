import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env } from './types.js'
import { apiApp } from './apps/api.js'

export class CachedApi extends WorkerEntrypoint<Env['Bindings']> {
  async fetch(request: Request, env?: Env['Bindings']): Promise<Response> {
    return apiApp.fetch(request, env ?? this.env, this.ctx)
  }
}
