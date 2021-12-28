
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/AboutUs.svelte generated by Svelte v3.44.3 */

    const file$a = "src/components/AboutUs.svelte";

    function create_fragment$b(ctx) {
    	let section;
    	let div6;
    	let div5;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div4;
    	let div3;
    	let div2;
    	let h2;
    	let t2;
    	let p;
    	let t4;
    	let a;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div6 = element("div");
    			div5 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "About Us";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et nonumy\n            at elitr amet, eos duo invidunt et justo dolor rebum, no et labore\n            ipsum lorem, dolor sea elitr accusam rebum.Lorem et magna justo ut\n            invidunt est. Clita gubergren et et nonumy at elitr amet, eos duo\n            invidunt et justo dolor rebum, no et labore ipsum lorem, dolor sea\n            elitr accusam rebum.";
    			t4 = space();
    			a = element("a");
    			a.textContent = "Read More";
    			if (!src_url_equal(img.src, img_src_value = "https://tutorbees.net/assets/new_ui/resources2.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "About Us");
    			add_location(img, file$a, 8, 10, 187);
    			attr_dev(div0, "class", "img-box");
    			add_location(div0, file$a, 7, 8, 155);
    			attr_dev(div1, "class", "col-md-6 ");
    			add_location(div1, file$a, 6, 6, 123);
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$a, 17, 12, 445);
    			attr_dev(div2, "class", "heading_container");
    			add_location(div2, file$a, 16, 10, 401);
    			add_location(p, file$a, 19, 10, 512);
    			attr_dev(a, "href", "#ReadMore");
    			add_location(a, file$a, 27, 10, 968);
    			attr_dev(div3, "class", "detail-box");
    			add_location(div3, file$a, 15, 8, 366);
    			attr_dev(div4, "class", "col-md-6");
    			add_location(div4, file$a, 14, 6, 335);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$a, 5, 4, 99);
    			attr_dev(div6, "class", "container ");
    			add_location(div6, file$a, 4, 2, 69);
    			attr_dev(section, "class", "about_section about_section1");
    			add_location(section, file$a, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(div3, t2);
    			append_dev(div3, p);
    			append_dev(div3, t4);
    			append_dev(div3, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AboutUs', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AboutUs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class AboutUs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutUs",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* ../../../node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.44.3 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (251:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Cards.svelte generated by Svelte v3.44.3 */

    const file$9 = "src/components/Cards.svelte";

    function create_fragment$9(ctx) {
    	let section;
    	let div16;
    	let div0;
    	let h2;
    	let t1;
    	let div14;
    	let div13;
    	let div4;
    	let div3;
    	let div1;
    	let t2;
    	let div2;
    	let h50;
    	let t4;
    	let p0;
    	let t6;
    	let div8;
    	let div7;
    	let div5;
    	let t7;
    	let div6;
    	let h51;
    	let t9;
    	let p1;
    	let t11;
    	let div12;
    	let div11;
    	let div9;
    	let t12;
    	let div10;
    	let h52;
    	let t14;
    	let p2;
    	let t16;
    	let div15;
    	let a;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div16 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Our Services";
    			t1 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			t2 = space();
    			div2 = element("div");
    			h50 = element("h5");
    			h50.textContent = "App Development";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.";
    			t6 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			t7 = space();
    			div6 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Web Development";
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.";
    			t11 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div9 = element("div");
    			t12 = space();
    			div10 = element("div");
    			h52 = element("h5");
    			h52.textContent = "UX/UX Design";
    			t14 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.";
    			t16 = space();
    			div15 = element("div");
    			a = element("a");
    			a.textContent = "Read More";
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$9, 6, 6, 152);
    			attr_dev(div0, "class", "heading_container heading_center");
    			add_location(div0, file$9, 5, 4, 99);
    			attr_dev(div1, "class", "img-box");
    			add_location(div1, file$9, 12, 12, 341);
    			add_location(h50, file$9, 16, 14, 500);
    			add_location(p0, file$9, 17, 14, 539);
    			attr_dev(div2, "class", "detail-box");
    			add_location(div2, file$9, 15, 12, 461);
    			attr_dev(div3, "class", "box b1");
    			add_location(div3, file$9, 11, 10, 308);
    			attr_dev(div4, "class", "col-md-4");
    			add_location(div4, file$9, 10, 8, 275);
    			attr_dev(div5, "class", "img-box");
    			add_location(div5, file$9, 27, 12, 913);
    			add_location(h51, file$9, 31, 14, 1072);
    			add_location(p1, file$9, 32, 14, 1111);
    			attr_dev(div6, "class", "detail-box");
    			add_location(div6, file$9, 30, 12, 1033);
    			attr_dev(div7, "class", "box b2");
    			add_location(div7, file$9, 26, 10, 880);
    			attr_dev(div8, "class", "col-md-4");
    			add_location(div8, file$9, 25, 8, 847);
    			attr_dev(div9, "class", "img-box");
    			add_location(div9, file$9, 42, 12, 1485);
    			add_location(h52, file$9, 46, 14, 1644);
    			add_location(p2, file$9, 47, 14, 1680);
    			attr_dev(div10, "class", "detail-box");
    			add_location(div10, file$9, 45, 12, 1605);
    			attr_dev(div11, "class", "box b3");
    			add_location(div11, file$9, 41, 10, 1452);
    			attr_dev(div12, "class", "col-md-4");
    			add_location(div12, file$9, 40, 8, 1419);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$9, 9, 6, 249);
    			attr_dev(div14, "class", "service_container");
    			add_location(div14, file$9, 8, 4, 211);
    			attr_dev(a, "href", "#ReadMore");
    			add_location(a, file$9, 58, 6, 2036);
    			attr_dev(div15, "class", "btn-box");
    			add_location(div15, file$9, 57, 4, 2008);
    			attr_dev(div16, "class", "container");
    			add_location(div16, file$9, 4, 2, 71);
    			attr_dev(section, "class", "service_section layout_padding");
    			add_location(section, file$9, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div16);
    			append_dev(div16, div0);
    			append_dev(div0, h2);
    			append_dev(div16, t1);
    			append_dev(div16, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, h50);
    			append_dev(div2, t4);
    			append_dev(div2, p0);
    			append_dev(div13, t6);
    			append_dev(div13, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, h51);
    			append_dev(div6, t9);
    			append_dev(div6, p1);
    			append_dev(div13, t11);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t12);
    			append_dev(div11, div10);
    			append_dev(div10, h52);
    			append_dev(div10, t14);
    			append_dev(div10, p2);
    			append_dev(div16, t16);
    			append_dev(div16, div15);
    			append_dev(div15, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Cards', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Cards> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Cards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cards",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.44.3 */

    const file$8 = "src/components/Footer.svelte";

    function create_fragment$8(ctx) {
    	let footer;
    	let div;
    	let p;
    	let t0;
    	let span;
    	let t1;
    	let a;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div = element("div");
    			p = element("p");
    			t0 = text("© ");
    			span = element("span");
    			t1 = text(" All Rights Reserved By\n      ");
    			a = element("a");
    			a.textContent = "Abu Sufyan";
    			attr_dev(span, "id", "displayYear");
    			add_location(span, file$8, 6, 13, 99);
    			attr_dev(a, "href", "https://github.com/sufyan468");
    			attr_dev(a, "target", "blank");
    			add_location(a, file$8, 7, 6, 154);
    			add_location(p, file$8, 5, 4, 82);
    			attr_dev(div, "class", "container");
    			add_location(div, file$8, 4, 2, 54);
    			attr_dev(footer, "class", "footer_section");
    			add_location(footer, file$8, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(p, t1);
    			append_dev(p, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/HowItWorks.svelte generated by Svelte v3.44.3 */

    const file$7 = "src/components/HowItWorks.svelte";

    function create_fragment$7(ctx) {
    	let section;
    	let div7;
    	let div6;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let a;
    	let t5;
    	let div5;
    	let div4;
    	let img;
    	let img_src_value;
    	let t6;
    	let div3;
    	let button;
    	let i;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "How It Works";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et nonumy\n            at elitr amet, eos duo invidunt et justo dolor rebum, no et labore\n            ipsum lorem, dolor sea elitr accusam rebum.Lorem et magna justo ut\n            invidunt est. Clita gubergren et et nonumy at elitr amet, eos duo\n            invidunt et justo dolor rebum, no et labore ipsum lorem, dolor sea\n            elitr accusam rebum.";
    			t3 = space();
    			a = element("a");
    			a.textContent = "Read More";
    			t5 = space();
    			div5 = element("div");
    			div4 = element("div");
    			img = element("img");
    			t6 = space();
    			div3 = element("div");
    			button = element("button");
    			i = element("i");
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$7, 8, 12, 236);
    			attr_dev(div0, "class", "heading_container");
    			add_location(div0, file$7, 7, 10, 192);
    			add_location(p, file$7, 10, 10, 307);
    			attr_dev(a, "href", "#ReadMore");
    			attr_dev(a, "class", "pb-3");
    			add_location(a, file$7, 18, 10, 763);
    			attr_dev(div1, "class", "detail-box");
    			add_location(div1, file$7, 6, 8, 157);
    			attr_dev(div2, "class", "col-md-6");
    			add_location(div2, file$7, 5, 6, 126);
    			if (!src_url_equal(img.src, img_src_value = "https://blogger.googleusercontent.com/img/a/AVvXsEifYiUq7ZIMSGxqGFVSA2Bn3GXiuhCYLbH0Lndui7TFsK_NuP8BghjpqrxK9_tpRDsaE0TK4GdAyn0LiENHtujG0_OsQWQHrQdR13iG5nriG_CA_4xcc0EMM6lJWrc-Qnnn_du-4SQQOkRgNwcIiUVnz7lbZKRhRIYkA_HfZXWywvg8OMCPJkrkKP-T0w=s320")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "How it works");
    			add_location(img, file$7, 23, 10, 910);
    			attr_dev(i, "class", "fa fa-play");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$7, 29, 14, 1289);
    			add_location(button, file$7, 28, 12, 1266);
    			attr_dev(div3, "class", "play_btn");
    			add_location(div3, file$7, 27, 10, 1231);
    			attr_dev(div4, "class", "img-box");
    			add_location(div4, file$7, 22, 8, 878);
    			attr_dev(div5, "class", "col-md-6 ");
    			add_location(div5, file$7, 21, 6, 846);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$7, 4, 4, 102);
    			attr_dev(div7, "class", "container my-5");
    			add_location(div7, file$7, 3, 2, 68);
    			attr_dev(section, "class", "about_section about_section2");
    			add_location(section, file$7, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div1, t1);
    			append_dev(div1, p);
    			append_dev(div1, t3);
    			append_dev(div1, a);
    			append_dev(div6, t5);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, img);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, button);
    			append_dev(button, i);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('HowItWorks', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HowItWorks> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class HowItWorks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HowItWorks",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/Info.svelte generated by Svelte v3.44.3 */

    const file$6 = "src/components/Info.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let div11;
    	let div10;
    	let div2;
    	let div1;
    	let h40;
    	let t1;
    	let p0;
    	let t3;
    	let div0;
    	let a0;
    	let svg0;
    	let path0;
    	let t4;
    	let a1;
    	let svg1;
    	let path1;
    	let t5;
    	let a2;
    	let svg2;
    	let path2;
    	let t6;
    	let a3;
    	let svg3;
    	let path3;
    	let t7;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let t8;
    	let div9;
    	let div8;
    	let h41;
    	let t10;
    	let div7;
    	let p1;
    	let i0;
    	let t11;
    	let span0;
    	let t13;
    	let a4;
    	let i1;
    	let t14;
    	let span1;
    	let t16;
    	let a5;
    	let i2;
    	let t17;
    	let span2;
    	let t19;
    	let p2;
    	let i3;
    	let t20;
    	let span3;
    	let t22;
    	let p3;
    	let i4;
    	let t23;
    	let span4;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div11 = element("div");
    			div10 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h40 = element("h4");
    			h40.textContent = "About";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Necessary, making this the first true generator on the Internet. It\n            uses a dictionary of over 200 Latin words, combined with a handful";
    			t3 = space();
    			div0 = element("div");
    			a0 = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t4 = space();
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t5 = space();
    			a2 = element("a");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t6 = space();
    			a3 = element("a");
    			svg3 = svg_element("svg");
    			path3 = svg_element("path");
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			t8 = space();
    			div9 = element("div");
    			div8 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Contact Info";
    			t10 = space();
    			div7 = element("div");
    			p1 = element("p");
    			i0 = element("i");
    			t11 = space();
    			span0 = element("span");
    			span0.textContent = "Location";
    			t13 = space();
    			a4 = element("a");
    			i1 = element("i");
    			t14 = space();
    			span1 = element("span");
    			span1.textContent = "Call +01 1234567890";
    			t16 = space();
    			a5 = element("a");
    			i2 = element("i");
    			t17 = space();
    			span2 = element("span");
    			span2.textContent = "demo@gmail.com";
    			t19 = space();
    			p2 = element("p");
    			i3 = element("i");
    			t20 = space();
    			span3 = element("span");
    			span3.textContent = "Mon-Sat: 09.00 am - 06.00 pm";
    			t22 = space();
    			p3 = element("p");
    			i4 = element("i");
    			t23 = space();
    			span4 = element("span");
    			span4.textContent = "Sunday: closed";
    			add_location(h40, file$6, 7, 10, 205);
    			add_location(p0, file$6, 8, 10, 230);
    			attr_dev(path0, "d", "M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z");
    			add_location(path0, file$6, 22, 16, 745);
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "width", "16");
    			attr_dev(svg0, "height", "16");
    			attr_dev(svg0, "fill", "currentColor");
    			attr_dev(svg0, "class", "bi bi-facebook");
    			attr_dev(svg0, "viewBox", "0 0 16 16");
    			add_location(svg0, file$6, 14, 14, 491);
    			attr_dev(a0, "href", "#ReadMore");
    			add_location(a0, file$6, 13, 12, 456);
    			attr_dev(path1, "d", "M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z");
    			add_location(path1, file$6, 36, 16, 1419);
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "width", "16");
    			attr_dev(svg1, "height", "16");
    			attr_dev(svg1, "fill", "currentColor");
    			attr_dev(svg1, "class", "bi bi-youtube");
    			attr_dev(svg1, "viewBox", "0 0 16 16");
    			add_location(svg1, file$6, 28, 14, 1166);
    			attr_dev(a1, "href", "#ReadMore");
    			add_location(a1, file$6, 27, 12, 1131);
    			attr_dev(path2, "d", "M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z");
    			add_location(path2, file$6, 50, 16, 2582);
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "width", "16");
    			attr_dev(svg2, "height", "16");
    			attr_dev(svg2, "fill", "currentColor");
    			attr_dev(svg2, "class", "bi bi-twitter");
    			attr_dev(svg2, "viewBox", "0 0 16 16");
    			add_location(svg2, file$6, 42, 14, 2329);
    			attr_dev(a2, "href", "#ReadMore");
    			add_location(a2, file$6, 41, 12, 2294);
    			attr_dev(path3, "d", "M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z");
    			add_location(path3, file$6, 64, 16, 3463);
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "width", "16");
    			attr_dev(svg3, "height", "16");
    			attr_dev(svg3, "fill", "currentColor");
    			attr_dev(svg3, "class", "bi bi-instagram");
    			attr_dev(svg3, "viewBox", "0 0 16 16");
    			add_location(svg3, file$6, 56, 14, 3208);
    			attr_dev(a3, "href", "#ReadMore");
    			add_location(a3, file$6, 55, 12, 3173);
    			attr_dev(div0, "class", "info_social");
    			add_location(div0, file$6, 12, 10, 418);
    			attr_dev(div1, "class", "info_detail");
    			add_location(div1, file$6, 6, 8, 169);
    			attr_dev(div2, "class", "col-md-4 col-lg-3 info-col");
    			add_location(div2, file$6, 5, 6, 120);
    			attr_dev(div3, "id", "googleMap");
    			add_location(div3, file$6, 75, 12, 5221);
    			attr_dev(div4, "class", "map");
    			add_location(div4, file$6, 74, 10, 5191);
    			attr_dev(div5, "class", "map_container");
    			add_location(div5, file$6, 73, 8, 5153);
    			attr_dev(div6, "class", "col-md-4 col-lg-6 info-col");
    			add_location(div6, file$6, 72, 6, 5103);
    			add_location(h41, file$6, 81, 10, 5381);
    			attr_dev(i0, "class", "fa fa-map-marker");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file$6, 84, 14, 5474);
    			add_location(span0, file$6, 85, 14, 5538);
    			add_location(p1, file$6, 83, 12, 5456);
    			attr_dev(i1, "class", "fa fa-phone");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file$6, 88, 14, 5626);
    			add_location(span1, file$6, 89, 14, 5685);
    			attr_dev(a4, "href", "#ReadMore");
    			add_location(a4, file$6, 87, 12, 5591);
    			attr_dev(i2, "class", "fa fa-envelope");
    			attr_dev(i2, "aria-hidden", "true");
    			add_location(i2, file$6, 92, 14, 5784);
    			add_location(span2, file$6, 93, 14, 5846);
    			attr_dev(a5, "href", "#ReadMore");
    			add_location(a5, file$6, 91, 12, 5749);
    			attr_dev(i3, "class", "fa fa-clock-o");
    			attr_dev(i3, "aria-hidden", "true");
    			add_location(i3, file$6, 96, 14, 5923);
    			add_location(span3, file$6, 97, 14, 5984);
    			add_location(p2, file$6, 95, 12, 5905);
    			attr_dev(i4, "class", "fa fa-clock-o");
    			attr_dev(i4, "aria-hidden", "true");
    			add_location(i4, file$6, 100, 14, 6075);
    			add_location(span4, file$6, 101, 14, 6136);
    			add_location(p3, file$6, 99, 12, 6057);
    			attr_dev(div7, "class", "contact_link_box");
    			add_location(div7, file$6, 82, 10, 5413);
    			attr_dev(div8, "class", "info_contact");
    			add_location(div8, file$6, 80, 8, 5344);
    			attr_dev(div9, "class", "col-md-4 col-lg-3 info-col");
    			add_location(div9, file$6, 79, 6, 5295);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$6, 4, 4, 96);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$6, 3, 2, 68);
    			attr_dev(section, "class", "info_section layout_padding2");
    			add_location(section, file$6, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h40);
    			append_dev(div1, t1);
    			append_dev(div1, p0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div0, t4);
    			append_dev(div0, a1);
    			append_dev(a1, svg1);
    			append_dev(svg1, path1);
    			append_dev(div0, t5);
    			append_dev(div0, a2);
    			append_dev(a2, svg2);
    			append_dev(svg2, path2);
    			append_dev(div0, t6);
    			append_dev(div0, a3);
    			append_dev(a3, svg3);
    			append_dev(svg3, path3);
    			append_dev(div10, t7);
    			append_dev(div10, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div10, t8);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, h41);
    			append_dev(div8, t10);
    			append_dev(div8, div7);
    			append_dev(div7, p1);
    			append_dev(p1, i0);
    			append_dev(p1, t11);
    			append_dev(p1, span0);
    			append_dev(div7, t13);
    			append_dev(div7, a4);
    			append_dev(a4, i1);
    			append_dev(a4, t14);
    			append_dev(a4, span1);
    			append_dev(div7, t16);
    			append_dev(div7, a5);
    			append_dev(a5, i2);
    			append_dev(a5, t17);
    			append_dev(a5, span2);
    			append_dev(div7, t19);
    			append_dev(div7, p2);
    			append_dev(p2, i3);
    			append_dev(p2, t20);
    			append_dev(p2, span3);
    			append_dev(div7, t22);
    			append_dev(div7, p3);
    			append_dev(p3, i4);
    			append_dev(p3, t23);
    			append_dev(p3, span4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Info', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Info> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Info extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Info",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/OurClients.svelte generated by Svelte v3.44.3 */

    const file$5 = "src/components/OurClients.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let div14;
    	let div0;
    	let h2;
    	let t1;
    	let div13;
    	let div3;
    	let div2;
    	let div1;
    	let h50;
    	let t3;
    	let h60;
    	let t5;
    	let p0;
    	let t7;
    	let div6;
    	let div5;
    	let div4;
    	let h51;
    	let t9;
    	let h61;
    	let t11;
    	let p1;
    	let t13;
    	let div9;
    	let div8;
    	let div7;
    	let h52;
    	let t15;
    	let h62;
    	let t17;
    	let p2;
    	let t19;
    	let div12;
    	let div11;
    	let div10;
    	let h53;
    	let t21;
    	let h63;
    	let t23;
    	let p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div14 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "What Our Client Says";
    			t1 = space();
    			div13 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Alina Hill";
    			t3 = space();
    			h60 = element("h6");
    			h60.textContent = "Magna";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do\n              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut\n              enim ad minim Lorem ipsum dolor sit amet, consectetur adipiscing\n              elit";
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Fiona MacBeth";
    			t9 = space();
    			h61 = element("h6");
    			h61.textContent = "Magna";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do\n              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut\n              enim ad minim Lorem ipsum dolor sit amet, consectetur adipiscing\n              elit";
    			t13 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Alina Hill";
    			t15 = space();
    			h62 = element("h6");
    			h62.textContent = "Magna";
    			t17 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do\n              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut\n              enim ad minim Lorem ipsum dolor sit amet, consectetur adipiscing\n              elit";
    			t19 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			h53 = element("h5");
    			h53.textContent = "Fiona MacBeth";
    			t21 = space();
    			h63 = element("h6");
    			h63.textContent = "Magna";
    			t23 = space();
    			p3 = element("p");
    			p3.textContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do\n              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut\n              enim ad minim Lorem ipsum dolor sit amet, consectetur adipiscing\n              elit";
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$5, 5, 6, 145);
    			attr_dev(div0, "class", "heading_container pb-5");
    			add_location(div0, file$5, 4, 4, 102);
    			add_location(h50, file$5, 11, 12, 362);
    			add_location(h60, file$5, 12, 12, 394);
    			add_location(p0, file$5, 13, 12, 421);
    			attr_dev(div1, "class", "detail-box mb-3");
    			add_location(div1, file$5, 10, 10, 320);
    			attr_dev(div2, "class", "box ");
    			add_location(div2, file$5, 9, 8, 291);
    			attr_dev(div3, "class", "item col-sm-12 col-md-6 col-lg-3");
    			add_location(div3, file$5, 8, 6, 236);
    			add_location(h51, file$5, 25, 12, 872);
    			add_location(h61, file$5, 26, 12, 907);
    			add_location(p1, file$5, 27, 12, 934);
    			attr_dev(div4, "class", "detail-box mb-3");
    			add_location(div4, file$5, 24, 10, 830);
    			attr_dev(div5, "class", "box");
    			add_location(div5, file$5, 23, 8, 802);
    			attr_dev(div6, "class", "item col-sm-12 col-md-6 col-lg-3");
    			add_location(div6, file$5, 22, 6, 746);
    			add_location(h52, file$5, 39, 12, 1384);
    			add_location(h62, file$5, 40, 12, 1416);
    			add_location(p2, file$5, 41, 12, 1443);
    			attr_dev(div7, "class", "detail-box mb-3");
    			add_location(div7, file$5, 38, 10, 1342);
    			attr_dev(div8, "class", "box");
    			add_location(div8, file$5, 37, 8, 1314);
    			attr_dev(div9, "class", "item col-sm-12 col-md-6 col-lg-3");
    			add_location(div9, file$5, 36, 6, 1259);
    			add_location(h53, file$5, 53, 12, 1893);
    			add_location(h63, file$5, 54, 12, 1928);
    			add_location(p3, file$5, 55, 12, 1955);
    			attr_dev(div10, "class", "detail-box mb-3");
    			add_location(div10, file$5, 52, 10, 1851);
    			attr_dev(div11, "class", "box");
    			add_location(div11, file$5, 51, 8, 1823);
    			attr_dev(div12, "class", "item col-sm-12 col-md-6 col-lg-3");
    			add_location(div12, file$5, 50, 6, 1768);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$5, 7, 4, 212);
    			attr_dev(div14, "class", "container");
    			add_location(div14, file$5, 3, 2, 74);
    			attr_dev(section, "class", "client_section layout_padding my-4");
    			add_location(section, file$5, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div14);
    			append_dev(div14, div0);
    			append_dev(div0, h2);
    			append_dev(div14, t1);
    			append_dev(div14, div13);
    			append_dev(div13, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h50);
    			append_dev(div1, t3);
    			append_dev(div1, h60);
    			append_dev(div1, t5);
    			append_dev(div1, p0);
    			append_dev(div13, t7);
    			append_dev(div13, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h51);
    			append_dev(div4, t9);
    			append_dev(div4, h61);
    			append_dev(div4, t11);
    			append_dev(div4, p1);
    			append_dev(div13, t13);
    			append_dev(div13, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, h52);
    			append_dev(div7, t15);
    			append_dev(div7, h62);
    			append_dev(div7, t17);
    			append_dev(div7, p2);
    			append_dev(div13, t19);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, h53);
    			append_dev(div10, t21);
    			append_dev(div10, h63);
    			append_dev(div10, t23);
    			append_dev(div10, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('OurClients', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<OurClients> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class OurClients extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OurClients",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/WhyUs.svelte generated by Svelte v3.44.3 */

    const file$4 = "src/components/WhyUs.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let div12;
    	let div0;
    	let h2;
    	let t1;
    	let div11;
    	let div10;
    	let div3;
    	let div2;
    	let div1;
    	let h50;
    	let t3;
    	let p0;
    	let t5;
    	let div6;
    	let div5;
    	let div4;
    	let h51;
    	let t7;
    	let p1;
    	let t9;
    	let div9;
    	let div8;
    	let div7;
    	let h52;
    	let t11;
    	let p2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div12 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Why Choose Us";
    			t1 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Affordable Pricing";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.";
    			t5 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Convenience";
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.dolor sea\n                elitr accusam rebum.";
    			t9 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Quality Cleaning";
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem et magna justo ut invidunt est. Clita gubergren et et\n                nonumy at elitr amet, eos duo invidunt et justo dolor rebum, no\n                et labore ipsum lorem, dolor sea elitr accusam rebum.";
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$4, 5, 6, 147);
    			attr_dev(div0, "class", "heading_container heading_center");
    			add_location(div0, file$4, 4, 4, 94);
    			add_location(h50, file$4, 12, 14, 372);
    			add_location(p0, file$4, 13, 14, 414);
    			attr_dev(div1, "class", "detail-box");
    			add_location(div1, file$4, 11, 12, 333);
    			attr_dev(div2, "class", "box b1");
    			add_location(div2, file$4, 10, 10, 300);
    			attr_dev(div3, "class", "col-md-4");
    			add_location(div3, file$4, 9, 8, 267);
    			add_location(h51, file$4, 24, 14, 827);
    			add_location(p1, file$4, 25, 14, 862);
    			attr_dev(div4, "class", "detail-box");
    			add_location(div4, file$4, 23, 12, 788);
    			attr_dev(div5, "class", "box b2");
    			add_location(div5, file$4, 22, 10, 755);
    			attr_dev(div6, "class", "col-md-4");
    			add_location(div6, file$4, 21, 8, 722);
    			add_location(h52, file$4, 37, 14, 1321);
    			add_location(p2, file$4, 38, 14, 1361);
    			attr_dev(div7, "class", "detail-box");
    			add_location(div7, file$4, 36, 12, 1282);
    			attr_dev(div8, "class", "box b3");
    			add_location(div8, file$4, 35, 10, 1249);
    			attr_dev(div9, "class", "col-md-4");
    			add_location(div9, file$4, 34, 8, 1216);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$4, 8, 6, 241);
    			attr_dev(div11, "class", "why_container");
    			add_location(div11, file$4, 7, 4, 207);
    			attr_dev(div12, "class", "container");
    			add_location(div12, file$4, 3, 2, 66);
    			attr_dev(section, "class", "why_section layout_padding");
    			add_location(section, file$4, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div12);
    			append_dev(div12, div0);
    			append_dev(div0, h2);
    			append_dev(div12, t1);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h50);
    			append_dev(div1, t3);
    			append_dev(div1, p0);
    			append_dev(div10, t5);
    			append_dev(div10, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h51);
    			append_dev(div4, t7);
    			append_dev(div4, p1);
    			append_dev(div10, t9);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, h52);
    			append_dev(div7, t11);
    			append_dev(div7, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WhyUs', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WhyUs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class WhyUs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WhyUs",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Home.svelte generated by Svelte v3.44.3 */
    const file$3 = "src/components/Home.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let cards;
    	let t0;
    	let aboutus;
    	let t1;
    	let whyus;
    	let t2;
    	let howitworks;
    	let t3;
    	let ourclients;
    	let t4;
    	let info;
    	let current;
    	cards = new Cards({ $$inline: true });
    	aboutus = new AboutUs({ $$inline: true });
    	whyus = new WhyUs({ $$inline: true });
    	howitworks = new HowItWorks({ $$inline: true });
    	ourclients = new OurClients({ $$inline: true });
    	info = new Info({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(cards.$$.fragment);
    			t0 = space();
    			create_component(aboutus.$$.fragment);
    			t1 = space();
    			create_component(whyus.$$.fragment);
    			t2 = space();
    			create_component(howitworks.$$.fragment);
    			t3 = space();
    			create_component(ourclients.$$.fragment);
    			t4 = space();
    			create_component(info.$$.fragment);
    			add_location(div, file$3, 9, 0, 270);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(cards, div, null);
    			append_dev(div, t0);
    			mount_component(aboutus, div, null);
    			append_dev(div, t1);
    			mount_component(whyus, div, null);
    			append_dev(div, t2);
    			mount_component(howitworks, div, null);
    			append_dev(div, t3);
    			mount_component(ourclients, div, null);
    			append_dev(div, t4);
    			mount_component(info, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cards.$$.fragment, local);
    			transition_in(aboutus.$$.fragment, local);
    			transition_in(whyus.$$.fragment, local);
    			transition_in(howitworks.$$.fragment, local);
    			transition_in(ourclients.$$.fragment, local);
    			transition_in(info.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cards.$$.fragment, local);
    			transition_out(aboutus.$$.fragment, local);
    			transition_out(whyus.$$.fragment, local);
    			transition_out(howitworks.$$.fragment, local);
    			transition_out(ourclients.$$.fragment, local);
    			transition_out(info.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(cards);
    			destroy_component(aboutus);
    			destroy_component(whyus);
    			destroy_component(howitworks);
    			destroy_component(ourclients);
    			destroy_component(info);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		HowItWorks,
    		Info,
    		AboutUs,
    		Cards,
    		OurClients,
    		WhyUs
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.44.3 */

    const file$2 = "src/components/Header.svelte";

    function create_fragment$2(ctx) {
    	let div14;
    	let div0;
    	let t0;
    	let header;
    	let div2;
    	let nav;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let button0;
    	let span;
    	let t2;
    	let div1;
    	let ul;
    	let li0;
    	let a1;
    	let t4;
    	let li1;
    	let a2;
    	let t6;
    	let li2;
    	let a3;
    	let t8;
    	let li3;
    	let a4;
    	let t10;
    	let li4;
    	let button1;
    	let svg;
    	let path;
    	let t11;
    	let form;
    	let button2;
    	let i;
    	let t12;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let button3;
    	let t14;
    	let li5;
    	let a5;
    	let t16;
    	let li6;
    	let a6;
    	let t18;
    	let li7;
    	let a7;
    	let t20;
    	let li8;
    	let a8;
    	let t22;
    	let section;
    	let div13;
    	let div12;
    	let div9;
    	let div8;
    	let h1;
    	let t23;
    	let br;
    	let t24;
    	let t25;
    	let p;
    	let t27;
    	let div7;
    	let a9;
    	let t29;
    	let div11;
    	let div10;
    	let img1;
    	let img1_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div0 = element("div");
    			t0 = space();
    			header = element("header");
    			div2 = element("div");
    			nav = element("nav");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			button0 = element("button");
    			span = element("span");
    			t2 = space();
    			div1 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "Home";
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Services";
    			t6 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "About";
    			t8 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "Contact Us";
    			t10 = space();
    			li4 = element("li");
    			button1 = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t11 = space();
    			form = element("form");
    			button2 = element("button");
    			i = element("i");
    			t12 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "Close";
    			t14 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "Home";
    			t16 = space();
    			li6 = element("li");
    			a6 = element("a");
    			a6.textContent = "Services";
    			t18 = space();
    			li7 = element("li");
    			a7 = element("a");
    			a7.textContent = "About";
    			t20 = space();
    			li8 = element("li");
    			a8 = element("a");
    			a8.textContent = "Contact Us";
    			t22 = space();
    			section = element("section");
    			div13 = element("div");
    			div12 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			h1 = element("h1");
    			t23 = text("We Provide ");
    			br = element("br");
    			t24 = text("\n              Softare Services");
    			t25 = space();
    			p = element("p");
    			p.textContent = "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Eum\n              magnam, voluptates distinctio, officia architecto tenetur debitis\n              hic aspernatur libero commodi atque fugit adipisci, blanditiis\n              quidem dolorum odit voluptas? Voluptate, eveniet?";
    			t27 = space();
    			div7 = element("div");
    			a9 = element("a");
    			a9.textContent = "Read More";
    			t29 = space();
    			div11 = element("div");
    			div10 = element("div");
    			img1 = element("img");
    			attr_dev(div0, "class", "hero_bg_box svelte-1ydffmd");
    			add_location(div0, file$2, 16, 2, 286);
    			if (!src_url_equal(img0.src, img0_src_value = "https://blogger.googleusercontent.com/img/a/AVvXsEi-JWOvGCAdYsg0KcLYS5CNEfcD79S9vZVWRVDnEvdxU9Tr92Ki5Br-y6vQbpfxGahewNkPTS47EXlPkv7inyfTMXStSrrU_on-rnsCd-hAUr3XdyopommFUvaTpYFj33qtA2WsOyb8u9cflCBAoOHBSYfIIXVZeeQwmmAMAeQ1FmKMopvQemaJfNiEXA=s1200")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "User");
    			attr_dev(img0, "class", "LogoImage");
    			add_location(img0, file$2, 22, 10, 507);
    			attr_dev(a0, "class", "navbar-brand text-white");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$2, 21, 8, 451);
    			attr_dev(span, "class", "");
    			add_location(span, file$2, 30, 10, 938);
    			attr_dev(button0, "class", "navbar-toggler");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$2, 29, 8, 863);
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "href", "/");
    			add_location(a1, file$2, 39, 14, 1185);
    			attr_dev(li0, "class", "nav-item active");
    			add_location(li0, file$2, 38, 12, 1142);
    			attr_dev(a2, "class", "nav-link");
    			attr_dev(a2, "href", "/#/services");
    			add_location(a2, file$2, 43, 14, 1291);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$2, 42, 12, 1255);
    			attr_dev(a3, "class", "nav-link");
    			attr_dev(a3, "href", "/#/about");
    			add_location(a3, file$2, 46, 14, 1409);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$2, 45, 12, 1373);
    			attr_dev(a4, "class", "nav-link");
    			attr_dev(a4, "href", "/#/contactUs");
    			add_location(a4, file$2, 49, 14, 1522);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$2, 48, 12, 1486);
    			attr_dev(path, "d", "M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z");
    			add_location(path, file$2, 63, 18, 2047);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "16");
    			attr_dev(svg, "height", "16");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "class", "bi bi-brightness-high-fill");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			add_location(svg, file$2, 55, 17, 1765);
    			attr_dev(button1, "class", "nav-link bg-primary border-0 mb-2 mt-0");
    			add_location(button1, file$2, 52, 14, 1643);
    			attr_dev(li4, "class", "nav-item");
    			add_location(li4, file$2, 51, 12, 1607);
    			attr_dev(i, "class", "fa fa-search");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$2, 71, 16, 2938);
    			attr_dev(button2, "class", "btn my-2 my-sm-0 nav_search-btn ");
    			attr_dev(button2, "type", "submit");
    			add_location(button2, file$2, 70, 14, 2857);
    			attr_dev(form, "class", "form-inline");
    			add_location(form, file$2, 69, 12, 2816);
    			attr_dev(ul, "class", "navbar-nav ");
    			add_location(ul, file$2, 37, 10, 1104);
    			attr_dev(div1, "class", "collapse navbar-collapse HeaderPosition svelte-1ydffmd");
    			attr_dev(div1, "id", "navbarSupportedContent");
    			add_location(div1, file$2, 33, 8, 983);
    			attr_dev(nav, "class", "navbar navbar-expand-lg custom_nav-container ");
    			add_location(nav, file$2, 20, 6, 383);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 19, 4, 353);
    			attr_dev(header, "class", "header_section");
    			add_location(header, file$2, 18, 2, 317);
    			attr_dev(button3, "class", "closeNavbar float-end svelte-1ydffmd");
    			add_location(button3, file$2, 84, 10, 3290);
    			attr_dev(div3, "class", "flex-fill justify-content-end");
    			add_location(div3, file$2, 83, 8, 3236);
    			attr_dev(div4, "class", "w-100 d-flex");
    			add_location(div4, file$2, 82, 6, 3201);
    			attr_dev(a5, "class", "nav-link");
    			attr_dev(a5, "href", "/#/Home");
    			add_location(a5, file$2, 90, 8, 3476);
    			attr_dev(li5, "class", "nav-item active offcanvas-body-li svelte-1ydffmd");
    			add_location(li5, file$2, 89, 6, 3421);
    			attr_dev(a6, "class", "nav-link");
    			attr_dev(a6, "href", "/#/services");
    			add_location(a6, file$2, 94, 8, 3588);
    			attr_dev(li6, "class", "nav-item offcanvas-body-li svelte-1ydffmd");
    			add_location(li6, file$2, 93, 6, 3540);
    			attr_dev(a7, "class", "nav-link");
    			attr_dev(a7, "href", "/#/about");
    			add_location(a7, file$2, 97, 8, 3706);
    			attr_dev(li7, "class", "nav-item offcanvas-body-li svelte-1ydffmd");
    			add_location(li7, file$2, 96, 6, 3658);
    			attr_dev(a8, "class", "nav-link");
    			attr_dev(a8, "href", "/#/contactUs");
    			add_location(a8, file$2, 100, 8, 3819);
    			attr_dev(li8, "class", "nav-item offcanvas-body-li svelte-1ydffmd");
    			add_location(li8, file$2, 99, 6, 3771);
    			attr_dev(div5, "class", "offcanvas-body svelte-1ydffmd");
    			add_location(div5, file$2, 81, 4, 3166);
    			attr_dev(div6, "class", "sidenav svelte-1ydffmd");
    			attr_dev(div6, "id", "mySidenav");
    			set_style(div6, "width", /*navWidth*/ ctx[0] + "%");
    			add_location(div6, file$2, 80, 2, 3098);
    			add_location(br, file$2, 110, 25, 4104);
    			add_location(h1, file$2, 109, 12, 4074);
    			attr_dev(p, "class", "text-white");
    			add_location(p, file$2, 113, 12, 4172);
    			attr_dev(a9, "href", "#ReaMore");
    			attr_dev(a9, "class", "btn1");
    			add_location(a9, file$2, 120, 14, 4557);
    			attr_dev(div7, "class", "btn-box");
    			add_location(div7, file$2, 119, 12, 4521);
    			attr_dev(div8, "class", "detail-box");
    			add_location(div8, file$2, 108, 10, 4037);
    			attr_dev(div9, "class", "col-md-6 ");
    			add_location(div9, file$2, 107, 8, 4003);
    			if (!src_url_equal(img1.src, img1_src_value = "https://tutorbees.net/assets/new_ui/sub-1.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "title", "New image");
    			attr_dev(img1, "alt", "Sub 1");
    			attr_dev(img1, "class", "Slider-Image svelte-1ydffmd");
    			add_location(img1, file$2, 126, 12, 4738);
    			attr_dev(div10, "class", "img-box-Header");
    			add_location(div10, file$2, 125, 10, 4697);
    			attr_dev(div11, "class", "col-md-6");
    			add_location(div11, file$2, 124, 8, 4664);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$2, 106, 6, 3977);
    			attr_dev(div13, "class", "container ");
    			add_location(div13, file$2, 105, 4, 3946);
    			attr_dev(section, "class", "slider_section ");
    			add_location(section, file$2, 104, 2, 3908);
    			attr_dev(div14, "class", "hero_area");
    			add_location(div14, file$2, 15, 0, 260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div0);
    			append_dev(div14, t0);
    			append_dev(div14, header);
    			append_dev(header, div2);
    			append_dev(div2, nav);
    			append_dev(nav, a0);
    			append_dev(a0, img0);
    			append_dev(nav, t1);
    			append_dev(nav, button0);
    			append_dev(button0, span);
    			append_dev(nav, t2);
    			append_dev(nav, div1);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			append_dev(ul, t10);
    			append_dev(ul, li4);
    			append_dev(li4, button1);
    			append_dev(button1, svg);
    			append_dev(svg, path);
    			append_dev(ul, t11);
    			append_dev(ul, form);
    			append_dev(form, button2);
    			append_dev(button2, i);
    			append_dev(div14, t12);
    			append_dev(div14, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, button3);
    			append_dev(div5, t14);
    			append_dev(div5, li5);
    			append_dev(li5, a5);
    			append_dev(div5, t16);
    			append_dev(div5, li6);
    			append_dev(li6, a6);
    			append_dev(div5, t18);
    			append_dev(div5, li7);
    			append_dev(li7, a7);
    			append_dev(div5, t20);
    			append_dev(div5, li8);
    			append_dev(li8, a8);
    			append_dev(div14, t22);
    			append_dev(div14, section);
    			append_dev(section, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div9);
    			append_dev(div9, div8);
    			append_dev(div8, h1);
    			append_dev(h1, t23);
    			append_dev(h1, br);
    			append_dev(h1, t24);
    			append_dev(div8, t25);
    			append_dev(div8, p);
    			append_dev(div8, t27);
    			append_dev(div8, div7);
    			append_dev(div7, a9);
    			append_dev(div12, t29);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, img1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*openNav*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", toggle, false, false, false),
    					listen_dev(button3, "click", /*closeNav*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*navWidth*/ 1) {
    				set_style(div6, "width", /*navWidth*/ ctx[0] + "%");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toggle() {
    	window.document.body.classList.toggle("dark-mode");
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	let navWidth = 0;

    	const openNav = () => {
    		//   Increase Width as you want
    		$$invalidate(0, navWidth = 100);
    	};

    	const closeNav = () => {
    		$$invalidate(0, navWidth = 0);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ toggle, navWidth, openNav, closeNav });

    	$$self.$inject_state = $$props => {
    		if ('navWidth' in $$props) $$invalidate(0, navWidth = $$props.navWidth);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [navWidth, openNav, closeNav];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/ContactUS.svelte generated by Svelte v3.44.3 */

    const file$1 = "src/components/ContactUS.svelte";

    function create_fragment$1(ctx) {
    	let div7;
    	let div6;
    	let div5;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let p;
    	let t3;
    	let div4;
    	let form;
    	let div2;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let div3;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let button;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Contact Us";
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Et voluptua diam sed diam no sit dolore rebum accusam. Sadipscing\n            sed invidunt diam dolore eos sed invidunt et sit, diam eirmod\n            sadipscing stet takimata vero kasd duo vero. Ea justo erat ea et et\n            et justo amet elitr. Gubergren sea lorem at et justo dolor sed vero\n            magna, vero diam vero gubergren et rebum eirmod et sea est.\n            Invidunt.";
    			t3 = space();
    			div4 = element("div");
    			form = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Email address";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Password";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(h2, "class", "fw-bold section-title");
    			add_location(h2, file$1, 6, 8, 163);
    			add_location(p, file$1, 8, 10, 270);
    			attr_dev(div0, "id", "emailHelp");
    			attr_dev(div0, "class", "form-text");
    			add_location(div0, file$1, 7, 8, 221);
    			attr_dev(div1, "class", "col-lg-5 col-sm-12 p-3");
    			add_location(div1, file$1, 5, 6, 118);
    			attr_dev(label0, "for", "exampleInputEmail1");
    			attr_dev(label0, "class", "form-label");
    			add_location(label0, file$1, 21, 12, 822);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "class", "form-control svelte-o3da8n");
    			attr_dev(input0, "id", "exampleInputEmail1");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			add_location(input0, file$1, 24, 12, 935);
    			attr_dev(div2, "class", "mb-3");
    			add_location(div2, file$1, 20, 10, 791);
    			attr_dev(label1, "for", "exampleInputPassword1");
    			attr_dev(label1, "class", "form-label");
    			add_location(label1, file$1, 32, 12, 1158);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "form-control svelte-o3da8n");
    			attr_dev(input1, "id", "exampleInputPassword1");
    			add_location(input1, file$1, 35, 12, 1269);
    			attr_dev(div3, "class", "mb-3");
    			add_location(div3, file$1, 31, 10, 1127);
    			attr_dev(button, "class", "btn-Submit svelte-o3da8n");
    			add_location(button, file$1, 42, 10, 1425);
    			add_location(form, file$1, 19, 8, 774);
    			attr_dev(div4, "class", "col-lg-7 col-sm-12 p-5");
    			add_location(div4, file$1, 18, 6, 729);
    			attr_dev(div5, "class", "row align-items-center");
    			add_location(div5, file$1, 4, 4, 75);
    			attr_dev(div6, "class", "container py-5");
    			add_location(div6, file$1, 3, 2, 42);
    			attr_dev(div7, "class", "w-100 ");
    			add_location(div7, file$1, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, form);
    			append_dev(form, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t5);
    			append_dev(div2, input0);
    			append_dev(form, t6);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t8);
    			append_dev(div3, input1);
    			append_dev(form, t9);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ContactUS', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ContactUS> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ContactUS extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactUS",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.3 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t0;
    	let router;
    	let t1;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });

    	router = new Router({
    			props: {
    				routes: {
    					"/": Home,
    					"/about": AboutUs,
    					"/services": Cards,
    					"/ContactUS": ContactUS
    				}
    			},
    			$$inline: true
    		});

    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			add_location(main, file, 10, 0, 370);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			mount_component(router, main, null);
    			append_dev(main, t1);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(router);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		AboutUs,
    		Router,
    		Cards,
    		Footer,
    		Home,
    		Header,
    		ContactUs: ContactUS
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
