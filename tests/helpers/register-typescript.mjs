import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Native Node type stripping plus the same local import resolution used by Next.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'next/server') return next('next/server.js', context)
  const candidate = specifier.startsWith('@/') ? new URL(`../../src/${specifier.slice(2)}`, import.meta.url)
    : specifier.startsWith('.') && context.parentURL ? new URL(specifier, context.parentURL) : null
  if (candidate && !existsSync(fileURLToPath(candidate)) && existsSync(fileURLToPath(candidate) + '.ts')) return next(candidate.href + '.ts', context)
  return next(specifier, context)
} })
