'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function touch(file) { fs.writeFileSync(file, '') }

describe('determinePackageManager', () => {
  const { determinePackageManager } = require('../install')
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-all-pm-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('detects the correct package manager from lock files', () => {
    const cases = [
      ['yarn.lock', 'yarn'],
      ['pnpm-lock.yaml', 'pnpm'],
      ['bun.lockb', 'bun'],
    ]
    for (const [lockFile, expected] of cases) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-all-pm-'))
      touch(path.join(dir, lockFile))
      expect(determinePackageManager(dir)).toBe(expected)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('defaults to npm when no lock file exists', () => {
    expect(determinePackageManager(tmpDir)).toBe('npm')
  })

  it('defaults to npm when directory is unreadable', () => {
    expect(determinePackageManager('/nonexistent-dir-xyz')).toBe('npm')
  })
})

describe('runInstall', () => {
  let mockExecFile
  let runInstall

  beforeEach(() => {
    jest.resetModules()
    mockExecFile = jest.fn((_cmd, _args, _opts, cb) => cb(null, '', ''))
    jest.mock('node:child_process', () => ({
      execFile: mockExecFile,
    }))
    ;({ runInstall } = require('../install'))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects unsupported package managers', async () => {
    const result = await runInstall('/tmp', 'unknown')
    expect(result).toEqual({
      success: false,
      error: 'Unsupported package manager: unknown',
    })
  })

  it('succeeds with all supported package managers and passes correct args', async () => {
    for (const pm of ['npm', 'yarn', 'pnpm', 'bun']) {
      const result = await runInstall('/tmp/dir', pm)
      expect(result).toEqual({ success: true })
      expect(mockExecFile).toHaveBeenCalledWith(
        pm, ['install'], { cwd: '/tmp/dir' }, expect.any(Function)
      )
    }
    expect(mockExecFile).toHaveBeenCalledTimes(4)
  })

  it('returns failure with stderr on error', async () => {
    const err = new Error('command failed')
    err.stderr = 'ERR! some error output'
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => cb(err))

    const result = await runInstall('/tmp/some-dir', 'npm')
    expect(result).toEqual({ success: false, error: 'ERR! some error output' })
  })

  it('falls back to error message when stderr is empty', async () => {
    const err = new Error('spawn ENOENT')
    err.stderr = ''
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => cb(err))

    const result = await runInstall('/tmp/some-dir', 'yarn')
    expect(result).toEqual({ success: false, error: 'spawn ENOENT' })
  })

  it('uses clean install args when options.clean is true', async () => {
    const expected = {
      npm:  ['ci'],
      yarn: ['install', '--frozen-lockfile'],
      pnpm: ['install', '--frozen-lockfile'],
      bun:  ['install', '--frozen-lockfile'],
    }

    for (const pm of ['npm', 'yarn', 'pnpm', 'bun']) {
      const result = await runInstall('/tmp/dir', pm, { clean: true })
      expect(result).toEqual({ success: true })
      expect(mockExecFile).toHaveBeenCalledWith(
        pm, expected[pm], { cwd: '/tmp/dir' }, expect.any(Function)
      )
    }
  })

  it('uses regular install args when options.clean is false', async () => {
    for (const pm of ['npm', 'yarn', 'pnpm', 'bun']) {
      const result = await runInstall('/tmp/dir', pm, { clean: false })
      expect(result).toEqual({ success: true })
      expect(mockExecFile).toHaveBeenCalledWith(
        pm, ['install'], { cwd: '/tmp/dir' }, expect.any(Function)
      )
    }
  })

  it('defaults to regular install when no options provided', async () => {
    const result = await runInstall('/tmp/dir', 'npm')
    expect(result).toEqual({ success: true })
    expect(mockExecFile).toHaveBeenCalledWith(
      'npm', ['install'], { cwd: '/tmp/dir' }, expect.any(Function)
    )
  })
})
