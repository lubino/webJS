define(['web/accessor'], function (accessor) {
    var Validation = {
        log: function (message, object) {
            if (window.console) console.log(message, object);
        },
        author: "Lubos Strapko"
    };

    /**
     * Adds or removes validation message from HTML element
     * @param instance instance object
     * @param id value or key of element (binding id)
     * @param hint object containing title and id (object is null if there is no validation message)
     */
    function elementHint(instance, id, hint) {
        var elements = instance.getElementsById(id),
            j = elements.length;
        for (var i = 0; i < j; i++) {
            var element = elements[i];
            element.style['backgroundColor'] = hint ? "#ffff88" : "white";
            element.setAttribute("alt", hint ? hint.title : "");
        }
    }

    /**
     * addComponentValidator: some instance needed parameters validators
     * @param instance component instance
     * @param key parameters key
     * @param parameters parameters model reference
     * @param validator validator function (value, hints) where exists hints.add(title, key)
     * @param elementHint function for highlight HTML element
     * @param onValidate validation call back function
     */
    function addValueValidator(instance, key, parameters, validator, elementHint, onValidate) {
        var hintsWrapper = {
            _a:null,
            _c:null,
            _h:{},
            _hints:{},
            add:function (title, keyPart) {
                var hint = {title:title, id:key + (keyPart > "" ? "." + keyPart : "")};
                this._a.push(hint);
                elementHint(instance, hint.id, hint);
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
                        if (!this._c[i]) elementHint(instance, i, null);
                        hints[i] = h[i] = undefined;
                    } else if (h[i] == 2) {
                        h[i] = 1;
                        this._c[i] = true;
                    } else {
                        hints[i] = undefined;
                    }
                }
                if (this._c.count-- == 1) {
                    if (onValidate) onValidate(instance, this._a);
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
            if (changedKey && changedKey.indexOf(key) != 0) {
                hintsWrapper._addAllHinted(hints);
                if (cache.count-- == 1) {
                    if (onValidate) onValidate(instance, hints);
                    if (cache.c) cache.c(hints);
                    instance._validatorRuns = false;
                }
                return;
            }
            hintsWrapper._a = hints;
            hintsWrapper._c = cache;
            validator(accessor.getValue(parameters, key), hintsWrapper);
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
    }

    /**
     * Adds some validation functions to object
     * @param object object for enabling validation functions
     * @param parameters parameters (model) object
     */
    function createValidator(object, parameters) {
        var _elementHint = elementHint,
            _onValidate = null,
            factory;

        //Is the object an instance of Component?
        if (typeof object.getParameters == "function" && typeof (factory = object.factory) == "function") {
            //Override hinting and validation call backs
            if (!parameters) parameters = object.getParameters();
            if (factory.elementHint) _elementHint = factory.elementHint;
            if (factory.onValidate) _onValidate = factory.onValidate;
        }

        /**
         * Adds validator for model
         * @param key
         * @param validator
         */
        object.addValidator = function (key, validator) {
            addValueValidator(object, key, parameters, validator, _elementHint, _onValidate);
        }
    }


    //publish some functions
    Validation.createValidator = createValidator;

    return Validation;

});