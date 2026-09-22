import assert from 'node:assert/strict'
import { test } from 'node:test'
import { site } from '../../src/config/site.ts'
import robots from '../../src/app/robots.ts'
import sitemap from '../../src/app/sitemap.ts'

test('fictional content stays out of the search index even without demo mode', () => {
  const previous = process.env.NEXT_PUBLIC_DEMO_MODE
  const exampleContent = site.exampleContent
  try {
    delete process.env.NEXT_PUBLIC_DEMO_MODE
    site.exampleContent = true
    assert.equal(robots().rules.disallow, '/')
    assert.deepEqual(sitemap(), [])

    site.exampleContent = false
    assert.equal(robots().rules.allow, '/')
    assert.ok(sitemap().length > 0)

    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
    assert.equal(robots().rules.disallow, '/')
    assert.deepEqual(sitemap(), [])
  } finally {
    site.exampleContent = exampleContent
    if (previous === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE
    else process.env.NEXT_PUBLIC_DEMO_MODE = previous
  }
})
