'use strict'

const fs = require('node:fs')
const path = require('node:path')

const LOCK_FILES = new Set(['yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'package-lock.json'])
const SKIP_DIRS = new Set(['node_modules', '.git'])

function findPackageDirs(baseDir = '.') {
  const results = []

  function walk(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      console.warn(`Failed to read directory ${dir}, skipping.`)
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      let children
      try {
        children = fs.readdirSync(fullPath)
      } catch {
        console.warn(`Failed to read directory ${fullPath}, skipping.`)
        continue
      }

      if (children.includes('package.json')) {
        results.push(fullPath)
      }

      // Don't recurse into projects that have their own lock file (workspace roots)
      const hasLockFile = children.some(child => LOCK_FILES.has(child))
      if (!hasLockFile) {
        walk(fullPath)
      }
    }
  }

  walk(baseDir)
  return results
}

module.exports = { findPackageDirs }
