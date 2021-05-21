/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
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
