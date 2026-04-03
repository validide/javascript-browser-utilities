(function (window, hljs, undefined) {

  function getQueryParms() {
    return parseQueryString(window.location.search.substring(1));
  }

  function parseQueryString(queryString) {
    if (!queryString) {
      return {};
    }

    var params = new URLSearchParams(queryString);
    var result = {};
    params.forEach(function (value, key) {
      result[key] = value;
    });
    return result;
  }

  function setQueryParms(data) {
    var params = new URLSearchParams();
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined && data[key] !== null) {
        params.set(key, String(data[key]));
      }
    }

    var newQueryString = params.toString();
    if (newQueryString.length > 0) {
      window.location = window.location.href.split('?')[0] + '?' + newQueryString;
    } else {
      window.location.reload();
    }
  }

  function ready(fn) {
    if (window.document.readyState !== 'loading') {
      fn();
    } else {
      window.document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function trimCodeWhitespace(codeString) {
    var rows = codeString.replace(/\r\n/g, '\n').split('\n');
    var toTrim = -1;
    for (var index = 0; index < rows.length; index++) {
      if (toTrim === -1) {
        toTrim = rows[index].search(/\S/);
      }

      if (toTrim > 0) {
        rows[index] = rows[index].substring(Math.min(toTrim, rows[index].search(/\S|$/)));
      }
    }

    return rows.join('\n');
  }

  function highlight() {
    window.document.querySelectorAll('[data-code]')
      .forEach(function (f) {
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
    if (hljs && typeof hljs.highlightElement === 'function') {
      hljs.highlightElement(code);
    } else if (hljs && typeof hljs.highlightBlock === 'function') {
      hljs.highlightBlock(code);
    }
  }

  function appendError(container, message) {
    var el = window.document.createElement('div');
    el.className = 'result-error';
    el.textContent = message;
    container.appendChild(el);
  }

  function addLoader(container) {
    if (!container || container.querySelectorAll('.loader').length) {
      return; // We already have a loader;
    }

    var loader = window.document.createElement('div');
    loader.className = 'loader';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-label', 'Loading');
    container.appendChild(loader);
  }
  function removeLoader(container) {
    if (!container) {
      return;
    }

    container.querySelectorAll('.loader').forEach(function (f) {
      f.parentElement.removeChild(f);
    });
  }

  function setPageLoadingState(loading) {
    //loader-absolute
    var globalLoader = document.getElementById('global-loading');
    if (!globalLoader) {
      globalLoader = document.createElement('div');
      globalLoader.id = 'global-loading';
      globalLoader.classList.add('d-none');
      globalLoader.classList.add('loader-absolute');
      globalLoader.innerHTML = '<div class="loader"></div>';
      document.body.appendChild(globalLoader);
    }

    if (loading) {
      globalLoader.classList.remove('d-none');
    } else {
      globalLoader.classList.add('d-none');
    }
  }

  function runIframeHttpRequestDemo(options) {
    var config = options || {};
    var container = window.document.getElementById(config.resultElementId || '');
    if (!container) {
      return null;
    }

    var request = new window.validide_jbu.IframeHttpRequest(
      window,
      config.url,
      config.data || null,
      config.method || 'GET',
      config.requestOptions || {}
    );

    var pendingRequest = request.sendAsync();
    if (typeof config.afterSend === 'function') {
      config.afterSend(request, pendingRequest);
    }

    addLoader(container);
    pendingRequest.then(
      function (res) {
        removeLoader(container);
        if (res && res.data) {
          appendAsCode(container, res.data, config.successLanguage || 'json');
        } else {
          appendError(container, (res && res.error && res.error.message) || 'Request did not return data.');
        }
      },
      function (err) {
        removeLoader(container);
        appendError(container, (err && err.error && err.error.message) || 'Request failed.');
      }
    );

    return {
      container: container,
      request: request,
      promise: pendingRequest
    };
  }

  function runIframeLoaderSimpleDemo(options) {
    var config = options || {};
    var consoleContainer = window.document.getElementById(config.consoleElementId || 'console-IframeLoader-simple');
    var events = [];

    function handleEvent(e, contentContainer) {
      events.push(e);

      switch (e.type) {
        case 'beforeCreate': {
          addLoader(contentContainer);
          break;
        }
        case 'created': {
          e.el.classList.add('iframe-block-content');
          e.el.classList.add('iframe-pending-ready');
          break;
        }
        case 'beforeUpdate': {
          addLoader(contentContainer);
          break;
        }
        case 'updated': {
          e.el.classList.remove('iframe-pending-ready');
          removeLoader(contentContainer);
          break;
        }
        case 'beforeDestroy': {
          alert('Component "' + e.el.querySelector('iframe').src + '" is about to destroy!');
          break;
        }
        case 'destroyed': {
          removeLoader(contentContainer);
          alert('Component wad destroyed!');
          break;
        }
        default:
          break;
      }

      if (consoleContainer) {
        consoleContainer.innerHTML = '';
        appendAsCode(
          consoleContainer,
          events.map(function (eventInfo) {
            return JSON.stringify(eventInfo, undefined, 2);
          }).join('\n')
        );
      }
    }

    function createIframeLoader(url, parentElementId) {
      var parentEl = window.document.getElementById(parentElementId);
      if (!parentEl) {
        return null;
      }

      return new window.validide_jbu.IframeLoader(window, {
        url: url,
        parent: parentEl,
        events: {
          beforeCreate: function (e) {
            handleEvent(e, parentEl);
          },
          created: function (e) {
            handleEvent(e, parentEl);
          },
          beforeMount: function (e) {
            handleEvent(e, parentEl);
          },
          mounted: function (e) {
            handleEvent(e, parentEl);
          },
          beforeUpdate: function (e) {
            handleEvent(e, parentEl);
          },
          updated: function (e) {
            handleEvent(e, parentEl);
          },
          beforeDestroy: function (e) {
            handleEvent(e, parentEl);
          },
          destroyed: function (e) {
            handleEvent(e, parentEl);
          }
        },
        iframeAttributes: {
          allowtransparency: 'true',
          frameborder: 0
        }
      });
    }

    return {
      iframeContentLoader: createIframeLoader(
        config.localUrl || './redirect.html?iterate=3&url=' + encodeURIComponent(window.validide_jbu.getUrlFullPath(window.document, './simple-iframe-content.html')),
        config.localResultElementId || 'result-IframeLoader-simple'
      ),
      crossDomainIframeContentLoader: createIframeLoader(
        config.crossDomainUrl || 'https://vadi-testing-stuff.firebaseapp.com/javascript-browser-utilities/simple-iframe-content.html',
        config.crossDomainResultElementId || 'result-IframeLoader-cross-domain'
      )
    };
  }

  function runIframeLoaderModalDemo(options) {
    var config = options || {};
    var contentLoader = null;
    var btn = window.document.getElementById(config.buttonElementId || 'open-modal');
    if (!btn) {
      return null;
    }

    function eventHander(e) {
      switch (e.type) {
        case 'beforeCreate': {
          setPageLoadingState(true);
          break;
        }
        case 'created': {
          e.el.classList.add('d-none');
          break;
        }
        case 'beforeUpdate': {
          setPageLoadingState(true);
          break;
        }
        case 'updated': {
          e.el.classList.remove('d-none');
          e.el.classList.add('iframe-modal-content');
          setPageLoadingState(false);
          break;
        }
        case 'beforeDestroy': {
          setPageLoadingState(true);
          break;
        }
        case 'destroyed': {
          setPageLoadingState(false);
          contentLoader = null;
          btn.removeAttribute('disabled');
          break;
        }
        default:
          break;
      }
    }

    function openModal(e) {
      e.target.setAttribute('disabled', 'disabled');
      if (contentLoader) {
        return; // Should not happen but better be safe.
      }

      contentLoader = new window.validide_jbu.IframeLoader(window, {
        url: config.modalUrl || './redirect.html?iterate=5&url=' + encodeURIComponent(window.validide_jbu.getUrlFullPath(window.document, './modal-iframe-content.html')),
        parent: 'body',
        events: {
          beforeCreate: eventHander,
          created: eventHander,
          beforeMount: eventHander,
          mounted: eventHander,
          beforeUpdate: eventHander,
          updated: eventHander,
          beforeDestroy: eventHander,
          destroyed: eventHander
        },
        iframeAttributes: {
          allowtransparency: 'true',
          frameborder: 0
        }
      });
    }

    btn.addEventListener('click', openModal);

    window.document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && contentLoader) {
        contentLoader.dispose();
      }
    });

    return {
      openModal: openModal
    };
  }

  function init() {
    highlight();
  }

  window.app = {
    appendAsCode: appendAsCode,
    appendError: appendError,
    addLoader: addLoader,
    getQueryParms: getQueryParms,
    parseQueryString: parseQueryString,
    removeLoader: removeLoader,
    runIframeLoaderSimpleDemo: runIframeLoaderSimpleDemo,
    runIframeLoaderModalDemo: runIframeLoaderModalDemo,
    runIframeHttpRequestDemo: runIframeHttpRequestDemo,
    ready: ready,
    setQueryParms: setQueryParms,
    setPageLoadingState: setPageLoadingState,
    init: init
  };
})(window, window.hljs, void 0);

window.app.ready(function () {
  window.app.init();
});
