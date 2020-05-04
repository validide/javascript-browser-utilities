import 'mocha';
import { getHashCode } from '../../src/index';
import { expect } from 'chai';

export function test_getHashCode() {
  describe('getHashCode', () => {

    it('should return same value for identical input', () => {
      const value = 'some string';
      expect(getHashCode(value)).to.eq(getHashCode(value));
      expect(getHashCode('')).to.be.eq(0);
    });
  });
}
