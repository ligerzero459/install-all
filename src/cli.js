'use strict'

const { parseArgs } = require('node:util')
const path = require('node:path')

// Switch registry — add new flags here and they auto-appear in help output
const FLAG_REGISTRY = {
  version: {
    type: 'boolean',
    short: 'v',
    description: 'Print the version number and exit',
  },
  help: {
    type: 'boolean',
    short: 'h',
    description: 'Show this help message and exit',
  },
  clean: {
    type: 'boolean',
    short: 'c',
    description: 'Run clean install (npm ci, yarn/pnpm/bun install --frozen-lockfile)',
  },
}

function buildParseArgsOptions() {
  const options = {}
  for (const [name, config] of Object.entries(FLAG_REGISTRY)) {
    options[name] = { type: config.type }
    if (config.short) options[name].short = config.short
  }
  return options
}

function parseCliArgs(argv) {
  const args = argv || process.argv.slice(2)
  const { values } = parseArgs({
    args,
    options: buildParseArgsOptions(),
    strict: true,
  })
  return values
}

function printVersion() {
  const pkg = require(path.join(__dirname, '..', 'package.json'))
  console.log(pkg.version)
}

function printHelp() {
  const pkg = require(path.join(__dirname, '..', 'package.json'))
  const lines = [
    `${pkg.name} v${pkg.version}`,
    '',
    pkg.description,
    '',
    'Usage: install-all [options]',
    '',
    'Options:',
  ]

  for (const [name, config] of Object.entries(FLAG_REGISTRY)) {
    const shortFlag = config.short ? `-${config.short}, ` : '    '
    lines.push(`  ${shortFlag}--${name.padEnd(12)} ${config.description}`)
  }

  console.log(lines.join('\n'))
}

module.exports = {
  FLAG_REGISTRY,
  parseCliArgs,
  printVersion,
  printHelp,
}
