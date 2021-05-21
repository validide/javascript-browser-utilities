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
import { test_iframeHttpRequest } from './iframeHttpRequest.spec';
import { test_iframeLoader_content } from './iframeLoader.content.spec';
import { test_iframeLoader_loader } from './iframeLoader.loader.spec';

export function testIframeModule() {
  describe('IFRAME MODULE', () => {
    test_iframeHttpRequest();
    test_iframeLoader_content();
    test_iframeLoader_loader();
  });
}
