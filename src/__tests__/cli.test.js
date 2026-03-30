'use strict'

describe('parseCliArgs', () => {
  const { parseCliArgs, FLAG_REGISTRY } = require('../cli')

  it('returns empty object with no arguments', () => {
    expect(parseCliArgs([])).toEqual({})
  })

  it('falls back to process.argv when no argv parameter is given', () => {
    const origArgv = process.argv
    process.argv = ['node', 'install-all']
    try {
      expect(parseCliArgs()).toEqual({})
    } finally {
      process.argv = origArgv
    }
  })

  it('parses --version flag', () => {
    expect(parseCliArgs(['--version'])).toEqual({ version: true })
  })

  it('parses -v shorthand', () => {
    expect(parseCliArgs(['-v'])).toEqual({ version: true })
  })

  it('parses --help flag', () => {
    expect(parseCliArgs(['--help'])).toEqual({ help: true })
  })

  it('parses -h shorthand', () => {
    expect(parseCliArgs(['-h'])).toEqual({ help: true })
  })

  it('parses --clean flag', () => {
    expect(parseCliArgs(['--clean'])).toEqual({ clean: true })
  })

  it('parses -c shorthand', () => {
    expect(parseCliArgs(['-c'])).toEqual({ clean: true })
  })

  it('parses multiple flags together', () => {
    expect(parseCliArgs(['--clean', '--version'])).toEqual({ clean: true, version: true })
  })

  it('throws on unknown flags', () => {
    expect(() => parseCliArgs(['--unknown'])).toThrow()
  })

  it('handles flags without a short alias in parsing', () => {
    FLAG_REGISTRY['_test_long_only'] = {
      type: 'boolean',
      description: 'Test flag without short',
    }
    try {
      expect(parseCliArgs(['--_test_long_only'])).toEqual({ _test_long_only: true })
    } finally {
      delete FLAG_REGISTRY['_test_long_only']
    }
  })
})

describe('printVersion', () => {
  const { printVersion } = require('../cli')

  it('prints the version from package.json', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    printVersion()
    const pkg = require('../../package.json')
    expect(spy).toHaveBeenCalledWith(pkg.version)
    spy.mockRestore()
  })
})

describe('printHelp', () => {
  const { printHelp, FLAG_REGISTRY } = require('../cli')

  it('prints help text containing all registered flags', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    printHelp()
    const output = spy.mock.calls[0][0]

    for (const [name, config] of Object.entries(FLAG_REGISTRY)) {
      expect(output).toContain(`--${name}`)
      if (config.short) expect(output).toContain(`-${config.short}`)
      expect(output).toContain(config.description)
    }

    expect(output).toContain('Usage:')
    spy.mockRestore()
  })

  it('handles flags without a short alias', () => {
    FLAG_REGISTRY['_test_flag'] = {
      type: 'boolean',
      description: 'A test flag without short',
    }
    try {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
      printHelp()
      const output = spy.mock.calls[0][0]
      expect(output).toContain('--_test_flag')
      expect(output).toContain('A test flag without short')
      spy.mockRestore()
    } finally {
      delete FLAG_REGISTRY['_test_flag']
    }
  })
})
