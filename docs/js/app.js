(function (window, hljs, undefined) {


  function ready(fn) {
    if (window.document.readyState != 'loading') {
      fn();
    } else {
      window.document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function trimCodeWhitespace(codeString) {
    var rows = codeString.replace('\r\n', '\n').split('\n');
    var toTrim = -1;
    for (let index = 0; index < rows.length; index++) {
      if (toTrim === -1) {
        toTrim = rows[index].search(/\S/);
      }

      if (toTrim > 0) {
        rows[index] = rows[index].substr(Math.min(toTrim, rows[index].search(/\S|$/)));
      }
    }

    return rows.join('\n');
  }

  function highlight() {
    window.document.querySelectorAll('[data-code]')
      .forEach(f => {
        var codeEl = window.document.getElementById(f.getAttribute('data-code'));
        var lang = codeEl.hasAttribute('data-lang') ? codeEl.getAttribute('data-lang') : '';
        var codeString = codeEl.textContent || '';
        codeString = trimCodeWhitespace(codeString);
        appendAsCode(f, codeString, lang);
      });
  }

  function appendAsCode(container, codeString, language) {
    var pre = window.document.createElement('pre');
    var code = window.document.createElement('code');
    code.className = language ? 'language-' + language : 'plaintext';
    code.textContent = codeString;
    pre.appendChild(code);
    container.appendChild(pre);
    hljs.highlightBlock(code);
  }

  function addSpinner(container) {
    container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
  }
  function removeSpinner(container) {
    container.innerHTML = '';
  }

  function init() {
    highlight();
  }

  window.app = {
    appendAsCode: appendAsCode,
    addSpinner: addSpinner,
    removeSpinner: removeSpinner,
    ready: ready,
    init: init
  };
})(window, window.hljs, void 0);

window.app.ready(function () {
  window.app.init();
});
