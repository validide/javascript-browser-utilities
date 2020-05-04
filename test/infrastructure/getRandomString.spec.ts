import 'mocha';
import { getRandomString } from '../../src/index';
import { expect } from 'chai';

export function test_getRandomString() {
  describe('getRandomString', () => {

    it('should return a non empty string', () => {
      const values = new Array<string>();
      for (let index = 0; index < 100; index++) {
        const value = getRandomString();
        expect(value.length).to.not.be.eq(0);
        values.push(value);
      }

      values.forEach((v, i, arr) => {
        expect(arr.indexOf(v)).to.be.eq(i);
      });
    });
  });
}
