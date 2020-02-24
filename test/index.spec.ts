import { sayHello } from '../src/index'
import { expect } from 'chai'
import 'mocha'

describe('First test',
  () => {
    it('should return true', () => {
      expect(sayHello('Johny')).to.equal('Hello Johny!')
    })
  })
