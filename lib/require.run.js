var require, define;
(function (cache, definitions) {

    //loads module from cache or execute "define" function to get module
    function reqModule(moduleDependenciesArray, callBackFunc) {
        var values = [], i = 0, module = 'not defined';
        try {
            while (i < moduleDependenciesArray.length) {
                //if module is not cached already, run the definition callBackFunc and cache it
                if (!cache[module = moduleDependenciesArray[i++]]) cache[module] = [reqModule(definitions[module][0], definitions[module][1])];

                //add next argument for calling callBackFunc
                values.push(cache[module][0]);
            }
        } catch (e) {
            throw {message: "Module '"+module+"' is not loaded, you need to repair your dependencies for MF", error: e, MF: callBackFunc, dependencies: moduleDependenciesArray};
        }

        //call the
        return callBackFunc.apply(null, values);
    }

    function pipe(a) {
        return a
    }

    //minimalistic function for "require"
    require = function (moduleDependenciesArray, callBackFunc) {
        return reqModule(typeof moduleDependenciesArray == 'string' ? [moduleDependenciesArray] : moduleDependenciesArray, callBackFunc ? callBackFunc : pipe);
    };

    //minimalistic function for "define"
    define = function (name, moduleDependenciesArray, callBackFunc) {
        definitions[name] = [moduleDependenciesArray, callBackFunc]
    };
})({}, {});