'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { findPackageDirs } = require('../directory')

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }) }
function touch(file) { fs.writeFileSync(file, '') }

describe('findPackageDirs', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-all-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('finds directories containing package.json and ignores those without', () => {
    mkdirp(path.join(tmpDir, 'app-a'))
    touch(path.join(tmpDir, 'app-a', 'package.json'))
    mkdirp(path.join(tmpDir, 'app-b'))
    touch(path.join(tmpDir, 'app-b', 'package.json'))
    mkdirp(path.join(tmpDir, 'no-pkg'))

    const dirs = findPackageDirs(tmpDir)
    expect(dirs).toHaveLength(2)
    expect(dirs.sort()).toEqual([
      path.join(tmpDir, 'app-a'),
      path.join(tmpDir, 'app-b'),
    ])
  })

  it('skips node_modules and .git directories', () => {
    mkdirp(path.join(tmpDir, 'node_modules', 'foo'))
    touch(path.join(tmpDir, 'node_modules', 'foo', 'package.json'))
    mkdirp(path.join(tmpDir, '.git', 'hooks'))
    touch(path.join(tmpDir, '.git', 'hooks', 'package.json'))

    expect(findPackageDirs(tmpDir)).toEqual([])
  })

  it('recognizes all lock file types as recursion boundaries', () => {
    for (const lockFile of ['yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'package-lock.json']) {
      const base = fs.mkdtempSync(path.join(os.tmpdir(), 'install-all-lock-'))
      mkdirp(path.join(base, 'proj', 'child'))
      touch(path.join(base, 'proj', 'package.json'))
      touch(path.join(base, 'proj', lockFile))
      touch(path.join(base, 'proj', 'child', 'package.json'))

      const dirs = findPackageDirs(base)
      expect(dirs).toEqual([path.join(base, 'proj')])

      fs.rmSync(base, { recursive: true, force: true })
    }
  })

  it('recurses into subdirectories without a lock file', () => {
    mkdirp(path.join(tmpDir, 'parent', 'child'))
    touch(path.join(tmpDir, 'parent', 'child', 'package.json'))

    const dirs = findPackageDirs(tmpDir)
    expect(dirs).toEqual([path.join(tmpDir, 'parent', 'child')])
  })

  it('handles unreadable directories gracefully', () => {
    mkdirp(path.join(tmpDir, 'readable'))
    touch(path.join(tmpDir, 'readable', 'package.json'))
    mkdirp(path.join(tmpDir, 'unreadable'))
    fs.chmodSync(path.join(tmpDir, 'unreadable'), 0o000)

    const dirs = findPackageDirs(tmpDir)
    expect(dirs).toEqual([path.join(tmpDir, 'readable')])

    fs.chmodSync(path.join(tmpDir, 'unreadable'), 0o755)
  })

  it('returns empty array when base directory is unreadable', () => {
    const unreadable = path.join(tmpDir, 'no-access')
    mkdirp(unreadable)
    fs.chmodSync(unreadable, 0o000)

    expect(findPackageDirs(unreadable)).toEqual([])

    fs.chmodSync(unreadable, 0o755)
  })

  it('defaults to current directory when no argument is provided', () => {
    const origCwd = process.cwd()
    process.chdir(tmpDir)
    mkdirp(path.join(tmpDir, 'proj'))
    touch(path.join(tmpDir, 'proj', 'package.json'))

    const dirs = findPackageDirs()
    expect(dirs).toEqual([path.join('.', 'proj')])

    process.chdir(origCwd)
  })
})
