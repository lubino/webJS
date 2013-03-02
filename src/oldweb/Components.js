define([], function () {
    var version = 0.8;

    //TODO modularize this !!!!
    return {
        author:"Lubos Strapko",
        version:version,
        document:document,
        window:window,
        componentFactories:{},
        waitingComponentFactories:{},
        waitingModuleResources:[],
        //page tracker (e.g. google analytics)
        pageTracker:null,
        hashStr:"",
        locale:null,
        checkUrl:function () {
            if (this.hashStr != document.location.hash) {
                this.hashStr = document.location.hash;
                this.openPage(this.hashStr);
            }
        },
        startPage:function (url) {
            if (this.document.location.hash == "") this.document.location.hash = url;
            if (!this.hashTimer) {
                var instance = this;
                this.hashTimer = setInterval(function () {
                    instance.checkUrl();
                }, 200);
            }
        },
        /**
         * Returns Factory object for any component
         * @param componentName name of component
         */
        getComponentFactory:function (componentName) {
            return this.componentFactories[componentName];
        },
        loadComponentFactory:function (componentName, callBack) {
            var factory = this.getComponentFactory(componentName);
            if (factory) {
                if (callBack) callBack(factory);
            } else {
                var utils = this;
                this.initializeComponents({
                    components:[
                        {
                            componentName:componentName,
                            initialized:false
                        }
                    ],
                    insteadCreate:function () {
                        if (callBack) callBack(utils.getComponentFactory(componentName));
                    }});
            }

        },
        /**
         * Sets Factory object for any component
         * @param factory factory
         */
        registerComponentFactory:function (factory) {
            if (typeof factory == "function" && !factory.componentName) factory = factory(this);
            var name = factory.componentName;
            this.componentFactories[name] = factory;
            var arr = this.waitingComponentFactories[name];
            if (arr) {
                this.waitingComponentFactories[name] = undefined;
                var i, j = arr.length;
                for (i = 0; i < j; i++) this.initializeComponents(arr[i]);
            }
        },
        /**
         * Puts js into document
         * @param doc document
         * @param url url to js file
         */
        addJSToDocument:function (doc, url, loader) {
            var headLoc = doc.getElementsByTagName("head").item(0);
            var scriptObj = doc.createElement("script");
            scriptObj.setAttribute("type", "text/javascript");
            scriptObj.setAttribute("src", url);
            if (loader) scriptObj.onload = loader;
            headLoc.appendChild(scriptObj);
        },
        /**
         * Remove js from document
         * @param doc document
         * @param url url to js file
         */
        removeJSFromDocument:function (doc, url) {
            var headLoc = doc.getElementsByTagName("head").item(0);
            var i = headLoc.childNodes.length;
            while (i-- > 0) {
                var item = headLoc.childNodes[i], src = item.getAttribute ? item.getAttribute("src") : null;
                if (src && src.indexOf(url) != -1) {
                    headLoc.removeChild(item);
                    break;
                }
            }
        },
        /**
         * Initialize components
         * @param loadingDoc object with doc and components parameters
         */
        initializeComponents:function (loadingDoc) {
            if (loadingDoc.components) {
                var allFactoriesToLoad = [], com = loadingDoc.components, i, j = com.length, name;
                for (i = 0; i < j; i++) {
                    if (!this.componentFactories[com[i].componentName]) allFactoriesToLoad.push(com[i].componentName);
                }
                j = allFactoriesToLoad.length;
                if (j > 0) {
                    for (i = 0; i < j; i++) {
                        name = allFactoriesToLoad[i];
                        var waiting = this.waitingComponentFactories[name], isNotWaiting = !(waiting);
                        if (isNotWaiting) {
                            waiting = this.waitingComponentFactories[name] = [];
                        }
                        if (!this.arrayContains(waiting, loadingDoc)) waiting.push(loadingDoc);
                        if (isNotWaiting) {
                            this.addJSToDocument(this.document, this.staticURL + "/js/components/" + name + ".js?t=" + (new Date().getTime()));
                        }
                    }
                } else {
                    var allModuleResourcesToLoad = [], res;
                    for (i = 0; i < com.length; i++) {
                        res = this.getComponentFactory(com[i].componentName).componentResources;
                        if (res) {
                            if (typeof(res) == "string") res = [res];
                            j = res.length;
                            while (j-- > 0) {
                                //if (!this.getResourceModule(res[j]) && !this.arrayContains(allModuleResourcesToLoad, res[j])) allModuleResourcesToLoad.push(res[j]);
                            }
                        }
                    }
                    /**
                     * Initialize
                     */
                    var instance = this, init = function () {
                        try {
                            if (loadingDoc.insteadCreate) {
                                loadingDoc.insteadCreate();
                            } else {
                                for (i = 0; i < com.length; i++) {
                                    var cfg = com[i];
                                    if (!cfg.initialized) {
                                        var componentFactory = instance.getComponentFactory(cfg.componentName);
                                        cfg.initialized = true;
                                        instance.initializeComponent(componentFactory, cfg.parameters, cfg.doc, cfg.window, null, null, null);
                                    }
                                }
                            }
                        } catch (e) {
                            console.log("Can't load component", loadingDoc, e);
                        }
                    };
                    if (allModuleResourcesToLoad.length > 0) {
                        var locale = this.locale ? '_' + this.locale : "";
                        var keys = {length:allModuleResourcesToLoad.length};
                        this.waitingModuleResources.push({keys:keys, callBack:init});
                        for (i = 0; i < allModuleResourcesToLoad.length; i++) {
                            name = allModuleResourcesToLoad[i];
                            keys['_' + name] = true;
                            this.addJSToDocument(this.document, this.staticURL + "/js/resources/" + name + locale + ".js");
                        }
                    } else init();
                }
            }
        },
        initializeComponent:function (componentFactory, parameters, document, window, before, after, parentInstance) {
            var utils = this, beforeCreateCallBack = function () {
                if (before) before();
                var i = componentFactory.create(parameters, document, window);
                if (after) after(i);
                var callBack = function () {
                    if (componentFactory.afterCreate) {
                        componentFactory.afterCreate(i, parameters, document, window);
                    }
                    if (parentInstance && parentInstance._childrenToInit && parentInstance._childrenToInit.count-- < 2) {
                        parentInstance._childrenToInit.callBack();
                        parentInstance._childrenToInit = undefined;
                    }
                };
                var chTI = i._childrenToInit;
                if (chTI && chTI.children) {
                    var j = chTI.children.length;
                    chTI.count = j;
                    chTI.callBack = callBack;
                    for (var l = 0; l < j; l++) {
                        var item = chTI.children[l];
                        utils.loadComponentFactory(item.name, utils._rIC(i, item.parameters, document, window, item.element));
                    }
                } else {
                    callBack();
                }
            };
            if (componentFactory.beforeCreate) {
                componentFactory.beforeCreate(parameters, beforeCreateCallBack);
            } else {
                beforeCreateCallBack();
            }
        },
        //number if ID to render "new" unique identifier
        nextId:0,
        setComponentElementEvent:function (name, instance, parameters, document, window) {
            var utils = this;
            return function (event) {
                instance.syncFromHTML();
                if (name.substr(0, 10) == "component.") {
                    var i = name.indexOf('.', 10), func = name.substr(i), componentName = name.substr(10, i - 10);
                    utils.loadComponentFactory(componentName, function (component) {
                        eval("component" + func);
                        //TODO: detect any change on parameters and syncToHTML
                        if (false) instance.syncToHTML();
                    });
                } else {
                    return eval(name.substr(0, 9) != "instance." ? "instance.factory." + name : name);
                }
                //TODO: detect any change on parameters and syncToHTML
                if (false) instance.syncToHTML();
            };
        },
        /**
         * Creates or clears component instance for clear (re)painting component to HTML.
         * Returned object is the instance object of every webJS component. It holds reference to all
         * children components, parameters, id binders and its elements, listeners, validators and et cetera...
         * @param factory factory for component
         * @param parameters reference to all parameters for instance
         * @param document document
         * @param window window
         */
        createComponentInstance:function (factory, parameters, document, window) {
            var instance, parentElement = parameters.parentElement;
            parameters.parentElement = undefined;
            if (parameters.componentInstance) {
                instance = parameters.componentInstance;
                delete parameters.componentInstance;
                instance.ids = [];
                var existingChildren = instance.getChildren();
                existingChildren.splice(0, existingChildren.length);
                return instance;
            }
            var util = this, children = [];
            instance = {factory:factory, ids:[],
                //model listeners
                listeners:{},
                listenerFor: function (key) {
                    return this.listeners[key];
                },
                /**
                 * Adds parameters changes listener
                 * @param key key in parameters (e.g. parameters.person.name has key "person.name")
                 * @param listener listener function (value, instance, parameters) {...}
                 */
                addListener:function (key, listener) {
                    var existing = this.listeners[key];
                    if (existing) {
                        if (typeof(existing) == "function") this.listeners[key] = [existing, listener];
                        else existing.push(listener);
                    } else this.listeners[key] = listener;
                },
                /**
                 * Adds parameters validator
                 * @param key parameters key (null supported)
                 * @param validator
                 */
                addValidator:function (key, validator) {
                    util._aCV(this, key, parameters, validator);
                },
                /**
                 * Sets values to key (if values != null) and runs parameters changes listeners
                 * @param keys parameters keys
                 * @param values array of values (null supported)
                 */
                changeParameters:function (keys, values) {
                    var changedKeys = values ? [] : keys;
                    if (values) {
                        var i = values.length;
                        while (i-- > 0) util._cPS(parameters, keys[i], values[i], changedKeys);
                    }
                    util._cPCh(this, parameters, changedKeys);
                },
                /**
                 * Sets all values from parameters object to UI HTML element
                 */
                syncToHTML:function () {
                    util._sCTHTML(this, parameters, document, window);
                },
                /**
                 * Sets all values from UI HTML element to parameters object
                 */
                syncFromHTML:function () {
                    util._sCFHTML(this, parameters, document);
                },
                /**
                 * Render new unique ID for HTML element and adds it configuration for the init() method
                 * @param conf configuration is rendered object using the HTML compiler
                 */
                renderId:function (conf) {
                    conf.id = "id" + util.nextId++;
                    this.ids.push(conf);
                    return conf.id;
                },
                /**
                 * Initializes all HTML elements using the array of unique IDs with custom configuration
                 * using parameters reference
                 */
                init:function () {
                    util._iC(this, parameters, document, window);
                },
                /**
                 * Returns last item ID for webJS ID
                 * @param id value or key of element (binding id)
                 */
                getItem:function (id) {
                    return util.getComponentId(this, id);
                },
                /**
                 * Returns all item IDs for webJS ID
                 * @param id value or key of element (binding id)
                 */
                getItems:function (id) {
                    return util.getComponentIds(this, id);
                },
                /**
                 * Returns the first HTML element for given binding id
                 * @param id value or key of element (binding id)
                 */
                getElementById:function (id) {
                    return util.getComponentElementById(this, document, id);
                },
                /**
                 * Returns array of elements for given binding id
                 * @param id value or key of element (binding id)
                 */
                getElementsById:function (id) {
                    return util.getComponentElementsById(this, document, id);
                },
                /**
                 * Returns array of elements for given binding id
                 * @param items items from getItem or getItems
                 */
                getElementsByItems:function (items) {
                    return util.getComponentElementsByItems(this, document, items);
                },
                /**
                 * Returns the HTML element of this instance
                 */
                getElement:function () {
                    return parentElement;
                },
                /**
                 * Returns parent instance of this instance
                 */
                getParent:function () {
                    return null;
                },
                /**
                 * Returns child instance of this instance
                 */
                getChild:function (componentName) {
                    return util._fIOF(children, componentName);
                },
                /**
                 * Returns all children instances of this instance
                 */
                getChildren:function () {
                    return children;
                },
                /**
                 * Returns reference to parameters object used in actual instance
                 */
                getParameters:function () {
                    return parameters;
                },
                /**
                 * Recalls beforeCreate, create and afterCreate but using the same instance
                 * for repainting the component
                 */
                reCreate:function () {
                    util._rCI(this, document, window);
                },
                validate:function (id, callback) {
                    if (callback) callback([]);
                }
            };
            if (parentElement) parentElement.webJSComponent = instance;
            if (factory.extendInstance) factory.extendInstance(instance, parameters, document, window);
            return instance;
        },
        /**
         * initializeComponent - static helper for instance object:
         * Initializes all HTML elements using the array of unique IDs with custom configuration
         * using parameters reference
         * @param instance
         * @param parameters
         * @param document
         * @param window
         */
        _iC:function (instance, parameters, document, window) {
            var ids = instance.ids,
                i,
                j = ids.length,
                keys = {},
                children = null,
                item,
                classes = {};
            for (i = 0; i < j; i++) {
                item = ids[i];
                var element = document.getElementById(item.id);
                if (element) {
                    var name = element.nodeName.toLowerCase();
                    var click = null;
                    if (item.click) {
                        click = this.setComponentElementEvent("" + item.click, instance, parameters, document, window);
                    }
                    var change = null;
                    if (item.change) {
                        change = this.setComponentElementEvent("" + item.change, instance, parameters, document, window);
                    }
                    for (var eventName in item) if ((",change,click,id,forId,load,component,").indexOf(','+eventName+',')==-1) {
                        element['on'+eventName] = this.setComponentElementEvent(item[eventName], instance, parameters, document, window);
                    }
                    var key = item.key;
                    if (typeof(key) == "string" && key.substr(0, 11) == "parameters.") {
                        var first = keys[key];
                        if (first) {
                            ids[first - 1].multiple = ids[i].multiple = true;
                        } else {
                            keys[key] = i + 1;
                        }
                        if (name == "input" || name == "textarea") {
                            var type = element.getAttribute("type");
                            if (type == "radio" || type == "checkbox") {
                                if (click) {
                                    console.log("The click event is not supported for radio inputs. Use change event instead.");
                                }
                                element.onclick = this.renderOnChange(i, instance, item, parameters, element, change);
                                click = null;
                                change = null;
                            } else {
                                element.onkeyup = this.renderOnKeyChange(i, instance, item, parameters, element, change);
                                change = null;
                            }
                        } else if (name == "select") {
                            element.onchange = this.renderOnChange(i, instance, item, parameters, element, change);
                            change = null;
                        }
                        if (key.substr(0, 11) == "parameters.") {
                            var pIndex = key.lastIndexOf('.');
                            if (pIndex > 11) {
                                try {
                                    var parentKey = key.substr(0, pIndex),
                                        parentKeyObject = eval(parentKey),
                                        field = key.substr(pIndex + 1),
                                        className = parentKeyObject['class'];
                                    if (className) {
                                        if (!classes[className]) classes[className] = [];
                                        classes[className].push({key:key.substr(11, pIndex - 11), field:field});
                                    }
                                } catch (e) {
                                    console.log("Can't evaluate model", e);
                                }
                            }
                        }
                    }
                    if (item.component) {
                        if (!children) children = [];
                        if (!item.key) item.key = "component." + item.component.name;
                        element.setAttribute("componentName", item.component.name);
                        children.push({name:item.component.name, parameters:item.component.parameters || {}, element:element});
                        delete item.component;
                    }
                    if (change) {
                        element.onchange = change;
                    }
                    if (click) {
                        element.onclick = click;
                    }
                    if (item.load) {
                        element.onload = this.setComponentElementEvent("" + item.load, instance, parameters, document, window);
                    }
                    if (item.forId) {
                        var forItem = this.getComponentId(instance, item.forId);
                        if (forItem) {
                            element.setAttribute("for", forItem.id);
                            element.setAttribute("htmlFor", forItem.id);
                        } else {
                            console.log("No element for " + item.forId);
                        }
                    }
                } else {
                    console.log("No element for " + item.id);
                }
            }
            var validators = {};
            for (i in classes) {
                this._rVF(instance, i, classes[i], validators);
            }
            if (children) {
                instance._childrenToInit = {children:children};
            }
            instance.syncToHTML();
        },
        /**
         * Returns renderValidatorFromDefinition
         * @param vD ValidationDefinition object
         */
        _rVFD:function (componentName, key, vD) {
            var regex = null, utils = this;
            if (vD.regex) {
                regex = new RegExp(vD.regex);
            }
            return function (value, hints) {
                if (vD.mandatory && !value) {
                    utils.rbCall(componentName + "." + key + ".isMandatory", function (message) {
                        hints.addAndFinish(message, "");
                    });
                    return;
                }
                if (value > "" && regex && !regex.test(value)) {
                    utils.rbCall(componentName + "." + key + ".wrongFormat", function (message) {
                        hints.addAndFinish(message, "");
                    });
                    return;
                }
                if (vD.validator) {
                    utils.request("_v.validate", [vD.validator, typeof(value) == "object" && value && value['class'] ? value : {'class':vD.validatorType, value:value}],
                        function (result) {
                            var j = result.length, processed = {all:j, done:0};
                            for (var i = 0; i < j; i++) utils._pVR(result[i], hints, processed);
                            if (j == 0) hints.finish();
                        });
                    return;
                }
                hints.finish();
            }
        },
        /**
         * processValidationResponse
         * @param hint ValidationHint object
         * @param hints validation hints object
         * @param processed counter
         */
        _pVR:function (hint, hints, processed) {
            this.rbCall(hint.resource, function (message) {
                processed.done++;
                hints.add(message, hint.field);
                if (processed.all == processed.done) hints.finish();
            });
        },
        validationDefinitions:{},
        /**
         * registerValidationFor
         * @param instance
         * @param className
         * @param keyFields
         * @param validators
         */
        _rVF:function (instance, className, keyFields, validators) {
            var validationDefinitions = this.validationDefinitions,
                defs = validationDefinitions[className],
                componentName = instance.factory.componentName;
            if (defs) {
                var fieldDef, i , j = keyFields.length, key;
                for (i = 0; i < j; i++) {
                    fieldDef = keyFields[i] ? defs[keyFields[i].field] : null;
                    if (fieldDef) {
                        key = keyFields[i].key + '.' + keyFields[i].field;
                        if (fieldDef && !validators[key]) {
                            instance.addValidator(key, this._rVFD(componentName, key, fieldDef));
                            validators[key] = true;
                        }
                    }
                }
                fieldDef = defs["__null"];
                if (fieldDef) {
                    for (i = 0; i < j; i++) {
                        key = keyFields[i].key;
                        if (!validators[key]) {
                            instance.addValidator(key, this._rVFD(componentName, key, fieldDef));
                            validators[key] = true;
                        }
                    }
                }
            } else {
                var utils = this;
                this.request("_v.get", [className],
                    function (definitions) {
                        defs = {};
                        var j = definitions ? definitions.length : 0;
                        for (var i = 0; i < j; i++) {
                            var field = definitions[i]['field'];
                            defs[field ? field : "__null"] = definitions[i];
                        }
                        validationDefinitions[className] = defs;
                        utils._rVF(instance, className, keyFields, validators);
                    });
            }
        },
        /**
         * Renders callback function for initializing component (renderInitializeComponent)
         * @param parentInstance parent instance of new instance to be initialized
         * @param parameters parameters for new instance
         * @param document document
         * @param window window
         * @param element HTML element for new instance
         */
        _rIC:function (parentInstance, parameters, document, window, element) {
            var util = this;
            return function (factory) {
                util.initializeComponent(factory, parameters, document, window, function () {
                    parameters.parentElement = element;
                }, function (instance) {
                    parentInstance.getChildren().push(instance);
                    util._rCPI(parentInstance, instance);
                }, parentInstance);
            };
        },
        /**
         * Sets parent instance for child instance (renderComponentParentInstance)
         * @param parentInstance parent instance
         * @param instance child instance of parent instance
         */
        _rCPI:function (parentInstance, instance) {
            instance.getParent = function () {
                return parentInstance;
            };
            if (parentInstance.factory.onChildOpen) parentInstance.factory.onChildOpen(parentInstance, instance);
        },
        /**
         * Returns the first component instance of componentName
         * @param children array of instances
         * @param componentName name of the instance component factory
         */
        _fIOF:function (children, componentName) {
            var j = children.length;
            if (j == 0) return null;
            if (!componentName) return children[0];
            for (var i = 0; i < j; i++) if (children[i].factory.componentName == componentName) return children[i];
            return null;
        },
        /**
         * recreate component instance object
         * @param instance component instance object
         */
        _rCI:function (instance, document, window) {
            var parameters = instance.getParameters();
            parameters.componentInstance = instance;
            this.initializeComponent(instance.factory, parameters, document, window, null, null, null);
        },
        renderOnKeyChange:function (i, instance, id, parameters, element, change) {
            var util = this, o = {t:null};
            return function () {
                if (o.t) clearTimeout(o.t);
                o.t = setTimeout(function () {
                    util.renderOnKeyChangeCallBack(i, o, instance, id, parameters, element, change);
                }, 250);
            }
        },
        renderOnKeyChangeCallBack:function (i, o, instance, id, parameters, element, change) {
            o.t = null;
            var changedKey = this.fillComponentValue(i, instance, id.key, id.t, parameters, element);
            if (changedKey) {
                instance.validate(id.key);
                if (change) change();
                this._cPCh(instance, parameters, [changedKey])
            }
        },
        renderOnChange:function (i, instance, id, parameters, element, change) {
            var util = this;
            return function () {
                var changedKey = util.fillComponentValue(i, instance, id.key, id.t, parameters, element);
                if (changedKey) {
                    instance.validate(id.key);
                    if (change) change();
                    util._cPCh(instance, parameters, [changedKey])
                }
            };
        },
        /**
         * addComponentValidator: some instance needed parameters validators
         * @param instance component instance
         * @param key parameters key
         * @param parameters parameters model reference
         * @param validator validator function (value, hints) where exists hints.add(title, key)
         */
        _aCV:function (instance, key, parameters, validator) {
            var util = this,
                id = "parameters" + (key > "" ? "." + key : "");
            var func = instance.factory.elementHint;
            var notify = instance.factory.onValidate ? instance.factory.onValidate : null;
            if (!func) func = util.elementHint;
            var hintsWrapper = {
                _a:null,
                _c:null,
                _h:{},
                _hints:{},
                add:function (title, keyPart) {
                    var hint = {title:title, id:id + (keyPart > "" ? "." + keyPart : "")};
                    this._a.push(hint);
                    func(instance, hint.id, hint);
                    this._h[hint.id] = 2;
                    this._hints[hint.id] = hint;
                },
                addAndFinish:function (title, keyPart) {
                    this.add(title, keyPart);
                    this.finish();
                },
                finish:function () {
                    var h = this._h, hints = this._hints;
                    for (var i in h) {
                        if (h[i] == 1) {
                            if (!this._c[i]) func(instance, i, null);
                            hints[i] = h[i] = undefined;
                        } else if (h[i] == 2) {
                            h[i] = 1;
                            this._c[i] = true;
                        } else {
                            hints[i] = undefined;
                        }
                    }
                    if (this._c.count-- == 1) {
                        if (notify) notify(instance, this._a);
                        if (this._c.c) this._c.c(this._a);
                        instance._validatorRuns = false;
                    }
                },
                _addAllHinted:function (hints) {
                    var h = this._hints;
                    for (var i in h) {
                        if (h[i]) hints.push(h[i]);
                    }
                }
            };
            var validatorWrapper = function (hints, changedKey, cache) {
                if (changedKey && changedKey.indexOf(id) != 0) {
                    hintsWrapper._addAllHinted(hints);
                    if (cache.count-- == 1) {
                        if (notify) notify(instance, hints);
                        if (cache.c) cache.c(hints);
                        instance._validatorRuns = false;
                    }
                    return;
                }
                hintsWrapper._a = hints;
                hintsWrapper._c = cache;
                validator(eval(id), hintsWrapper);
            };
            if (!instance._validator && !instance._validators) {
                instance._validator = validatorWrapper;
                instance.validate = function (changedKey, callback) {
                    if (this._validatorRuns) return;
                    this._validatorRuns = true;
                    var hints = [], cache = {count:1, c:callback};
                    this._validator(hints, changedKey, cache);
                };
            } else {
                if (instance._validator) {
                    instance._validators = [instance._validator];
                    instance._validator = undefined;
                    instance.validate = function (changedKey, callback) {
                        if (this._validatorRuns) return;
                        this._validatorRuns = true;
                        var hints = [], j = this._validators.length, cache = {count:j, c:callback, hints:[]};
                        for (var i = 0; i < j; i++) this._validators[i](hints, changedKey, cache);
                    }
                }
                instance._validators.push(validatorWrapper);
            }
        },
        /**
         * Adds or removes validation message from HTML element
         * @param instance instance object
         * @param id value or key of element (binding id)
         * @param hint object containing title and id (object is null if there is no validation message)
         */
        elementHint:function (instance, id, hint) {
            var elements = instance.getElementsById(id),
                j = elements.length;
            for (var i = 0; i < j; i++) {
                var element = elements[i];
                element.style['backgroundColor'] = hint ? "#ffff88" : "white";
                element.setAttribute("alt", hint ? hint.title : "");
            }
        },
        /**
         * syncComponentToHTML: private method for setting all values from parameters object to UI HTML element in
         * one instance
         * @param instance instance object
         * @param parameters parameters object
         * @param document document reference
         * @param windows window reference
         */
        _sCTHTML:function (instance, parameters, document, windows) {
            if (instance.ids) {
                var ids = instance.ids,
                    i,
                    j = ids.length;
                for (i = 0; i < j; i++) {
                    var element = document.getElementById(ids[i].id);
                    if (element) {
                        var val = ids[i].val;
                        if (typeof(ids[i].key) == "string" && ids[i].key.substr(0, 11) == "parameters.") {
                            try {
                                val = !ids[i].key ? !ids[i].val ? null : ids[i].val : eval(ids[i].key);
                            } catch (e) {
                                val = e.message;
                            }
                        }
                        if (val != null) {
                            this.setComponentValue(element, ids[i].t, val);
                        }
                    }
                }
            }
        },
        setComponentValue:function (element, t, val) {
            var name = element ? element.nodeName.toLowerCase() : "", i, value = t ? t.toView(val) : val;
            if (name == "input" || name == "textarea") {
                if (element.type == "radio" || (element.type == "checkbox" && element.value > "")) {
                    element.checked = element.value == value;
                } else if (element.type == "checkbox") {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            } else if (name == "select") {
                var options = element.options;
                i = options.length;
                element.selectedIndex = -1;
                while (i-- > 0) {
                    if (options[i].value == value) element.selectedIndex = i;
                }
            } else {
                var html = "", acceptHTML = element.getAttribute("insertHTML");
                if (!value) {
                    html = acceptHTML ? "" : "&nbsp;";
                } else if (acceptHTML) {
                    html = value;
                } else {
                    var j = value ? (value = "" + value).length : 0, c;
                    for (i = 0; i < j; i++) {
                        if ((c = value.charAt(i)) == '&') html += "&amp;";
                        else if (c == '\n') html += "<br/>";
                        else if (c == '>') html += "&gt;";
                        else if (c == '<') html += "&lt;";
                        else html += c;
                    }
                }
                element.innerHTML = html;
            }
        },
        /**
         * syncComponentFromHTML: private method for setting values in UI HTML element to parameters object in
         * one instance
         * @param instance instance object
         * @param parameters parameters object
         * @param document document reference
         */
        _sCFHTML:function (instance, parameters, document) {
            if (instance.ids) {
                var ids = instance.ids,
                    j = ids.length,
                    changedKeys = [];
                for (var i = 0; i < j; i++) {
                    var key = ids[i].key;
                    if (typeof(key) == "string" && key.substr(0, 11) == "parameters.") {
                        var element = document.getElementById(ids[i].id), name;
                        if (element && ((name = element.nodeName.toLowerCase()) == "input" || name == "select" || name == "textarea")) {
                            var changedKey = this.fillComponentValue(-i - 1, instance, ids[i].key, ids[i].t, parameters, element);
                            if (changedKey) changedKeys.push(changedKey);
                        }
                    }
                }
                if (changedKeys.length > 0) {
                    this._cPCh(instance, parameters, changedKeys);
                }
            }
        },
        /**
         * Returns name od parameters key or null if value is not changed
         * @param i index of id
         * @param instance component instance
         * @param key parameters key
         * @param t value transformer for string to value transformation
         * @param parameters parameters reference to model
         * @param element HTML element
         */
        fillComponentValue:function (i, instance, key, t, parameters, element) {
            try {
                var type = element.getAttribute("type"),
                    keyToRun = key + (t ? "=t.fromView(element.value)" : "=element.value"),
                    oldValue = eval(key),
                    newValue, options;
                if (typeof oldValue == "string" && !oldValue) oldValue = null;
                if (type == "radio" || (type == "checkbox" && element.value > "")) {
                    if (element.checked) {
                        newValue = eval(keyToRun);
                    } else {
                        //TODO: is this OK?
                        //newValue = eval(key+"=null");
                    }
                } else if (type == "checkbox") {
                    newValue = eval(key + "=element.checked");
                } else if ((options = element.options) && options.length) {
                    if (element.selectedIndex > -1) {
                        var toRun = "element.options[element.selectedIndex].value";
                        if (t) toRun = "t.fromView(" + toRun + ")";
                        newValue = eval(key + "=" + toRun);
                    } else {
                        newValue = null;
                    }
                } else {
                    newValue = eval(keyToRun);
                }
                if (i >= 0 && instance.ids[i].multiple) {
                    var ids = instance.getItems(key),
                        elements = instance.getElementsByItems(ids),
                        j = elements.length;
                    for (var l = 0; l < j; l++) if (elements[l] != element) {
                        this.setComponentValue(elements[l], ids[l].t, newValue);
                    }
                }
                if (typeof newValue == "string" && !newValue) newValue = null;
                return oldValue != newValue ? key.substr(11) : newValue;
            } catch (e) {
                console.log("Can't fill component values", e);
            }
        },
        /**
         * componentParametersSet
         * @param parameters
         * @param key
         * @param value
         * @param changedKeys
         */
        _cPS:function (parameters, key, value, changedKeys) {
            var oldValue = eval("parameters." + key);
            if (oldValue != value) {
                eval("parameters." + key + "=value");
                changedKeys.push(key);
            }
        },
        /**
         * componentParametersChange run on some model change
         * @param instance component instance
         * @param parameters object
         * @param changedKeys array of changed keys
         */
        _cPCh:function (instance, parameters, changedKeys) {
            var j = changedKeys.length;
            for (var i = 0; i < j; i++) {
                try {
                    var changedKey = changedKeys[i],
                        evaluate = true, value,
                        point = changedKey.length,
                        listener = instance.listenerFor(changedKey);

                    while (true) {
                        if (listener) {
                            if (evaluate) {
                                value = eval("parameters." + changedKey);
                                evaluate = false;
                            }
                            if (typeof(listener) == "function") {
                                listener(value, instance, parameters);
                            } else {
                                var l = listener.length;
                                while (l-- > 0) listener[l](value, instance, parameters);
                            }
                        }
                        point = changedKey.lastIndexOf('.', point - 1);
                        if (point < 1) break;
                        listener = instance.listenerFor(changedKey.substr(0, point))
                    }
                } catch (e) {
                    console.log("Can't evaluate key '" + changedKey + "'", e);
                }

            }
        },
        /**
         * Destroy component
         * @param instance component instance object
         */
        _dC:function (instance) {
            var children = instance.getChildren();
            var j = children.length;
            for (var i = 0; i < j; i++) {
                this._dC(children[i]);
            }
            if (instance.factory.onDestroy) instance.factory.onDestroy(instance);
        },
        /**
         * Returns last item ID for webJS ID
         * @param instance component instance
         * @param id value or key of element
         */
        getComponentId:function (instance, id) {
            var l = instance.ids ? instance.ids.length : 0;
            while (l-- > 0) {
                var item = instance.ids[l];
                if (item.key == id || item.val == id) return item;
            }
            return null;
        },
        /**
         * Returns all item IDs for webJS ID
         * @param instance component instance
         * @param id value or key of element
         */
        getComponentIds:function (instance, id) {
            var l = instance.ids ? instance.ids.length : 0, result = [];
            while (l-- > 0) {
                var item = instance.ids[l];
                if (item.key == id || item.val == id) result.push(item);
            }
            return result;
        },
        /**
         * Returns all instances items element IDs for included instances
         * @param instance component instance
         */
        getComponentInstancesIds:function (instance) {
            var l = instance.ids ? instance.ids.length : 0, result = [];
            while (l-- > 0) {
                var item = instance.ids[l];
                if (item.component) result.push(item);
            }
            return result;
        },
        /**
         * Returns first HTML element for webJS ID
         * @param instance component instance
         * @param doc document
         * @param id value or key of element
         */
        getComponentElementById:function (instance, doc, id) {
            var item = this.getComponentId(instance, id);
            return item ? doc.getElementById(item.id) : null;
        },
        /**
         * Returns first HTML element for webJS ID
         * @param instance component instance
         * @param doc document
         * @param items items from getItem or getItems
         */
        getComponentElementsByItems:function (instance, doc, items) {
            var j = items.length, result = [];
            for (var i = 0; i < j; i++) {
                result.push(doc.getElementById(items[i].id))

            }
            return result;
        },
        /**
         * Returns array of all HTML elements for webJS ID
         * @param instance component instance
         * @param doc document
         * @param id value or key of element
         */
        getComponentElementsById:function (instance, doc, id) {
            var l = instance.ids ? instance.ids.length : 0, elements = [];
            while (l-- > 0) {
                var item = instance.ids[l];
                if (item.key == id || item.val == id) {
                    var element = doc.getElementById(item.id);
                    if (element) elements.push(element);
                }
            }
            return elements;
        },
        /**
         * Opens dynamic page
         * @param url url path (e.g. "#pageName?parameter1=value1&parameter2=value2")
         * @param target id of target element
         * @param customParameters parameters object (null is supported)
         * @param callBack parameters object (null is supported)
         */
        openPage:function (url, target, customParameters, callBack) {
            //1 show loading cursor
            //TODO this.loading();


            //2 parse url
            var i = url.indexOf("#") + 1, p = url.indexOf("?", i);
            if (p == -1) p = url.length;
            var pageName = url.substr(i, p - i);
            var parameters = !customParameters ? {} : customParameters;
            if (p + 1 < url.length) {
                var arr = url.substr(p + 1).split("&");
                i = arr.length;
                while (i-- > 0) {
                    var u = arr[i], d = u.indexOf("=");
                    parameters[u.substr(0, d)] = u.substr(d + 1);
                }
            }
            //3 load component
            var utils = this;
            this.loadComponentFactory(pageName, function (factory) {
                //4 call beforeCreate while the loading cursor is still visible
                var doc = utils.document;
                var isComponent = false,
                    element = target ? typeof(target) != "string" ? !(isComponent = typeof(target.factory) == "object") ? target : target.getElement() : doc.getElementById(target) : doc.getElementById("main"),
                    parentInstance = isComponent ? target.getParent() : null,
                    fakeParentInstance = callBack ? {_childrenToInit:{count:1, callBack:function () {
                        callBack(this.instance)
                    }}} : null;
                if (isComponent) {
                    utils._dC(target);
                }
                utils.initializeComponent(factory, parameters, utils.document, utils.window, function () {
                    //5 hide loading cursor
                    //TODO utils.unload();
                    //TODO find the right element
                    if (!element) element = doc.body;
                    element.innerHTML = "";
                    parameters.parentElement = element;
                    //doc.body.onclick=doc.body.onmousedown=doc.body.onmousemove=doc.body.onmouseup=null;
                }, function (instance) {
                    if (parentInstance) {
                        var children = parentInstance.getChildren(), i = children.length;
                        while (i-- > 0) if (children[i] == target) {
                            children[i] = instance;
                            break;
                        }
                        utils._rCPI(parentInstance, instance);
                    }
                    var pageTitle = instance.title || factory.title;
                    if (pageTitle) {
                        utils.setTitle(pageTitle);
                    }
                    //6 google urchin track
                    utils.trackDynamic(url);
                    if (fakeParentInstance) fakeParentInstance._childrenToInit.instance = instance;
                }, fakeParentInstance);
            });
        },
        setTitle:function (title) {
            try {
                top.document.title = title;
            } catch (e) {
                try {
                    document.title = title;
                } catch (e) {
                    //safe to ignore
                }
            }
        },
        /**
         * Returns true if array contains item
         * @param arr array
         * @param item item
         */
        arrayContains:function (arr, item) {
            var i = arr.length;
            while (i-- > 0) if (arr[i] == item) return true;
            return false;
        },
        /**
         * Creates service object for AJAX request
         * @param action action means "module.function" string (module is name of module and function is a name of java function)
         * @param actionParameters array of parameters for function in java
         * @param success function for processing the result of function in java: function (result, request) {...}
         * @param failure function for processing the exception of function in java: function (exception, request) {...}
         * @param requestTimeout timeout for request, after this time request is marked as lost
         * @param cacheTimeOut remember result in cache
         * @param doNotSend true if the request won't be executed immediately (you need to execute request.sed() manually) and request object should be returned
         * @return true if request is processed asynchronously, false if request is processed immediately or returns the request object on doNotSend == true
         */
        request:function (action, actionParameters, success, failure, requestTimeout, cacheTimeOut, doNotSend) {
            var request = {action:action,
                cacheTimeOut:(typeof cacheTimeOut) == 'number' ? cacheTimeOut : 0,
                actionParameters:actionParameters,
                timeout:requestTimeout > 0 ? requestTimeout : 30000, //30 seconds
                success:(typeof success) == 'function' ? success : null,
                failure:(typeof failure) == 'function' ? failure : null,
                isPost:true, //true = "POST" request, false = "GET" request
                status:0//0-created and ready to send, 1-send and waiting for result or timeout
            };

            if (!doNotSend) return this._sR(request);

            var instance = this;
            request.send = function () {
                return instance._sR(this);
            };
            return request;
        },
        /**
         * Creates service object for AJAX request
         * @param action action means "module.function" string (module is name of module and function is a name of java function)
         * @param actionParameters array of parameters for function in java
         * @param requestTimeout timeout for request, after this time request is marked as lost
         * @param success function for processing the result of function in java: function (result, request) {...}
         * @param failure function for processing the exception of function in java: function (exception, request) {...}
         * @param cacheTimeOut remember result in cache
         */
        createRequest:function (action, actionParameters, requestTimeout, success, failure, cacheTimeOut) {
            return this.request(action, actionParameters, success, failure, requestTimeout, cacheTimeOut, true);
        },
        /**
         * Send Request (creates the ajax request and process its response)
         * @param request the request object created by request() or createRequest() function
         * @return true if request is processed asynchronously or false if request is processed immediately (from cache, error, ...)
         */
        _sR:function (request) {
            if (request.status == 0) {
                var requestParams = null,
                    p = request.actionParameters,
                    cacheKey = null;

                if (p != null) {
                    requestParams = [];
                    if (typeof p == 'object' && typeof p.splice == 'function' && typeof p.length == "number") {
                        for (var i = 0; i < p.length; i++) {
                            requestParams.push(this.objectToJSON(p[i], -100));
                        }
                    } else {
                        requestParams.push(this.objectToJSON(p, -100));
                    }
                }

                if (request.success && request.cacheTimeOut > 0) {
                    try {
                        cacheKey = '_r' + request.action + '[' + requestParams.join(',') + ']';
                        var old = this.cacheGet(cacheKey);
                        if (old) {
                            request.success(old, this);
                            return false;
                        }
                    } catch (e) {
                        console.log("Can't consume request result", e);
                    }
                }

                try {
                    request.status = 1;
                    var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
                    if (xmlhttp.overrideMimeType) {
                        xmlhttp.overrideMimeType('text/plain');
                    }
                    var instance = this;
                    xmlhttp.onreadystatechange = function () {
                        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                            try {
                                instance._cR(request, eval("" + xmlhttp.responseText), cacheKey);
                            } catch (e) {
                                e.xmlhttp = xmlhttp;
                                console.log("Can't consume request result", e);
                            }
                        }
                    };
                    var url = request.url ? request.url : this.requestURL;
                    var parametersUrl = "a=" + encodeURIComponent(request.action);
                    if (requestParams) {
                        var j = requestParams.length;
                        for (var l = 0; l < j; l++) {
                            parametersUrl += "&" + l + "=" + encodeURIComponent(requestParams[l]);
                        }
                    }
                    if (!request.isPost) {
                        url += "?" + parametersUrl;
                    }
                    xmlhttp.open(request.isPost ? "POST" : "GET", url, true);
                    if (request.isPost) {
                        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    }
                    xmlhttp.send(request.isPost ? parametersUrl : "");
                    request.timer = window.setTimeout(function () {
                        instance._cR(request, null, cacheKey);
                    }, request.timeout);
                } catch (e) {
                    this._cR(request, [false, {title:e.name, description:e.message}], cacheKey);
                    return false;
                }
            }
            return true;
        },
        /**
         * Consume request for AJAX post processing
         * @param request the request object
         * @param result ajax response JSON array: [errorCodeInteger, JSON_ResponseObject]
         * @param cacheKey key for putting response to cache
         */
        _cR:function (request, result, cacheKey) {
            if (request.timer && result) window.clearTimeout(request.timer);
            request.timer = null;
            if (request.status == 1) {
                request.status = 0;
                var callbackParameter = null;
                var hasException = false;
                if (result == null) {
                    //timeout, server is offline
                    console.log("Request timeout", request);
                    callbackParameter = {title:"Can't call server", description:"Connection timeout " + request.timeout + "ms"};
                    hasException = true;
                } else {
                    hasException = result[0] == 0;
                    callbackParameter = result[1];
                }
                if (hasException) {
                    if (request.failure) {
                        try {
                            request.failure(callbackParameter, request);
                        } catch (e) {
                            e.request = request;
                            console.log("Can't run request failure method", e);
                        }
                    } else {
                        callbackParameter = null;
                        hasException = false;
                        console.log("Can't get correct result for request", result);
                    }
                }
                if (!hasException) {
                    try {
                        if (request.cacheTimeOut > 0 && cacheKey) {
                            this.cachePut(cacheKey, callbackParameter, request.cacheTimeOut);
                        }
                        if (request.success) request.success(callbackParameter, request);
                    } catch (e) {
                        e.request = request;
                        console.log("Can't run request success method", e);
                    }
                }
            }
        },
        _sV:function (o) {
            return typeof(o) == 'number' ? o : this.objectToJSON(o, 3);
        },
        /**
         * Puts something to cache
         * @param key key
         * @param value value
         * @param timeout mili-seconds to hold in cache
         */
        cachePut:function (key, value, timeout) {
            if (!(timeout > 0)) timeout = 3600000; //1 hour
            this.cache['_' + key] = {v:value, end:(new Date().getTime()) + timeout, timeout:timeout};
        },
        /**
         * Puts something to cache only if this key does not exist yet
         * @param key key
         * @param value value
         * @param timeout mili-seconds to hold in cache
         */
        cachePutOnlyNew:function (key, value, timeout) {
            if (!(timeout > 0)) timeout = 3600000; //1 hour
            var old = this.cache['_' + key];
            if (!old || old.end < new Date().getTime()) this.cache['_' + key] = {v:value, end:(new Date().getTime()) + timeout, timeout:timeout};
        },
        /**
         * Gets something from cache
         * @param key key
         */
        cacheGet:function (key) {
            var item = this.cache['_' + key];
            if (!item) return null;
            if (item.end < new Date().getTime()) {
                this.cache['_' + key] = null;
                return null;
            }
            return item.v;
        },
        /**
         * Serializes the JavaScript object to JSON string
         * @param object JavaScript object
         * @param level level
         */
        objectToJSON:function (object, level) {
            var type = typeof object;
            var t = '';
            if (type == 'undefined') return 'null';
            if (type == 'boolean') return object ? 'true' : 'false';
            if (type == 'string') {
                var p = object.indexOf('\'');
                if (p > 0) {
                    t = object.substr(0, p);
                }
                while (p != -1) {
                    var e = object.indexOf('\'', p + 1);
                    t += "\\" + (e != -1 ? object.substr(p, e - p) : object.substr(p));
                    p = e;
                }
                if (t > '') object = t;
                return "'" + object + "'";
            }
            if (type == 'number') {
                return '' + object;
            }
            if (type == 'object') {
                if (object == null) return 'null';
                if ((typeof object.getFullYear == 'function') && (typeof object.getTime == 'function')) return 'new Date(' + object.getTime() + ')';
                if (typeof level != "number") level = 0;
                if (level > 3) return "{/*...*/}";
                try {
                    if ((typeof object.splice == 'function') && (typeof object.length == "number")) {
                        var j = object.length;
                        for (var i = 0; i < j; i++) {
                            if (i > 0) t += ',';
                            t += this.objectToJSON(object[i], level + 1);
                        }
                        return '[' + t + ']';
                    }
                    var notFirst = false;
                    for (var field in object) {
                        if (notFirst) t += ',';
                        else notFirst = true;
                        t += field + ':' + this.objectToJSON(object[field], level + 1);
                    }
                    return '{' + t + '}';
                } catch (e) {
                    return this.objectToJSON(e, level + 1);
                }
            }
            if (type == 'function') return 'function () {}';
            return type;
        },
        /**
         * Tracks the page (urchin, google analytics or any other)
         * @param url url to track
         */
        trackDynamic:function (url) {
            try {
                if (this.pageTracker) this.pageTracker._trackPageview(url);
            } catch (e) {
                console.log("Can't track url", e);
            }
        }
    };
});