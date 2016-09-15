#!/usr/local/bin/node

'use strict'

const exec = require('child_process').exec
const fs = require('fs')
const path = require('path')
const async = require('async')

var count = 0

function runInstall(dir, cb) {
  exec('npm install', { cwd: path.join('.', dir) }, (err, stdout, stderr) => {
    if (err) {
      return cb(err)
    }
    console.log(dir, stdout)
    count++
    cb()
  })
}

function checkDirForPackage(dir, cb) {
  const workingDir = path.join('.', dir)
  if (!fs.lstatSync(workingDir).isDirectory()) {
    return cb()
  }

  fs.readdir(workingDir, (err, files) => {
    if (err) return cb(err)

    if (!files.includes('package.json')) {
      return cb()
    }
    runInstall(dir, cb)
  })
}

function readDirs(cb) {
  fs.readdir('.', (err, files) => {
    if (err) throw err
    async.eachLimit(files, 4, checkDirForPackage, (err) => {
      if (err) throw err

      cb()
    })
  })
}

readDirs(() => {
  console.log('Package install complete.')
  console.log(count + ' package installations performed.')
})
