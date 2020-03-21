(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.validide_jbu = {}));
}(this, (function (exports) { 'use strict';

    class BaseComponent {
        constructor(window) {
            if (!window)
                throw new Error('Missing "window" reference.');
            this.window = window;
        }
        getWindow() { return this.window; }
        getDocument() { return this.getWindow().document; }
        dispose() {
            this.window = null;
        }
    }

    /**
     * Return the origin of an url
     * @param document The reference to the document object
     * @param url The ´url´ for which to get the 'origin'
     * @returns A string representing the url origin
     */
    function getUrlOrigin(document, url) {
        if (!url)
            return '';
        const a = document.createElement('a');
        a.setAttribute('href', url);
        return a.protocol + "//" + a.hostname + (a.port && ":" + a.port);
    }

    /**
     * Return the full path of an url (the origin and path name)
     * @param document The reference to the document object
     * @param url The ´url´ for which to get the full path
     * @returns A string representing the url full path
     */
    function getUrlFullPath(document, url) {
        if (!url)
            return '';
        const a = document.createElement('a');
        a.setAttribute('href', url);
        return a.protocol + "//" + a.hostname + (a.port && ":" + a.port) + a.pathname;
    }

    /**
     * Get a hash code for the given string
     * @returns The has code
     */
    function getHashCode(value) {
        let hash = 0;
        let length = value.length;
        let char;
        let index = 0;
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
     * @returns A random generated string
     */
    function getRandomString() { return Math.random().toString(36).substring(2); }

    /**
     * Generate a random id that is not present in the document at this time
     * @param document The reference to the document object
     * @returns A random generated string
     */
    function generateUniqueId(document, prefix = '') {
        const prefixString = (prefix !== null && prefix !== void 0 ? prefix : '');
        while (true) {
            // The 'A-' will ensure this is always a valid JavaScript ID
            const id = prefixString + 'A-' + getRandomString() + getRandomString();
            if (document.getElementById(id) === null) {
                return id;
            }
        }
    }

    function appendInput(ownerDocument, form, name, value) {
        const input = ownerDocument.createElement('input');
        input.name = name;
        input.value = value;
        input.type = 'hidden';
        form.appendChild(input);
    }
    function appendData(ownerDocument, form, data, parentProp) {
        if (typeof data === 'object' && data != null) {
            if (data instanceof Date) {
                appendInput(ownerDocument, form, parentProp, data.toISOString());
            }
            else {
                Object.keys(data).forEach(prop => {
                    appendData(ownerDocument, form, data[prop], parentProp ? `${parentProp}[${prop}]` : prop);
                });
            }
        }
        else {
            appendInput(ownerDocument, form, parentProp, data === null || data === undefined ? '' : data.toString());
        }
    }
    /**
     * Append an object to a form as 'input'(HTMLInputElement) elements
     * @param data The information to append to the the ´form´
     * @param form The form (HTMLFormElement) element to elements to
     * @throws {Error} if the ´form´ does not have an 'ownerDocument'
     */
    function appendDataToForm(data, form) {
        if (!data)
            return;
        if (!form.ownerDocument)
            throw new Error('The "ownerDocument" of the "form" shold be the a reference to the parent window!');
        appendData(form.ownerDocument, form, data, '');
    }

    /**
     * Make a HTTP request using an iframe
     */
    class IframeHttpRequest extends BaseComponent {
        /**
         * Object constructor
         * @param window A reference to the window object
         * @param url The url to make the request to
         * @param data The data to send. Default NULL
         * @param method The HTTP method. GET(default) or POST
         * @param options The request options IframeHttpRequestOptions. Default null and will use the IframeHttpRequest.DEFAULT_OPTIONS
         */
        constructor(window, url, data = null, method = 'GET', options = null) {
            super(window);
            this.data = null;
            this.method = 'GET';
            this.validateInput(url, method);
            this.url = url; // might consider defaulting to 'about:blank' as empty url is not allowed for src on iFrames and this is where this will end-up
            this.data = data;
            this.method = method;
            this.options = Object.assign({}, IframeHttpRequest.DEFAULT_OPTIONS, options);
            this.resolvePromise = null;
            this.rejectPromise = null;
            this.loadHandlerRef = (e) => this.loadHandler(e);
            this.wrapperId = generateUniqueId(this.getDocument(), 'IframeHttpRequest_wrapper_');
            this.timeoutRef = 0;
            this.redirectTimeoutRef = 0;
            this.called = false;
            this.disposed = false;
        }
        sendAsync() {
            if (this.called)
                throw new Error('The "send" method was already called!');
            this.called = true;
            this.init();
            return this.sendAsyncCore();
        }
        dispose() {
            if (this.disposed)
                return;
            this.disposed = true;
            const win = this.getWindow();
            win.clearTimeout(this.timeoutRef);
            this.timeoutRef = 0;
            win.clearTimeout(this.redirectTimeoutRef);
            this.redirectTimeoutRef = 0;
            const wrapper = this.getDocument().getElementById(this.wrapperId);
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
            super.dispose();
        }
        validateInput(url, method) {
            if (!url)
                throw new Error('Missing "url" reference.');
            switch (method.toUpperCase()) {
                case 'GET':
                case 'POST':
                    break;
                default:
                    throw new Error(`Method not supported "${method}"`);
            }
        }
        init() {
            const iframeId = this.wrapperId + '_iframe';
            const fragment = this.getDocument().createDocumentFragment();
            const wrapper = this.getDocument().createElement('div');
            wrapper.id = this.wrapperId;
            wrapper.style.display = 'none';
            wrapper.innerHTML = `<form target="${iframeId}"></form><iframe id="${iframeId}" name="${iframeId}" width="0" height="0" src="about:blank"></iframe>`;
            const form = wrapper.querySelector('form');
            form.action = this.url;
            form.method = this.method;
            form.target = iframeId;
            if (this.data !== null) {
                appendDataToForm(this.data, form);
            }
            fragment.appendChild(wrapper);
            this.getDocument().body.appendChild(fragment);
            const iframe = wrapper.querySelector('iframe');
            iframe.addEventListener('load', this.loadHandlerRef, false);
        }
        sendAsyncCore() {
            return new Promise((resolve, reject) => {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;
                const wrapper = this.getDocument().getElementById(this.wrapperId);
                try {
                    wrapper.querySelector('form').submit();
                    this.timeoutRef = this.getWindow().setTimeout(() => {
                        this.reject(new Error('TIMEOUT'));
                    }, this.options.timeout);
                }
                catch (error) {
                    this.reject(error);
                }
            });
        }
        loadHandler(event) {
            this.getWindow().clearTimeout(this.redirectTimeoutRef);
            const allowRedirects = this.options.redirectTimeout > 0;
            try {
                const contentWindow = event.target.contentWindow;
                // this should throw if iframe is not accessible due to 'X-Frame-Options'
                const targetPath = getUrlFullPath(contentWindow.document, contentWindow.location.href).toLowerCase();
                const desiredPath = getUrlFullPath(contentWindow.document, this.url).toLowerCase();
                const result = {
                    data: contentWindow.document.body.textContent,
                    error: null
                };
                if ((targetPath === desiredPath)) {
                    this.resolve(result);
                }
                else {
                    if (allowRedirects) {
                        this.schedulePromieResolve(result);
                    }
                    else {
                        this.resolve(result);
                    }
                }
            }
            catch (error) {
                if (allowRedirects) {
                    this.schedulePromieResolve({
                        data: '',
                        error: error
                    });
                }
                else {
                    this.reject(error);
                }
            }
        }
        schedulePromieResolve(result) {
            const win = this.getWindow();
            win.clearTimeout(this.redirectTimeoutRef);
            this.redirectTimeoutRef = win.setTimeout(() => { this.resolve(result); }, this.options.redirectTimeout);
        }
        resolve(value) {
            this.resolvePromise(value);
            this.dispose();
        }
        reject(error) {
            this.rejectPromise({ data: '', error: error });
            this.dispose();
        }
    }
    /**
     * Default options IframeHttpRequestOptions
     */
    IframeHttpRequest.DEFAULT_OPTIONS = {
        timeout: 30 * 1000,
        redirectTimeout: 3 * 1000
    };

    (function (IframeLoaderEventType) {
        IframeLoaderEventType["BeforeCreate"] = "beforeCreate";
        IframeLoaderEventType["Created"] = "created";
        IframeLoaderEventType["BeforeUpdate"] = "beforeUpdate";
        IframeLoaderEventType["Updated"] = "updated";
        IframeLoaderEventType["BeforeDestroy"] = "beforeDestroy";
        IframeLoaderEventType["Destroyed"] = "destroyed";
    })(exports.IframeLoaderEventType || (exports.IframeLoaderEventType = {}));
    /**
     * Iframe loader
     * Load remote content inside an IFRAME.
     */
    class IframeLoader extends BaseComponent {
        /**
         * Constructor.
         * @param window Reference to the window object.
         * @param options Loader options.
         */
        constructor(window, options) {
            super(window);
            if (!(options === null || options === void 0 ? void 0 : options.url))
                throw new Error('The "options.url" value should be a non-empty string.');
            this.options = options;
            this.rootElement = null;
            this.iframeId = '';
            this.disposed = false;
            this.onMessageRecieved = this.windowMessageHandler.bind(this);
            window.addEventListener('message', this.onMessageRecieved);
            this.init();
        }
        /**
         * Dispose the loader
         */
        dispose() {
            if (this.disposed)
                return;
            this.disposed = true;
            this.triggerEvent(exports.IframeLoaderEventType.BeforeDestroy);
            this.rootElement.parentElement.removeChild(this.rootElement);
            this.rootElement = null;
            this.getWindow().removeEventListener('message', this.onMessageRecieved);
            this.onMessageRecieved = null;
            this.triggerEvent(exports.IframeLoaderEventType.Destroyed);
            this.options = null;
            super.dispose();
        }
        init() {
            this.triggerEvent(exports.IframeLoaderEventType.BeforeCreate);
            this.createRootElement();
            this.cerateIframe();
            this.triggerEvent(exports.IframeLoaderEventType.Created);
        }
        cerateIframe() {
            if (this.getIframe())
                return;
            const iframe = this.getDocument().createElement('iframe');
            const opt = this.getOptions();
            if (opt.iframeAttributes) {
                const keys = Object.keys(opt.iframeAttributes);
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index];
                    iframe.setAttribute(key, opt.iframeAttributes[key]);
                }
            }
            iframe.setAttribute('src', opt.url);
            this.iframeId = generateUniqueId(this.getDocument(), 'ildr-');
            this.rootElement.appendChild(iframe);
        }
        createRootElement() {
            if (this.rootElement)
                return;
            const parent = this.getParentElement();
            this.rootElement = this.getDocument().createElement('div');
            parent.appendChild(this.rootElement);
        }
        getParentElement() {
            let parent = null;
            const opt = this.getOptions();
            if (opt.parent) {
                if (typeof opt.parent === 'string') {
                    parent = this.getDocument().querySelector(opt.parent);
                }
                else {
                    parent = opt.parent;
                }
            }
            if (!parent)
                throw new Error(`Failed to find parent "${opt.parent}".`);
            return parent;
        }
        triggerEvent(eventType) {
            const opt = this.getOptions();
            const handler = opt.events
                ? opt.events[eventType]
                : undefined;
            if (handler) {
                handler({
                    type: eventType,
                    el: this.rootElement,
                    rootEl: this.rootElement,
                    id: this.iframeId
                });
            }
        }
        getIframe() {
            return this.rootElement.querySelector('iframe');
        }
        windowMessageHandler(event) {
            if (event.origin !== this.getIframeOrigin())
                return;
            const messageData = event.data
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
            if (messageData.destroyed) {
                this.dispose();
            }
            else {
                this.triggerEvent(messageData.busy ? exports.IframeLoaderEventType.BeforeUpdate : exports.IframeLoaderEventType.Updated);
            }
        }
        getIframeOrigin() {
            return getUrlOrigin(this.getDocument(), this.getOptions().url);
        }
        getOptions() {
            return this.options;
        }
        shouldShakeHands(message) {
            // Handshake did not take place
            if (!message.id)
                return true;
            return false;
        }
        shakeHands(requestMessage) {
            const hash = getHashCode(this.iframeId).toString(10);
            const responseMessage = {
                id: ''
            };
            // We got a message back so if the data matches the hash we sent send the id
            if (requestMessage.data && requestMessage.data === hash) {
                responseMessage.id = this.iframeId;
            }
            else {
                responseMessage.data = hash;
            }
            this.getIframe().contentWindow.postMessage(responseMessage, this.getIframeOrigin());
        }
    }
    /**
     * Content loaded by IframeLoader
     */
    class IframeContent extends BaseComponent {
        /**
         * Constructor
         * @param window Reference to the window object
         * @param parentOrigin The origin that loaded the content
         */
        constructor(window, parentOrigin) {
            super(window);
            if (typeof parentOrigin !== 'string' || parentOrigin.length === 0)
                throw new Error(`Parent origin("parentOrigin") should be a non-empty string.`);
            this.standalone = window === window.parent;
            this.parentOrigin = parentOrigin;
            this.iframeId = '';
            this.messageQueue = new Array();
            this.disposed = false;
            if (this.standalone) {
                this.onMessageRecieved = null;
            }
            else {
                this.onMessageRecieved = this.windowMessageHandler.bind(this);
                window.addEventListener('message', this.onMessageRecieved);
            }
            this.init();
        }
        /**
         * Signal busy state
         * @param busy Is the component busy?
         */
        signalBusyState(busy) {
            this.sendMessage({ id: this.iframeId, busy: busy });
        }
        /**
         * Dispose the component
         */
        dispose() {
            if (this.disposed)
                return;
            this.disposed = true;
            this.signalBusyState(true);
            if (this.onMessageRecieved) {
                this.getWindow().removeEventListener('message', this.onMessageRecieved);
                this.onMessageRecieved = null;
            }
            this.sendMessage({ id: '', destroyed: true });
            super.dispose();
        }
        init() {
            // Bypass the queue and initiate the handshake.
            this.sendMessage({ id: this.iframeId }, true);
            this.signalBusyState(true);
        }
        windowMessageHandler(event) {
            if (event.origin !== this.parentOrigin)
                return;
            const messageData = event.data
                ? event.data
                : null;
            if (!messageData) {
                return;
            }
            // In case we do not have the iframeId it means handshake did not happen.
            if (!this.iframeId) {
                this.handShake(messageData);
            }
        }
        handShake(messageData) {
            if (!messageData.id) {
                // Phase 1 of the handshake - we got the hash so send it back.
                this.sendMessage({ id: this.iframeId, busy: true, data: messageData.data }, true);
            }
            else {
                // Phase 2 of the handshake - we got the id.
                this.iframeId = messageData.id;
                // Send the previously queued messages.
                this.flushMessages();
            }
        }
        sendMessage(message, bypassQueue = false) {
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
        }
        flushMessages() {
            const win = this.getWindow();
            for (let index = 0; index < this.messageQueue.length; index++) {
                const msg = this.messageQueue[index];
                msg.id = this.iframeId;
                win.parent.postMessage(msg, this.parentOrigin);
            }
        }
    }

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
