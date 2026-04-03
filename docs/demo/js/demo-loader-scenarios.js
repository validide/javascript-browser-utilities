(function (window) {
  function initLoaderScenarios() {
    window.app.runIframeLoaderSimpleDemo();
    window.app.runIframeLoaderModalDemo();
  }

  window.app.ready(initLoaderScenarios);
})(window);
