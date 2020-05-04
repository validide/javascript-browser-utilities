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
