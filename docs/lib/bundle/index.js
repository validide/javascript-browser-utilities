(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.validide_jbu = {}));
}(this, (function (exports) { 'use strict';

    var BaseComponent = /** @class */ (function () {
        function BaseComponent(window) {
            if (!window)
                throw new Error('Missing "window" reference.');
            this.window = window;
        }
        BaseComponent.prototype.getWindow = function () { return this.window; };
        BaseComponent.prototype.getDocument = function () { return this.getWindow().document; };
        BaseComponent.prototype.dispose = function () {
            this.window = null;
        };
        return BaseComponent;
    }());

    /**
     * Return the origin of an url
     *
     * @param document The reference to the document object
     * @param url The ´url´ for which to get the 'origin'
     * @returns A string representing the url origin
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function getUrlOrigin(document, url) {
        if (!url)
            return '';
        var a = document.createElement('a');
        a.setAttribute('href', url);
        return a.protocol + '//' + a.hostname + (a.port && ':' + a.port);
    }

    /**
     * Return the full path of an url (the origin and path name)
     *
     * @param document The reference to the document object
     * @param url The ´url´ for which to get the full path
     * @returns A string representing the url full path
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function getUrlFullPath(document, url) {
        if (!url)
            return '';
        var a = document.createElement('a');
        a.setAttribute('href', url);
        return a.protocol + '//' + a.hostname + (a.port && ':' + a.port) + a.pathname;
    }

    /* eslint-disable no-bitwise */
    /**
     * Get a hash code for the given string
     *
     * @returns The hash code
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function getHashCode(value) {
        var hash = 0;
        var length = value.length;
        var char;
        var index = 0;
        if (length === 0)
            return hash;
        while (index < length) {
            char = value.charCodeAt(index);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
            index++;
        }
        return hash;
    }

    /**
     * Generate a random string
     *
     * @returns A random generated string
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function getRandomString() { return Math.random().toString(36).substring(2); }

    /**
     * Generate a random id that is not present in the document at this time
     *
     * @param document The reference to the document object
     * @returns A random generated string
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function generateUniqueId(document, prefix) {
        if (prefix === void 0) { prefix = ''; }
        var prefixString = (prefix !== null && prefix !== void 0 ? prefix : '');
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // The 'A-' will ensure this is always a valid JavaScript ID
            var id = prefixString + 'A-' + getRandomString() + getRandomString();
            if (document.getElementById(id) === null) {
                return id;
            }
        }
    }

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function appendInput(ownerDocument, form, name, value) {
        var input = ownerDocument.createElement('input');
        input.name = name;
        input.value = value;
        input.type = 'hidden';
        form.appendChild(input);
    }
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function appendData(ownerDocument, form, data, parentProp) {
        if (typeof data === 'object' && data != null) {
            if (data instanceof Date) {
                appendInput(ownerDocument, form, parentProp, data.toISOString());
            }
            else {
                Object.keys(data).forEach(function (prop) {
                    appendData(ownerDocument, form, data[prop], parentProp ? parentProp + "[" + prop + "]" : prop);
                });
            }
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            appendInput(ownerDocument, form, parentProp, data === null || data === undefined ? '' : data.toString());
        }
    }
    /**
     * Append an object to a form as 'input'(HTMLInputElement) elements
     *
     * @param data The information to append to the the ´form´
     * @param form The form (HTMLFormElement) element to elements to
     * @throws {Error} if the ´form´ does not have an 'ownerDocument'
     */
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    function appendDataToForm(data, form) {
        if (!data)
            return;
        if (!form.ownerDocument)
            throw new Error('The "ownerDocument" of the "form" shold be the a reference to the parent window!');
        appendData(form.ownerDocument, form, data, '');
    }

    var __extends = (window && window.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    /**
     * Make a HTTP request using an iframe
     */
    var IframeHttpRequest = /** @class */ (function (_super) {
        __extends(IframeHttpRequest, _super);
        /**
         * Object constructor
         *
         * @param window A reference to the window object
         * @param url The url to make the request to
         * @param data The data to send. Default NULL
         * @param method The HTTP method. GET(default) or POST
         * @param options The request options IframeHttpRequestOptions. Default null and will use the IframeHttpRequest.DEFAULT_OPTIONS
         */
        function IframeHttpRequest(window, url, data, method, options) {
            if (data === void 0) { data = null; }
            if (method === void 0) { method = 'GET'; }
            if (options === void 0) { options = null; }
            var _this = _super.call(this, window) || this;
            _this.data = null;
            _this.method = 'GET';
            _this.validateInput(url, method);
            _this.url = url; // might consider defaulting to 'about:blank' as empty url is not allowed for src on iFrames and this is where this will end-up
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            _this.data = data;
            _this.method = method;
            _this.options = (Object.assign({}, IframeHttpRequest.DEFAULT_OPTIONS, options));
            _this.resolvePromise = null;
            _this.rejectPromise = null;
            _this.loadHandlerRef = function (e) { return _this.loadHandler(e); };
            _this.wrapperId = generateUniqueId(_this.getDocument(), 'IframeHttpRequest_wrapper_');
            _this.timeoutRef = 0;
            _this.redirectTimeoutRef = 0;
            _this.called = false;
            _this.disposed = false;
            return _this;
        }
        IframeHttpRequest.prototype.sendAsync = function () {
            if (this.called)
                throw new Error('The "send" method was already called!');
            this.called = true;
            this.init();
            return this.sendAsyncCore();
        };
        IframeHttpRequest.prototype.dispose = function () {
            if (this.disposed)
                return;
            this.disposed = true;
            var win = this.getWindow();
            win.clearTimeout(this.timeoutRef);
            this.timeoutRef = 0;
            win.clearTimeout(this.redirectTimeoutRef);
            this.redirectTimeoutRef = 0;
            var wrapper = this.getDocument().getElementById(this.wrapperId);
            if (wrapper) {
                wrapper.querySelector('iframe').removeEventListener('load', this.loadHandlerRef, false);
                wrapper.parentElement.removeChild(wrapper);
            }
            this.loadHandlerRef = null;
            this.resolvePromise = null;
            this.rejectPromise = null;
            this.url = '';
            this.method = '';
            this.wrapperId = '';
            _super.prototype.dispose.call(this);
        };
        IframeHttpRequest.prototype.validateInput = function (url, method) {
            if (!url)
                throw new Error('Missing "url" reference.');
            switch (method.toUpperCase()) {
                case 'GET':
                case 'POST':
                    break;
                default:
                    throw new Error("Method not supported \"" + method + "\"");
            }
        };
        IframeHttpRequest.prototype.init = function () {
            var iframeId = this.wrapperId + '_iframe';
            var fragment = this.getDocument().createDocumentFragment();
            var wrapper = this.getDocument().createElement('div');
            wrapper.id = this.wrapperId;
            wrapper.style.display = 'none';
            wrapper.innerHTML = "<form target=\"" + iframeId + "\"></form><iframe id=\"" + iframeId + "\" name=\"" + iframeId + "\" width=\"0\" height=\"0\" src=\"about:blank\"></iframe>";
            var form = wrapper.querySelector('form');
            form.action = this.url;
            form.method = this.method;
            form.target = iframeId;
            if (this.data !== null) {
                appendDataToForm(this.data, form);
            }
            fragment.appendChild(wrapper);
            this.getDocument().body.appendChild(fragment);
            var iframe = wrapper.querySelector('iframe');
            iframe.addEventListener('load', this.loadHandlerRef, false);
        };
        IframeHttpRequest.prototype.sendAsyncCore = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.resolvePromise = resolve;
                _this.rejectPromise = reject;
                var wrapper = _this.getDocument().getElementById(_this.wrapperId);
                try {
                    wrapper.querySelector('form').submit();
                    _this.timeoutRef = _this.getWindow().setTimeout(function () {
                        _this.reject(new Error('TIMEOUT'));
                    }, _this.options.timeout);
                }
                catch (error) {
                    _this.reject(error);
                }
            });
        };
        IframeHttpRequest.prototype.loadHandler = function (event) {
            this.getWindow().clearTimeout(this.redirectTimeoutRef);
            var allowRedirects = this.options.redirectTimeout > 0;
            try {
                var contentWindow = event.target.contentWindow;
                // this should throw if iframe is not accessible due to 'X-Frame-Options'
                var targetPath = getUrlFullPath(contentWindow.document, contentWindow.location.href).toLowerCase();
                var desiredPath = getUrlFullPath(contentWindow.document, this.url).toLowerCase();
                var result = {
                    data: contentWindow.document.body.textContent,
                    error: null
                };
                if ((targetPath === desiredPath)) {
                    this.resolve(result);
                }
                else {
                    if (allowRedirects) {
                        this.schedulePromiseResolve(result);
                    }
                    else {
                        this.resolve(result);
                    }
                }
            }
            catch (error) {
                if (allowRedirects) {
                    this.schedulePromiseResolve({
                        data: '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        error: error
                    });
                }
                else {
                    this.reject(error);
                }
            }
        };
        IframeHttpRequest.prototype.schedulePromiseResolve = function (result) {
            var _this = this;
            var win = this.getWindow();
            win.clearTimeout(this.redirectTimeoutRef);
            this.redirectTimeoutRef = win.setTimeout(function () { _this.resolve(result); }, this.options.redirectTimeout);
        };
        IframeHttpRequest.prototype.resolve = function (value) {
            this.resolvePromise(value);
            this.dispose();
        };
        IframeHttpRequest.prototype.reject = function (error) {
            this.rejectPromise({ data: '', error: error });
            this.dispose();
        };
        /**
         * Default options IframeHttpRequestOptions
         */
        // eslint-disable-next-line @typescript-eslint/naming-convention
        IframeHttpRequest.DEFAULT_OPTIONS = {
            timeout: 30 * 1000,
            redirectTimeout: 3 * 1000
        };
        return IframeHttpRequest;
    }(BaseComponent));

    var __extends$1 = (window && window.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    (function (IframeMessageState) {
        IframeMessageState[IframeMessageState["Mounted"] = 0] = "Mounted";
        IframeMessageState[IframeMessageState["BeforeUpdate"] = 1] = "BeforeUpdate";
        IframeMessageState[IframeMessageState["Updated"] = 2] = "Updated";
        IframeMessageState[IframeMessageState["Destroyed"] = 3] = "Destroyed";
    })(exports.IframeMessageState || (exports.IframeMessageState = {}));
    (function (IframeLoaderEventType) {
        IframeLoaderEventType["BeforeCreate"] = "beforeCreate";
        IframeLoaderEventType["Created"] = "created";
        IframeLoaderEventType["BeforeMount"] = "beforeMount";
        IframeLoaderEventType["Mounted"] = "mounted";
        IframeLoaderEventType["BeforeUpdate"] = "beforeUpdate";
        IframeLoaderEventType["Updated"] = "updated";
        IframeLoaderEventType["BeforeDestroy"] = "beforeDestroy";
        IframeLoaderEventType["Destroyed"] = "destroyed";
    })(exports.IframeLoaderEventType || (exports.IframeLoaderEventType = {}));
    /**
     * Iframe loader
     * Load remote content inside an IFRAME.
     */
    var IframeLoader = /** @class */ (function (_super) {
        __extends$1(IframeLoader, _super);
        /**
         * Constructor.
         *
         * @param window Reference to the window object.
         * @param options Loader options.
         */
        function IframeLoader(window, options) {
            var _this = _super.call(this, window) || this;
            if (!(options === null || options === void 0 ? void 0 : options.url))
                throw new Error('The "options.url" value should be a non-empty string.');
            _this.options = options;
            _this.rootElement = null;
            _this.iframeId = '';
            _this.disposed = false;
            _this.onMessageReceived = _this.windowMessageHandler.bind(_this);
            window.addEventListener('message', _this.onMessageReceived);
            _this.onIframeLoaded = _this.iframeLoadedHandler.bind(_this);
            _this.iframeLoaded = false;
            _this.init();
            return _this;
        }
        /**
         * Dispose the loader
         */
        IframeLoader.prototype.dispose = function () {
            if (this.disposed)
                return;
            this.disposed = true;
            this.triggerEvent(exports.IframeLoaderEventType.BeforeDestroy);
            if (this.onIframeLoaded) {
                this.getIframe().removeEventListener('load', this.onIframeLoaded);
            }
            this.iframeLoaded = false;
            this.rootElement.parentElement.removeChild(this.rootElement);
            this.rootElement = null;
            this.getWindow().removeEventListener('message', this.onMessageReceived);
            this.onMessageReceived = null;
            this.triggerEvent(exports.IframeLoaderEventType.Destroyed);
            this.options = null;
            _super.prototype.dispose.call(this);
        };
        IframeLoader.prototype.init = function () {
            this.triggerEvent(exports.IframeLoaderEventType.BeforeCreate);
            this.createRootElement();
            this.createIframe();
            this.triggerEvent(exports.IframeLoaderEventType.Created);
        };
        IframeLoader.prototype.createIframe = function () {
            if (this.getIframe())
                return;
            var iframe = this.getDocument().createElement('iframe');
            var opt = this.getOptions();
            if (opt.iframeAttributes) {
                var keys = Object.keys(opt.iframeAttributes);
                // eslint-disable-next-line @typescript-eslint/prefer-for-of
                for (var index = 0; index < keys.length; index++) {
                    var key = keys[index];
                    iframe.setAttribute(key, opt.iframeAttributes[key]);
                }
            }
            iframe.addEventListener('load', this.onIframeLoaded);
            iframe.setAttribute('src', opt.url);
            this.iframeId = generateUniqueId(this.getDocument(), 'ildr-');
            this.rootElement.appendChild(iframe);
        };
        IframeLoader.prototype.createRootElement = function () {
            if (this.rootElement)
                return;
            var parent = this.getParentElement();
            this.rootElement = this.getDocument().createElement('div');
            parent.appendChild(this.rootElement);
        };
        IframeLoader.prototype.getParentElement = function () {
            var parent = null;
            var opt = this.getOptions();
            if (opt.parent) {
                if (typeof opt.parent === 'string') {
                    parent = this.getDocument().querySelector(opt.parent);
                }
                else {
                    parent = opt.parent;
                }
            }
            if (!parent)
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error("Failed to find parent \"" + opt.parent + "\".");
            return parent;
        };
        IframeLoader.prototype.triggerEvent = function (eventType) {
            var opt = this.getOptions();
            var handler = opt.events
                ? opt.events[eventType]
                : undefined;
            if (handler) {
                try {
                    handler({
                        type: eventType,
                        el: this.rootElement,
                        parentEl: this.getParentElement(),
                        id: this.iframeId
                    });
                }
                catch (error) {
                    if (console && typeof console.error === 'function') {
                        console.error("Calling the \"" + eventType + "\" handler failed.", error);
                    }
                }
            }
        };
        IframeLoader.prototype.getIframe = function () {
            return this.rootElement.querySelector('iframe');
        };
        IframeLoader.prototype.iframeLoadedHandler = function () {
            if (!this.iframeLoaded) {
                this.triggerEvent(exports.IframeLoaderEventType.BeforeMount);
            }
            this.iframeLoaded = true;
        };
        IframeLoader.prototype.windowMessageHandler = function (event) {
            if (event.origin !== this.getIframeOrigin())
                return;
            var messageData = event.data
                ? event.data
                : null;
            if (!messageData) {
                return;
            }
            if (this.shouldShakeHands(messageData)) {
                this.shakeHands(messageData);
                return;
            }
            if (!messageData.id || messageData.id !== this.iframeId)
                return;
            switch (messageData.state) {
                case exports.IframeMessageState.Mounted:
                    this.triggerEvent(exports.IframeLoaderEventType.Mounted);
                    break;
                case exports.IframeMessageState.BeforeUpdate:
                    this.triggerEvent(exports.IframeLoaderEventType.BeforeUpdate);
                    break;
                case exports.IframeMessageState.Updated:
                    this.triggerEvent(exports.IframeLoaderEventType.Updated);
                    break;
                case exports.IframeMessageState.Destroyed:
                    this.dispose();
                    break;
            }
        };
        IframeLoader.prototype.getIframeOrigin = function () {
            return getUrlOrigin(this.getDocument(), this.getOptions().url);
        };
        IframeLoader.prototype.getOptions = function () {
            return this.options;
        };
        IframeLoader.prototype.shouldShakeHands = function (message) {
            // Handshake did not take place
            if (!message.id && message.state === exports.IframeMessageState.Mounted)
                return true;
            return false;
        };
        IframeLoader.prototype.shakeHands = function (requestMessage) {
            var hash = getHashCode(this.iframeId).toString(10);
            var responseMessage = {
                id: '',
                state: exports.IframeMessageState.Mounted
            };
            // We got a message back so if the data matches the hash we sent send the id
            if (requestMessage.data && requestMessage.data === hash) {
                responseMessage.id = this.iframeId;
            }
            else {
                responseMessage.data = hash;
            }
            this.getIframe().contentWindow.postMessage(responseMessage, this.getIframeOrigin());
        };
        return IframeLoader;
    }(BaseComponent));
    /**
     * Content loaded by IframeLoader
     */
    var IframeContent = /** @class */ (function (_super) {
        __extends$1(IframeContent, _super);
        /**
         * Constructor
         *
         * @param window Reference to the window object
         * @param parentOrigin The origin that loaded the content
         */
        function IframeContent(window, parentOrigin) {
            var _this = _super.call(this, window) || this;
            if (typeof parentOrigin !== 'string' || parentOrigin.length === 0)
                throw new Error('Parent origin("parentOrigin") should be a non-empty string.');
            _this.standalone = window === window.parent;
            _this.parentOrigin = parentOrigin;
            _this.iframeId = '';
            _this.messageQueue = new Array();
            _this.disposed = false;
            if (_this.standalone) {
                _this.onMessageReceived = null;
            }
            else {
                _this.onMessageReceived = _this.windowMessageHandler.bind(_this);
                window.addEventListener('message', _this.onMessageReceived);
            }
            _this.init();
            return _this;
        }
        /**
         * Signal busy state
         *
         * @param busy Is the component busy?
         */
        IframeContent.prototype.signalBusyState = function (busy) {
            this.sendMessage({
                id: this.iframeId,
                state: busy
                    ? exports.IframeMessageState.BeforeUpdate
                    : exports.IframeMessageState.Updated
            });
        };
        /**
         * Dispose the component
         */
        IframeContent.prototype.dispose = function () {
            if (this.disposed)
                return;
            this.disposed = true;
            this.signalBusyState(true);
            if (this.onMessageReceived) {
                this.getWindow().removeEventListener('message', this.onMessageReceived);
                this.onMessageReceived = null;
            }
            this.sendMessage({ id: '', state: exports.IframeMessageState.Destroyed });
            _super.prototype.dispose.call(this);
        };
        IframeContent.prototype.init = function () {
            // Bypass the queue and initiate the handshake.
            this.sendMessage({ id: this.iframeId, state: exports.IframeMessageState.Mounted }, true);
        };
        IframeContent.prototype.windowMessageHandler = function (event) {
            if (event.origin !== this.parentOrigin)
                return;
            var messageData = event.data
                ? event.data
                : null;
            if (!messageData) {
                return;
            }
            // In case we do not have the iframeId it means handshake did not happen.
            if (!this.iframeId) {
                this.handShake(messageData);
            }
        };
        IframeContent.prototype.handShake = function (messageData) {
            if (messageData.id) {
                // Phase 2 of the handshake - we got the id.
                this.iframeId = messageData.id;
                // Send it again to notify parent.
                this.sendMessage({ id: this.iframeId, state: exports.IframeMessageState.Mounted });
                // Send the previously queued messages.
                this.flushMessages();
            }
            else {
                // Phase 1 of the handshake - we got the hash so send it back.
                this.sendMessage({ id: this.iframeId, state: exports.IframeMessageState.Mounted, data: messageData.data }, true);
            }
        };
        IframeContent.prototype.sendMessage = function (message, bypassQueue) {
            if (bypassQueue === void 0) { bypassQueue = false; }
            if (this.standalone)
                return;
            if (this.iframeId && !message.id) {
                // Override the message id in case we have iframeId
                message.id = this.iframeId;
            }
            if (bypassQueue || message.id) {
                this.getWindow().parent.postMessage(message, this.parentOrigin);
            }
            else {
                this.messageQueue.push(message);
            }
        };
        IframeContent.prototype.flushMessages = function () {
            var win = this.getWindow();
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (var index = 0; index < this.messageQueue.length; index++) {
                var msg = this.messageQueue[index];
                msg.id = this.iframeId;
                win.parent.postMessage(msg, this.parentOrigin);
            }
        };
        return IframeContent;
    }(BaseComponent));

    exports.BaseComponent = BaseComponent;
    exports.IframeContent = IframeContent;
    exports.IframeHttpRequest = IframeHttpRequest;
    exports.IframeLoader = IframeLoader;
    exports.appendDataToForm = appendDataToForm;
    exports.generateUniqueId = generateUniqueId;
    exports.getHashCode = getHashCode;
    exports.getRandomString = getRandomString;
    exports.getUrlFullPath = getUrlFullPath;
    exports.getUrlOrigin = getUrlOrigin;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
