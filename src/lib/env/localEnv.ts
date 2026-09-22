import { promises as fs } from 'fs'
import path from 'path'

const LOCAL_ENV_PATH = path.join(process.cwd(), '.env.local')

function formatEnvValue(value: string) {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"')

  return `"${escaped}"`
}

export async function upsertLocalEnv(values: Record<string, string>) {
  let content = ''

  try {
    content = await fs.readFile(LOCAL_ENV_PATH, 'utf8')
  } catch {
    content = ''
  }

  const lines = content.length > 0 ? content.split(/\r?\n/) : []
  const nextLines = [...lines]

  for (const [key, value] of Object.entries(values)) {
    const serialized = `${key}=${formatEnvValue(value)}`
    const existingIndex = nextLines.findIndex((line) => line.startsWith(`${key}=`))

    if (existingIndex >= 0) {
      nextLines[existingIndex] = serialized
    } else {
      nextLines.push(serialized)
    }
  }

  const normalized = nextLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()

  await fs.writeFile(LOCAL_ENV_PATH, `${normalized}\n`, 'utf8')
}
