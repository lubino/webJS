define([], function () {

    var modules = {};

    var actualLocale = "en_US";

    function createModuleData(moduleName) {
        var moduleData = modules[moduleName];
        if (!moduleData) {
            modules[moduleName] = moduleData = {}
        }
        return moduleData;
    }

    function resource(moduleName, moduleData, key) {
        var localizedModule = moduleData[actualLocale];
        var resourceValue = localizedModule ? localizedModule[key] : null;
        return typeof(resourceValue) === "string" ? resourceValue : moduleName+'_'+actualLocale+'.'+key;
    }

    /**
     * returns some resource bundle
     * @param fullKey
     */
    function rb(fullKey) {
        var i = fullKey.indexOf('.');
        if (i == -1) return 'Key "'+fullKey+'" without name!';
        var moduleName = fullKey.substr(0, i);
        var key = fullKey.substr(i + 1);
        return resource(moduleName, createModuleData(moduleName), key);
    }

    /**
     * returns some resource bundle
     * @param fullKey resource bundle fullKey
     * @param callBack function for result
     */
    function rbCall(fullKey, callBack) {
        var i = fullKey.indexOf('.');
        if (i == -1) throw 'Key "'+fullKey+'" without name!';
        var moduleName = fullKey.substr(0, i);
        var key = fullKey.substr(i + 1);
        var moduleData = modules[moduleName];
        if (moduleData && moduleData[actualLocale]) {
            callBack(resource(moduleName, moduleData, key));
        } else {
            require([moduleName], function (getter) {
                callBack(getter(key));
            })
        }
    }

    function setResourceModule(moduleName, locale, localizedModule) {
        var moduleData = createModuleData(moduleName);
        moduleData[locale] = localizedModule;
    }

    /**
     * Creates getter for some module (getter accepts only keys from property file)
     * @param moduleName
     * @return {Function} getter(key) = localized string from resource bundle
     */
    function getterFor(moduleName) {
        var moduleData = createModuleData(moduleName);
        return function(key) {
            return resource(moduleName, moduleData, key);
        }
    }

    /**
     * Sets actual locale
     * @param locale actula locale e.g. "en_US"
     */
    function setLocale(locale) {
        actualLocale = locale;
    }


    return {
        rb: rb,
        rbCall: rbCall,
        r: resource,
        setResourceModule: setResourceModule,
        getterFor: getterFor,
        setLocale: setLocale,
        author: "Lubos Strapko (https://github.com/lubino)"
    };
});