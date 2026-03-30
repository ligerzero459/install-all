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

const CLEAN_INSTALL_ARGS = {
  npm:  ['ci'],
  yarn: ['install', '--frozen-lockfile'],
  pnpm: ['install', '--frozen-lockfile'],
  bun:  ['install', '--frozen-lockfile'],
}

async function runInstall(dir, pm, options = {}) {
  if (!SUPPORTED_PACKAGE_MANAGERS.has(pm)) {
    return { success: false, error: `Unsupported package manager: ${pm}` }
  }

  const args = options.clean ? CLEAN_INSTALL_ARGS[pm] : ['install']

  try {
    await execFile(pm, args, { cwd: dir })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
}

module.exports = {
  determinePackageManager,
  runInstall
}
