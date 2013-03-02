define(['web/Listeners', 'web/Constants'], function (Listeners, Constants) {
    var Components = {author: "Lubos Strapko"};

    //MODULARIZATION TODO:
    // 1, validations
    // 2, synchronizations
    // 3, listeners
    // 4, parentCallBacks

    /**
     * Initializes all HTML elements using the array of unique IDs with custom configuration
     * using parameters reference
     * @param instance
     * @param parent instance wrapper
     * @param parameters
     * @param componentElement
     */
    function initializeComponent(instance, parent, parameters, componentElement) {
        var i,
            ids = instance.__p[0],
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
                    children.push({factory:item.component.factory, name:item.component.name, parameters:item.component.parameters || {}, element:element});
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
    }

    /**
     * Destroy component and all its chindren
     * @param instance component (instance) object
     */
    function destroyComponent(instance) {
        var children = instance.getChildren();
        var j = children.length;
        for (var i = 0; i < j; i++) {
            destroyComponent(children[i]);
        }
        if (instance.factory.onDestroy) instance.factory.onDestroy(instance);
    }

    /**
     * Sync value to HTML element
     * @param element HTMl element
     * @param t getter
     * @param val value
     */
    function setComponentValue(element, t, val) {
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
    }

    /**
     * syncComponentToHTML: private method for setting all values from parameters object to UI HTML element in
     * one instance
     * @param instance instance object
     */
    function syncComponentToHTML(/*Instance*/ instance) {
        var ids = instance.__p[0], parameters = instance.getParameters();
        if (ids) {
            var i,
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
                        setComponentValue(element, ids[i].t, val);
                    }
                }
            }
        }
    }

    function Instance(/*String[]*/ids, factory, parameters) {
        this.__p = [ids, parameters];
        this.factory = factory;
    }

    Instance.prototype.addValidator = function (key, validator) {
        Components._aCV(this, key, parameters, validator);
    };

    /**
     * Sets all values from parameters object to UI HTML element
     */
    Instance.prototype.syncToHTML = function () {
        syncComponentToHTML(this);
    };
    /**
     * Returns reference to parameters object used in actual instance
     */
    Instance.prototype.getParameters = function () {
        return this.__p[1];
    };


    var nextId = 1;

    /**
     * Creates instance for new component
     * @param factory
     * @param parameters
     * @param parentElement
     * @return Instance
     */
    function createInstance(factory, parameters, parentElement) {

        //array for all HTML IDs used for this component
        var ids = [];

        var /*Instance*/ instance = new Instance (ids, factory, parameters);

        /**
         * Sets values to key (if values != null) and runs parameters changes listeners
         * @param keys parameters keys
         * @param values array of values (null supported)
         */
        instance.changeParameters = function (keys, values) {
            var changedKeys = values ? [] : keys;
            if (values) {
                var i = values.length;
                while (i-- > 0) Components._cPS(parameters, keys[i], values[i], changedKeys);
            }
            Components._cPCh(instance, parameters, changedKeys);
        };
        /**
         * Sets all values from UI HTML element to parameters object
         */
        instance.syncFromHTML = function () {
            Components._sCFHTML(instance, parameters, document);
        };
        /**
         * Render new unique ID for HTML element and adds it configuration for the init() method
         * @param conf configuration from the HTML parser
         */
        instance.id = function (conf) {
            if (!conf) return null;
            conf.id = "_rid" + nextId++;
            ids.push(conf);
            return conf.id;
        };
        /**
         * Returns last item ID for webJS ID
         * @param id value or key of element (binding id)
         */
        instance.getItem = function (id) {
            return Components.getComponentId(instance, id);
        };
        /**
         * Returns all item IDs for webJS ID
         * @param id value or key of element (binding id)
         */
        instance.getItems = function (id) {
            return Components.getComponentIds(instance, id);
        };
        /**
         * Returns the first HTML element for given binding id
         * @param id value or key of element (binding id)
         */
        instance.getElementById = function (id) {
            return Components.getComponentElementById(instance, document, id);
        };
        /**
         * Returns array of elements for given binding id
         * @param id value or key of element (binding id)
         */
        instance.getElementsById = function (id) {
            return Components.getComponentElementsById(instance, document, id);
        };
        /**
         * Returns array of elements for given binding id
         * @param items items from getItem or getItems
         */
        instance.getElementsByItems = function (items) {
            return Components.getComponentElementsByItems(instance, document, items);
        };
        /**
         * Returns the HTML element of this instance
         */
        instance.getElement = function () {
            return parentElement;
        };
        /**
         * Returns parent instance of this instance
         */
        instance.getParent = function () {
            return null;
        };
        /**
         * Returns child instance of this instance
         */
        instance.getChild = function (componentName) {
            return Components._fIOF(children, componentName);
        }
        /**
         * Returns all children instances of this instance
         */
        instance.getChildren = function () {
            return children;
        };
        /**
         * Recalls beforeCreate, create and afterCreate but using the same instance
         * for repainting the component
         */
        instance.reCreate = function () {
            Components._rCI(instance, document, window);
        };
        instance.validate = function (id, callback) {
            if (callback) callback([]);
        };

        Listeners.createModelListener(instance);

        return instance;
    }

    /**
     * Opens dynamic page
     * @param urlOrComponent name of page with path and parameters (e.g. "path/pageName?parameter1=value1&parameter2=value2")
     * @param target id of target element
     * @param customParameters parameters object (null is supported)
     * @param callBack parameters object (null is supported)
     */
    function open(urlOrComponent, target, customParameters, callBack) {
        if (typeof urlOrComponent == "string") {
            var url = urlOrComponent;

            //prepares parameters object
            var parametersIndex = url.indexOf("?");
            if (parametersIndex == -1) {
                parametersIndex = url.length;
            }

            //extracts path name and page name from "name" parameter
            var name = url.substr(0, parametersIndex);
            var page = url.substr(0, parametersIndex);
            var parameters = !customParameters ? {} : customParameters;

            //parse parameters and add to "parameters" object
            if (parametersIndex + 2 < url.length) {
                var arrOfParams = url.substr(parametersIndex + 1).split("&");
                var arrOfParamsIndex = arrOfParams.length;
                while (arrOfParamsIndex-- > 0) {
                    var paramStr = arrOfParams[arrOfParamsIndex], paramSplitIndex = paramStr.indexOf("=");
                    if (paramSplitIndex>=paramStr.length) {
                        parameters[paramStr.substr(0, paramSplitIndex)] = "";
                    } else if (paramSplitIndex>0) {
                        parameters[paramStr.substr(0, paramSplitIndex)] = paramStr.substr(paramSplitIndex + 1);
                    }
                }
            }

            require([name], function (factory) {
                open(factory, target, parameters, callBack);
            });

            return;
        } else if (!urlOrComponent || typeof (urlOrComponent.create) != "function") {
            throw "Sorry, I do not know how to open '"+urlOrComponent+"' in target '"+target+"'.";
        }

        var factory = urlOrComponent;

        //1. prepare target HTML element
        var targetIsComponent = false;//true if "target" is some instance object for some page
        var element = target ? typeof(target) != "string" ? !(targetIsComponent = typeof(target['factory']) == "object") ? target.tagName ? target : null : target.getElement() : document.getElementById(target) : document.body;
        if (!element) throw "Sorry, I can not open '"+factory.componentName+"' in target '"+target+"'.";

        //2. call listeners for opening new pages
        var listenerArguments = {
            page: factory.componentName,
            target: target,
            parameters: parameters
        };
        Listeners.executeListeners("loadingWebComponent",listenerArguments);

        //3. get the factory for requested page
        //4. destroy target to be ready for new component
        if (targetIsComponent) destroyComponent(target);

        //prepare create procedure
        function createInstance() {

            //6. create component instance
            Listeners.executeListeners("creatingWebComponent", listenerArguments);
            var instance = factory.create(parameters, element);
            initializeComponent(instance, null, parameters, element);

            //7. do something with children
            //TODO

            //8. calls after create asynchronous methods
            if (factory.afterCreate) factory.afterCreate(instance);

            //9. call listeners for finishing new pages
            Listeners.executeListeners("showedWebComponent", listenerArguments);

            //10. do something with parent
            //TODO

            //11. execute callback function for open page procedure
            if (callBack) callBack(instance);

        }

        //5. calls before create asynchronous methods
        if (!factory.beforeCreate) createInstance();
        else factory.beforeCreate(parameters, createInstance);
    }

    function setClass(element, className) {
        element.className = className;
    }

    function setStyle(element, style) {
        //TODO sets style
    }

    function setEvent(element, eventName, callBack) {
        element['on'+eventName] = callBack;
    }


    //publish some functions as module
    Components.open = open;
    Components.createInstance = createInstance;
    Components.setClass = setClass;
    Components.setStyle = setStyle;
    Components.setEvent = setEvent;

    return Components;

});