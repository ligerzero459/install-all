'use strict'

const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

let mockFindPackageDirs
let mockDeterminePackageManager
let mockRunInstall
let mockWriteFileSync
let mockExitCode

beforeEach(() => {
  jest.resetModules()
  mockExitCode = null

  mockFindPackageDirs = jest.fn().mockReturnValue([])
  mockDeterminePackageManager = jest.fn().mockReturnValue('npm')
  mockRunInstall = jest.fn().mockResolvedValue({ success: true })
  mockWriteFileSync = jest.fn()

  jest.mock('chalk', () => {
    const passthrough = (s) => s
    passthrough.blue = passthrough
    passthrough.green = passthrough
    passthrough.red = passthrough
    passthrough.yellow = passthrough
    passthrough.cyan = passthrough
    passthrough.white = passthrough
    return passthrough
  })

  jest.mock('clui', () => ({
    LineBuffer: jest.fn().mockReturnValue({}),
    Progress: jest.fn().mockReturnValue({ update: jest.fn() }),
    Line: jest.fn().mockReturnValue({
      padding: jest.fn().mockReturnThis(),
      column: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
    }),
  }))

  jest.mock('figlet', () => ({
    textSync: jest.fn().mockReturnValue('install-all'),
  }))

  jest.mock('async', () => ({
    eachLimit: jest.fn(async (items, limit, fn) => {
      for (const item of items) {
        await fn(item)
      }
    }),
  }))

  jest.mock('../directory', () => ({
    findPackageDirs: (...args) => mockFindPackageDirs(...args),
  }))

  jest.mock('../install', () => ({
    determinePackageManager: (...args) => mockDeterminePackageManager(...args),
    runInstall: (...args) => mockRunInstall(...args),
  }))

  jest.spyOn(process, 'exit').mockImplementation((code) => {
    mockExitCode = code
  })

  jest.spyOn(fs, 'writeFileSync').mockImplementation((...args) => mockWriteFileSync(...args))
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

async function loadAndRun() {
  require('../../index')
  // Flush the microtask queue so the async start() completes
  await new Promise(r => setImmediate(r))
  // Allow the .catch() handler to run if process.exit threw
  await new Promise(r => setImmediate(r))
}

describe('index.js (start)', () => {
  it('completes successfully with no package dirs', async () => {
    mockFindPackageDirs.mockReturnValue([])

    await loadAndRun()

    expect(mockFindPackageDirs).toHaveBeenCalled()
    expect(mockRunInstall).not.toHaveBeenCalled()
  })

  it('installs packages with correct PMs and truncates long paths', async () => {
    const longDir = '/tmp/' + 'a'.repeat(60) + '/project'
    mockFindPackageDirs.mockReturnValue(['/tmp/yarn-proj', '/tmp/pnpm-proj', longDir])
    mockDeterminePackageManager
      .mockReturnValueOnce('yarn')
      .mockReturnValueOnce('pnpm')
      .mockReturnValueOnce('npm')
    mockRunInstall.mockResolvedValue({ success: true })

    await loadAndRun()

    expect(mockRunInstall).toHaveBeenCalledWith('/tmp/yarn-proj', 'yarn')
    expect(mockRunInstall).toHaveBeenCalledWith('/tmp/pnpm-proj', 'pnpm')
    expect(mockRunInstall).toHaveBeenCalledWith(longDir, 'npm')
    expect(mockRunInstall).toHaveBeenCalledTimes(3)
  })

  it('logs failures and calls process.exit(1) on errors', async () => {
    mockFindPackageDirs.mockReturnValue(['/tmp/fail-dir'])
    mockRunInstall.mockResolvedValue({ success: false, error: 'install failed' })

    await loadAndRun()

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/install-all-failures-.*\.log$/),
      expect.stringContaining('install failed')
    )
    expect(mockExitCode).toBe(1)
  })

  it('falls back to singleLine banner when figlet throws', async () => {
    jest.mock('figlet', () => ({
      textSync: jest.fn(() => { throw new Error('figlet failed') }),
    }))

    await loadAndRun()

    // If figlet throws, start() should still complete without error
    expect(mockFindPackageDirs).toHaveBeenCalled()
  })

  it('catches unexpected errors from start() and exits', async () => {
    mockFindPackageDirs.mockImplementation(() => { throw new Error('unexpected boom') })

    await loadAndRun()

    expect(console.error).toHaveBeenCalled()
    expect(mockExitCode).toBe(1)
  })
})
