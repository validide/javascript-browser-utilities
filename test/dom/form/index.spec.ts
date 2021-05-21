/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { test_appendformData } from './appendformData.spec';

export function testFromModule() {
  describe('FORM MODULE', () => {
    test_appendformData();
  });
}
