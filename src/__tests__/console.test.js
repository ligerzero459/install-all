'use strict'

const ConsoleUtils = require('../console')

let mockLineInstance
jest.mock('clui', () => ({
  Line: jest.fn(function () {
    const mockObj = {}
    mockObj.padding = jest.fn().mockReturnValue(mockObj)
    mockObj.column = jest.fn().mockReturnValue(mockObj)
    mockObj.fill = jest.fn().mockReturnValue(mockObj)
    mockObj.output = jest.fn().mockReturnValue(mockObj)
    mockLineInstance = mockObj
    return mockLineInstance
  }),
}))

describe('ConsoleUtils', () => {
  let utils
  const mockOutput = {}

  beforeEach(() => {
    mockLineInstance = null
    utils = new ConsoleUtils(mockOutput)
  })

  describe('singleLine', () => {
    it('renders a message with default and custom colors', () => {
      utils.singleLine('hello')

      const CLI = require('clui')
      expect(CLI.Line).toHaveBeenCalledWith(mockOutput)
      expect(mockLineInstance.padding).toHaveBeenCalledWith(2)
      expect(mockLineInstance.column).toHaveBeenCalledWith('hello', 5, expect.any(Array))
      expect(mockLineInstance.fill).toHaveBeenCalled()
      expect(mockLineInstance.output).toHaveBeenCalled()

      const color = jest.fn()
      utils.singleLine('test message', color)
      expect(mockLineInstance.column).toHaveBeenCalledWith('test message', 12, [color])
    })
  })

  describe('progressLine', () => {
    it('renders message with progress bar and counts', () => {
      const mockProgress = { update: jest.fn().mockReturnValue('████░░') }

      utils.progressLine('Installing...', mockProgress, 3, 10)

      expect(mockLineInstance.padding).toHaveBeenCalledWith(2)
      expect(mockLineInstance.column).toHaveBeenCalledTimes(3)
      expect(mockLineInstance.column).toHaveBeenNthCalledWith(1, 'Installing...', 100, expect.any(Array))
      expect(mockLineInstance.column).toHaveBeenNthCalledWith(2, '(3/10)', 10, expect.any(Array))
      expect(mockLineInstance.column).toHaveBeenNthCalledWith(3, '████░░', 70)
      expect(mockProgress.update).toHaveBeenCalledWith(0.3)
      expect(mockLineInstance.fill).toHaveBeenCalled()
      expect(mockLineInstance.output).toHaveBeenCalled()
    })
  })
})
