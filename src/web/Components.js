define(['web/Listeners'], function (Listeners) {
    var Components = {author: "Lubos Strapko"};

    var log = function (message, obj) {if (window.console) console.log(message, obj)};

    /**
     * Initializes all HTML elements using the array of unique IDs with custom configuration
     * using parameters reference
     * @param instance
     */
    function initializeComponent(/*Instance*/instance) {
        var i,
            ids = instance.__p[0],
            j = ids.length,
            existingKeys = {},
            children = null,
            item;
        for (i = 0; i < j; i++) {
            item = ids[i];
            var element = document.getElementById(item.id);
            if (element) {
                var name = element.nodeName.toLowerCase();
                var click = item.onclick;
                var change = item.onchange;
                if (item.sync) {
                    //this element is synchronized with data model
                    var type = "";
                    var isCheckbox = name == "input" && ((type = element.getAttribute("type") == "radio" || type == "checkbox"));
                    if (name == "select" || (!isCheckbox && (name == "input" || name == "textarea"))) {
                        element.onchange = element.onkeyup = createOnChangeElementCallBack(instance, item, element, null, change);
                        change = null;
                    } else if (isCheckbox) {
                        element.onclick = createOnChangeElementCallBack(instance, item, element, click, change);
                        click = null;
                        change = null;
                    }
                }
                var key = item.key;
                if (typeof(key) == "string") {
                    var keyIndex = existingKeys[key];
                    if (keyIndex != undefined) {
                        ids[keyIndex].multiple = item.multiple = true;
                    } else {
                        existingKeys[key] = i;
                    }
                }
                if (item.component) {
                    if (!children) children = [];
                    if (!item.key) item.key = "component." + item.component.name;
                    element.setAttribute("componentName", item.component.name);
                    item.instance = {factory:item.component.factory, parameters:item.component.parameters || {}, element:element};
                    children.push(item.instance);
                    delete item.component;
                }
                if (change) {
                    element.onchange = createElementEventCallBack(change, instance, element);
                }
                if (click) {
                    element.onclick = createElementEventCallBack(click, instance, element);
                }
                if (item.onload) {
                    element.onload = createElementEventCallBack(item.onload, instance, element);
                }
                //adds other event handlers
                for (var field in item) {
                    field = ("" + field).toLowerCase();
                    if (field.substr(0, 2)=="on" && field!="onload" && field!="onchange" && field!="onclick") {
                        element[field] = createElementEventCallBack(item[field], instance, element);
                    }
                }
                if (item.forId) {
                    var forItem = getComponentId(instance, item.forId);
                    if (forItem) {
                        element.setAttribute("for", forItem.id);
                        element.setAttribute("htmlFor", forItem.id);
                    } else {
                        log("No element for " + item.forId);
                    }
                }
            } else {
                log("No element for " + item.id);
            }
        }
        instance.syncToHTML(null);
        return children;
    }

    /**
     * Creates a callback function for element's event handler
     * @param func function to call inside of handler
     * @param instance component instance
     * @param element HTML element
     * @return {Function}
     */
    function createElementEventCallBack(func, /*Instance*/instance, element) {
        return function (event) {
            instance.syncFromHTML();
            func(event, element);
            instance.syncToHTML(element);
        };
    }

    /**
     * Creates a callback function for element's event handler for changing value
     * @param instance component instance
     * @param item     ID item
     * @param element  HTML element
     * @param click    on click function
     * @param change   on change function
     * @return {Function}
     */
    function createOnChangeElementCallBack(/*Instance*/instance, item, element, click, change) {
        return function (event) {
            onChangeElementListener(instance, item, element, click, change, event);
        };
    }

    /**
     * Returns last item ID for web element ID
     * @param instance component instance
     * @param id value or key of element
     */
    function getComponentId(/*Instance*/instance, id) {
        var ids = instance.__p[0];
        var l = ids ? ids.length : 0;
        while (l-- > 0) {
            var item = ids[l];
            if (item.key == id) return item;
        }
        return null;
    }

    /**
     * Returns all item IDs for web element ID
     * @param instance component instance
     * @param id value or key of element
     */
    function getComponentIds(instance, id) {
        var ids = instance.__p[0];
        var l = ids ? ids.length : 0, result = [];
        while (l-- > 0) {
            var item = ids[l];
            if (item.key == id) result.push(item);
        }
        return result;
    }

    /**
     * Listener for element change event
     * @param instance Component instance
     * @param item element item from instance ids
     * @param element HTML element
     * @param clickFunction required onClick function
     * @param changeFunction required onChange function
     * @param event browser's event
     */
    function onChangeElementListener(/*Instance*/instance, item, element, clickFunction, changeFunction, event) {
        var possibleExternalChange = false;

        if (setModelValue(element, item, instance)) {
            if (changeFunction) {
                changeFunction(event);
                possibleExternalChange = true;
            }
        }

        if (clickFunction) {
            clickFunction(event);
            possibleExternalChange = true;
        }

        if (possibleExternalChange) {
            instance.syncToHTML(null);
        }
    }

    /**
     * Destroy component and all its children
     * @param instance component (instance) object
     */
    function destroyComponent(/*Instance*/instance) {
        var children = instance.getChildren(),
            parent = instance.getParent(),
            i = children.length;
        while (i --> 0) {
            destroyComponent(children[i]);
        }
        if (instance.factory.onDestroy) instance.factory.onDestroy(instance);
        if (parent) {
            if (parent.factory.onChildDestroy) parent.factory.onChildDestroy(instance, parent);
            var parentChildren = parent.getChildren();
            i = parentChildren.length;
            while (i-- > 0) if (instance == parentChildren[i]) {
                parentChildren.splice(i,1);
                break;
            }
        }
        instance.isDestroyed = true;
    }

    /**
     * Returns value for element
     * @param element HTMl element
     */
    function getComponentValue(element) {
        var name = element ? element.nodeName.toLowerCase() : "", i;
        if (name == "input" || name == "textarea") {
            if (element.type == "radio" || (element.type == "checkbox" && element.value > "")) {
                if (element.checked) {
                    return element.value;
                } else {
                    return null;
                }
            } else if (element.type == "checkbox") {
                return !(!element.checked);
            } else {
                return element.value>"" ? element.value : null;
            }
        } else if (name == "select") {
            var selectedIndex = element.selectedIndex,
                options = element.options;
            if (selectedIndex >= 0 && selectedIndex < options.length) return options[selectedIndex].value;
            return null;
        } else {
            var html = element.innerHTML, acceptHTML = element.getAttribute("insertHTML");
            if (acceptHTML) return html;
            return htmlToText(html);
        }
    }

    /**
     * Sets value to parameters (model) - Sync value from HTML element to model
     * @param element
     * @param item
     * @param listener object enabled by Listeners
     * @return {boolean}
     */
    function setModelValue(element, item, listener) {
        var modelValue = item.sync(),
            value = getComponentValue(element);
        if (modelValue != value) {
            //value changed

            if (listener && listener.runListeners) {
                listener.runListeners(item.key, value, modelValue);
            }
            //TODO validate value and run listeners

            item.sync(value);
            return true;
        }
        return false;
    }

    /**
     * Sets value to element - Sync value to HTML element from value
     * @param element HTMl element
     * @param value value to set
     */
    function setComponentValue(element, value) {
        var name = element ? element.nodeName.toLowerCase() : "", i;
        if (name == "input" || name == "textarea") {
            if (element.type == "radio" || (element.type == "checkbox" && element.value > "")) {
                var checked = element.value == value;
                if (checked != element.checked) {
                    element.checked = checked;
                    return true;
                }
            } else if (element.type == "checkbox") {
                if (element.checked != value) {
                    element.checked = value;
                    return true;
                }
            } else {
                var text = value === undefined || value === null ? "" : value;
                if (element.value != text) {
                    element.value = text;
                    return true;
                }
            }
        } else if (name == "select") {
            var options = element.options;
            i = options.length;
            element.selectedIndex = -1;
            while (i-- > 0) {
                if (options[i].value == value) {
                    element.selectedIndex = i;
                    return true;
                }
            }
        } else {
            var html,
                acceptHTML = element.getAttribute("insertHTML");
            if (!value) {
                html = acceptHTML ? "" : "&nbsp;";
            } else if (acceptHTML) {
                html = value;
            } else {
                html = textToHtml(value ? ""+value : "");
            }
            if (element.innerHTML != html) {
                element.innerHTML = html;
                return true;
            }
        }
        return false;
    }

    var entityCharCodes = { amp: 38, cent: 162, pound: 163, yen: 165, euro: 8364, sect: 167,
        copy: 169, reg: 174, trade: 8482, gt: 60, lt: 62, nbsp: 32 };

    /**
     * Converts text into HTML markup
     * @param text text
     * @return {String}
     */
    function textToHtml(/*String*/text) {
        var html = "",
            j = text ? text.length : 0,
            i,c;
        for (i = 0; i < j; i++) {
            if ((c = text.charAt(i)) == '&') html += "&amp;";
            else if (c == '\n') html += "<br/>";
            else if (c == '>') html += "&gt;";
            else if (c == '<') html += "&lt;";
            else html += c;
        }
        return html;
    }

    /**
     * Converts HTML markup to text
     * @param html
     * @return {String}
     */
    function htmlToText(html) {
        if (!html) return null;
        var text = "",
            lower = html.toLowerCase(),
            j = html.length,
            last = '',
            ends;
        for (var i = 0; i < j; i++) {
            var c = html.charAt(i);
            if (c == '&') {
                // can by a special HTML entity, so find its ending character
                ends = i+1;
                var t;
                while (ends < j && !((t=html.charAt(ends)) == ';' || t < '!' || t == '&' || t == '<')) ends++;
                if (ends > i) {
                    var entity = lower.substr(i + 1, ends - 1 - i);
                    if (entity.charAt(0) == "#") {
                        text += String.fromCharCode(parseInt(entity.substr(1)));
                    } else {
                        var charCode = entityCharCodes[entity];
                        if (charCode) text += String.fromCharCode(charCode);
                        else text += '&' + entity + ';';
                    }
                    i = ends;
                    if (html.charAt(i)!=';') i--;
                } else text += c;
            } else if (c == '<') {
                // there is a HTML tag
                ends = html.indexOf('>', i);
                if (ends > i) {
                    // it could by a line break
                    if (lower.substr(i + 1, 2) == 'br' && lower.charAt(i + 3) < 'a') text += "\n";
                    i = ends;
                } else text += c;
            } else if (c < '!') {
                //it is a white space, add it only if there is no whitespace before it
                if (last >= '!') text += ' ';
            } else text += c;

            last = c;
        }
        return text;
    }

    /**
     * Collects all HTML elements (excepts ignored one) mapped by instance
     * @param instance
     * @param ignoringElement
     * @return {Array}
     */
    function syncIterator(/*Instance*/instance, ignoringElement) {
        var ids = instance.__p[0];
        if (ids) {
            var i,
                j = ids.length,
                iterator = [];
            for (i = 0; i < j; i++) {
                var item = ids[i];
                if (item.sync) {
                    var element = document.getElementById(item.id);
                    if (element && ignoringElement != element) {
                        iterator.push({e: element, i: item});
                    }
                }
            }
            return iterator;
        }
        return [];
    }

    var MAXIMUM_SYNC_ITERATIONS = 1000;

    /**
     * Sets values from UI HTML element to parameters object and vice versa (specified by event)
     * one instance
     * @param instance instance object
     * @param ignoringElement HTML element not to sync
     * @param event defines event of synchronization (syncFromHTML or syncToHTML)
     */
    function sync(/*Instance*/instance, ignoringElement, event) {
        var i,
            iterator = syncIterator(instance, ignoringElement),
            iterations = 0,
            j = iterator.length;
        for (i = 0; i < j; i++) {
            var iteration = iterator[i],
                valueChanged;
            try {
                valueChanged = event.isFromHTML
                    ? setModelValue(iteration.e, iteration.i, instance)
                    : setComponentValue(iteration.e, iteration.i.sync());
            } catch (e) {
                log("Can't set ID " + iteration.i.id, e);
            }
            if (valueChanged && iteration.i.onchange) {
                try {
                    iteration.i.onchange(event);
                } catch (e) {
                    log("Exception during invocation 'onchange' method of '" + iteration.i.id + "'", e);
                }
                if (iterations++ > MAXIMUM_SYNC_ITERATIONS) throw "There is a lot of synchronizations from '" + iteration.i.id + "'";
                //sync is true, so starts iteration again
                i = 0;
            }
        }
    }

    /**
     * Returns first HTML element for web element ID
     * @param instance component instance
     * @param id value or key of element
     */
    function getComponentElementById(/*Instance*/instance, id) {
        var item = getComponentId(instance, id);
        return item ? document.getElementById(item.id) : null;
    }

    /**
     * Returns array of all HTML elements for web element ID
     * @param instance component instance
     * @param id value or key of element
     */
    function getComponentElementsById(/*Instance*/instance, id) {
        var ids = instance.__p[0], l = ids ? ids.length : 0, elements = [];
        for (var i = 0; i < l; i++) {
            var item = ids[i];
            if (item.key == id) {
                var element = document.getElementById(item.id);
                if (element) elements.push(element);
            }
        }
        return elements;
    }

    /**
     * Returns the first component instance of componentName
     * @param instance component instance object
     * @param componentName name of the instance component factory
     */
    function firstInstanceOf(/*Instance*/instance, componentName) {
        var children = instance.getChildren();
        var j = children.length;
        if (j == 0) return null;
        if (!componentName) return children[0];
        for (var i = 0; i < j; i++) if (children[i].factory.componentName == componentName) return children[i];
        return null;
    }

    var SYNC_FROM_HTML_EVENT = {type: "synchronizeFromHTML", isFromHTML: true},
        SYNC_TO_HTML_EVENT = {type: "synchronizeToHTML", isToHTML: true};


    /**
     * Constructor for instance object
     * @param ids array od ID items
     * @param children array of children instances
     * @param factory factory function for Component
     * @param parameters parameters (model) object
     * @param parentElement parent HTML element
     * @param parentInstance parent Instance component
     * @constructor
     */
    function Instance(/*String[]*/ids, /*Instance[]*/children, /*function*/factory, /*Object*/parameters, parentElement, parentInstance) {
        this.__p = [
            ids /* array of marked elements*/,
            parameters /* instance parameters*/,
            parentInstance /*parent component instance*/,
            children /*children components*/,
            parentElement /*HTML element*/
        ];
        this.factory = factory;
    }

    /**
     * Returns reference to parameters object used in actual instance
     */
    Instance.prototype.getParameters = function () {
        return this.__p[1];
    };

    /**
     * Returns all children instances of this instance
     */
    Instance.prototype.getChildren = function () {
        return this.__p[3];
    };


    var nextId = 1;
    /**
     * Render new unique ID for HTML element and adds it configuration for the init() method
     * @param conf configuration from the HTML parser
     */
    Instance.prototype.newId = function (conf) {
        if (!conf) return null;
        if (!conf.id) conf.id = "_rid" + nextId++;
        var ids = this.__p[0];
        ids.push(conf);
        return conf.id;
    };

    /**
     * Returns the first HTML element for given binding id
     * @param id value or key of element (binding id)
     */
    Instance.prototype.getElementById = function (id) {
        return getComponentElementById(this, id);
    };

    /**
     * Returns array of elements for given binding id
     * @param id value or key of element (binding id)
     */
    Instance.prototype.getElementsById = function (id) {
        return getComponentElementsById(this, id);
    };

    /**
     * Returns parent instance of this instance
     */
    Instance.prototype.getParent = function () {
        return this.__p[2];
    };

    /**
     * Returns last item ID for web element ID
     * @param id value or key of element (binding id)
     */
    Instance.prototype.getItem = function (id) {
        return getComponentId(this, id);
    };
    /**
     * Returns all item IDs for web element ID
     * @param id value or key of element (binding id)
     */
    Instance.prototype.getItems = function (id) {
        return getComponentIds(this, id);
    };

    /**
     * Recalls beforeCreate, create and afterCreate but using the same instance
     * for repainting the component
     * @param callBack function called after recreation (null is supported)
     */
    Instance.prototype.reCreate = function (callBack) {
        var /*Instance*/instance = this;
        if (!instance.isDestroyed) {
            var parameters = instance.getParameters();
            parameters.___i = instance;
            open(instance.factory, instance, parameters, undefined, function(newInstance) {
                //newInstance == instance
                if (callBack) callBack();
            });
        }
    };

    /**
     * Sets all values from UI HTML element to parameters object
     */
    Instance.prototype.syncFromHTML = function (ignoringElement) {
        sync(this, ignoringElement, SYNC_FROM_HTML_EVENT);
    };

    /**
     * Sets all values from parameters object to UI HTML element
     */
    Instance.prototype.syncToHTML = function (ignoringElement) {
        sync(this, ignoringElement, SYNC_TO_HTML_EVENT);
    };

    /**
     * Returns child instance of this instance
     */
    Instance.prototype.getChild = function (componentName) {
        return firstInstanceOf(this, componentName);
    };

    /**
     * Returns the HTML element of this instance
     */
    Instance.prototype.getElement = function () {
        return this.__p[4];
    };

    /**
     * Destroys this instance
     */
    Instance.prototype.destroy = function () {
        return destroyComponent(this);
    };

    /**
     * Creates instance for new component
     * @param factory
     * @param parameters
     * @param parentElement
     * @param parentInstance
     * @return Instance
     */
    function createInstance(factory, parameters, parentElement, parentInstance) {

        //array for all HTML IDs used for this component
        var ids = [];
        //array of all children instances
        var children = [];

        if (typeof parameters.___i == "object") {
            var oldInstance = parameters.___i;
            delete parameters.___i;
            oldInstance.__p[0] = ids;
            oldInstance.__p[3] = children;
            return oldInstance;
        }

        var /*Instance*/ instance = new Instance(ids, children, factory, parameters, parentElement, parentInstance);

        //TODO: add this to Instance documentation
        // You can extend instance to be able to handle model listeners and
        //Listeners.createModelListener(instance);
        //Validation.createValidator(instance);

        return instance;
    }

    /**
     * Opens dynamic page
     * @param urlOrFactory name of page with path and parameters (e.g. "path/pageName?parameter1=value1&parameter2=value2")
     * @param target id of target element or HTML element (null means document.body)
     * @param customParameters parameters object (null is supported)
     * @param parentInstance parent component (null is supported)
     * @param callBack parameters object (null is supported)
     */
    function open(urlOrFactory, target, customParameters, parentInstance, callBack) {
        var parameters = typeof customParameters != "object" || !customParameters ? {} : customParameters;

        if (typeof urlOrFactory == "string") {
            //urlOrFactory is URL string

            //prepares parameters object
            var parametersIndex = urlOrFactory.indexOf("?");
            if (parametersIndex == -1) {
                parametersIndex = urlOrFactory.length;
            }

            //extracts path name and page name from "name" parameter
            var name = urlOrFactory.substr(0, parametersIndex);

            //parse parameters and add to "parameters" object
            if (parametersIndex + 2 < urlOrFactory.length) {
                var arrOfParams = urlOrFactory.substr(parametersIndex + 1).split("&");
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
                open(factory, target, parameters, parentInstance, callBack);
            });

            return;
        } else if (!urlOrFactory || typeof (urlOrFactory.create) != "function") {
            throw "Sorry, I do not know how to open '" + urlOrFactory + "' in target '" + target + "'.";
        }

        //test parentInstance and callBack for previous versions
        if (typeof parentInstance == "function") {
            var realParentComponent = callBack;
            callBack = parentInstance;
            parentInstance = realParentComponent;
        }

        //urlOrFactory is Factory function

        //1. prepare target HTML element
        var targetIsComponent;//true if "target" is some instance object for some page
        var element = target ? typeof(target) != "string" ? !(targetIsComponent = typeof(target.factory)== "function") ? target.tagName ? target : null : target.getElement() : document.getElementById(target) : document.body;
        if (!element) throw "Sorry, I can not open '"+urlOrFactory.componentName+"' in target '"+target+"'.";
        if (targetIsComponent && !parentInstance) parentInstance = target.getParent();

        //2. call listeners for opening new pages
        var listenerArguments = {
            name: urlOrFactory.componentName,
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
            var instance = urlOrFactory.create(parameters, element, parentInstance);
            var children = initializeComponent(instance);
            if (parentInstance) {
                //if this is a child of an element, add its reference to parentInstance
                parentInstance.getChildren().push(instance);
            }
            var initializedChildren = 0;

            function finishOpening() {
                //9. calls after create asynchronous methods
                if (urlOrFactory.afterCreate) urlOrFactory.afterCreate(instance);

                //10. execute callback function for open page procedure
                if (callBack) callBack(instance);

                //11. call listeners for finishing new pages
                Listeners.executeListeners("showedWebComponent", listenerArguments);
            }

            function childInitialized(child) {
                //8. call listeners for finishing one child of many children
                var childrenListenerArguments = {
                    name: urlOrFactory.componentName,
                    target: target,
                    parameters: parameters,
                    child: child
                };

                Listeners.executeListeners("showedWebComponentChild", childrenListenerArguments);

                if (++initializedChildren==children.length) finishOpening();
            }

            //7. opens children
            if (children && children.length>0) {
                for (var i = 0; i<children.length; i++) {
                    (function(child){
                        open(child.factory, child.element, child.parameters, instance, childInitialized);
                    })(children[i]);
                }
            } else {
                finishOpening();
            }

        }

        //5. calls before create asynchronous methods
        if (!urlOrFactory.beforeCreate) createInstance();
        else urlOrFactory.beforeCreate(parameters, createInstance);
    }

    /**
     * Sets class attribute on element
     * @param element HTML element
     * @param className class name
     */
    function setClass(element, className) {
        element.className = className;
    }

    /**
     * Adds CSS style to element
     * @param element HTML element
     * @param css CSS styles as string
     */
    function setStyle(element, css) {
        var style = element.style;
        var styles = css.split(';');
        for (var i = 0; i < styles.length; i++) {
            var p = styles[i].split(':');
            if (p.length == 2) {
                var name = p[0].replace(/^\s+|\s+$/g, '');
                var value = p[1].replace(/^\s+|\s+$/g, '');
                var l;
                while ((l = name.indexOf('-')) != -1) name = (l > 0 ? name.substr(0, l) : '') + ("" + name.charAt(l + 1)).toUpperCase() + name.substr(l + 2);
                style[name] = value;
            }

        }
    }

    /**
     * Sets call back function as event handler
     * @param element   HTML element
     * @param eventName event name
     * @param callBack  call back function
     */
    function setEvent(element, eventName, callBack) {
        element['on'+eventName] = callBack;
    }

    //publish some functions
    Components.open = open;
    Components.createInstance = createInstance;
    Components.setClass = setClass;
    Components.setStyle = setStyle;
    Components.setEvent = setEvent;
    Components.htmlToText = htmlToText;
    Components.textToHtml = textToHtml;

    return Components;

});