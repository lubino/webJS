define(['web/accessor'], function (accessor) {

    var modules = {};

    var actualLocale = "en_US";

    function createModuleData(moduleName) {
        var moduleData = modules[moduleName];
        if (!moduleData) {
            modules[moduleName] = moduleData = {}
        }
        return moduleData;
    }

    function replaceWith(localizedModule, /*String*/ s, /*Object*/parameters) {
        var i = 0;
        while ((i= s.indexOf("${", i)+2)>1) {
            var end = s.indexOf("}", i)+1;
            if (end>i) {
                var key = s.substr(i, end - i - 2);
                var value = accessor.getValue(parameters, key);
                if (typeof value == "function") value = value();
                else if (value == null) value = localizedModule[key];
                if (!value) value = "";
                s = s.substr(0,i-2)+ value + (end<s.length ? s.substr(end) : "");
            }
        }
        return s;
    }

    function resource(moduleName, moduleData, key, parameters) {
        var localizedModule = moduleData[actualLocale];
        var resourceValue = localizedModule ? localizedModule[key] : null;
        return typeof(resourceValue) === "string" ? parameters ? replaceWith(localizedModule, resourceValue, parameters) : resourceValue : moduleName+'_'+actualLocale+'.'+key;
    }

    /**
     * returns some resource bundle
     * @param fullKey
     * @param parameters parameters object
     */
    function rb(fullKey, parameters) {
        var i = fullKey.indexOf('.');
        if (i == -1) return 'Key "'+fullKey+'" without name!';
        var moduleName = fullKey.substr(0, i);
        var key = fullKey.substr(i + 1);
        return resource(moduleName, createModuleData(moduleName), key, parameters);
    }

    /**
     * returns some resource bundle
     * @param fullKey resource bundle fullKey
     * @param parameters parameters object
     * @param callBack function for result
     */
    function rbCall(fullKey, parameters, callBack) {
        var i = fullKey.indexOf('.');
        if (i == -1) throw 'Key "'+fullKey+'" without name!';
        var moduleName = fullKey.substr(0, i);
        var key = fullKey.substr(i + 1);
        var moduleData = modules[moduleName];
        if (moduleData && moduleData[actualLocale]) {
            callBack(resource(moduleName, moduleData, key, parameters));
        } else {
            require([moduleName], function (getter) {
                callBack(getter(key));
            })
        }
    }

    /**
     * Returns resource object (key-value format) for module name in actual locale
     * @param moduleName name of module
     * @returns {*} resource object
     */
    function resourcesForModule(moduleName) {
        var moduleData = modules[moduleName];
        if (!moduleData) return null;
        return moduleData[actualLocale];
    }

    /**
     * Sets resource object for module name and locale
     * @param moduleName
     * @param locale
     * @param localizedModule
     */
    function setResourceModule(moduleName, locale, localizedModule) {
        var moduleData = createModuleData(moduleName);
        moduleData[locale] = localizedModule;
    }

    /**
     * Creates getter for some module (getter accepts only keys from property file)
     * @param moduleName name of module
     * @return {Function} getter(key) = localized string from resource bundle
     */
    function getterFor(moduleName) {
        var moduleData = createModuleData(moduleName);

        /**
         * Returns a specific resource for given key in actual locale
         * @param key key of resource
         * @param parameters values object for replacing ${...} keywords
         * @returns resource
         */
        function getResource(key, parameters) {
            return resource(moduleName, moduleData, key, parameters);
        }

        /**
         * Returns all resources for actual locale represented by resource object
         * @returns {*} resource object
         */
        function getResources() {
            return moduleData[actualLocale];
        }

        getResource.getResources = getResources;
        return getResource;
    }

    /**
     * Sets actual locale
     * @param locale actual locale e.g. "en_US"
     */
    function setLocale(locale) {
        if (locale == null || /^\w+$/.test(locale)) throw "Unsupported locale '"+locale+"'";
        actualLocale = locale;
    }

    /**
     * Returns actual locale
     * @return {String} actual locale
     */
    function getLocale() {
        return actualLocale;
    }

    /**
     * Validates and returns locales as array
     * @return {String[]} array of validated locales
     */
    function locales(/*... locales ...*/) {
        var result = [];
        for(var i=0; i<arguments.length; i++) {
            var locale = arguments[i];
            var localeArr = locale > "" ? locale.split('_') : [], language = localeArr[0], country = localeArr[1];
            if (localeArr.length != 2 || (language.length != 2 && language != 'lat') || language != language.toLowerCase() || country.length != 2 || country != country.toUpperCase()) {
                throw "Sorry, '"+locale+"' can not be used as regular locale. Use format 'language_COUNTRY'.";
            }
            result.push(locale);

        }
        return result;
    }

    return {
        rb: rb,
        rbCall: rbCall,
        r: resource,
        setResourceModule: setResourceModule,
        resourcesForModule: resourcesForModule,
        locales: locales,
        getterFor: getterFor,
        setLocale: setLocale,
        getLocale: getLocale,
        author: "Lubos Strapko (https://github.com/lubino)"
    };
});