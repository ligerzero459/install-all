'use strict'

const fs = require('node:fs')
const promisify = require('node:util').promisify
const execFile = promisify(require('node:child_process').execFile)

const SUPPORTED_PACKAGE_MANAGERS = new Set(['npm', 'yarn', 'pnpm', 'bun'])

function determinePackageManager(dir) {
  try {
    const files = fs.readdirSync(dir)
    if (files.includes('yarn.lock')) return 'yarn'
    if (files.includes('pnpm-lock.yaml')) return 'pnpm'
    if (files.includes('bun.lockb')) return 'bun'
    return 'npm'
  } catch (err) {
    console.error(`Failed to read directory ${dir}:`, err)
    return 'npm'
  }
}

async function runInstall(dir, pm) {
  if (!SUPPORTED_PACKAGE_MANAGERS.has(pm)) {
    return { success: false, error: `Unsupported package manager: ${pm}` }
  }

  try {
    await execFile(pm, ['install'], { cwd: dir })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
}

module.exports = {
  determinePackageManager,
  runInstall
}
