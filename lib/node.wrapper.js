var requirejs, define;
(function (cache) {

    //loads module from cache or execute "define" function to get module
    function reqModule(moduleDependenciesArray, callBackFunc) {
        var values = [], i = 0, module = 'not defined';
        try {
            while (i < moduleDependenciesArray.length) {
                //add next argument for calling callBackFunc
                values.push(cache[module=moduleDependenciesArray[i++]]);
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
    requirejs = function (moduleDependenciesArray, callBackFunc) {
        return reqModule(typeof moduleDependenciesArray == 'string' ? [moduleDependenciesArray] : moduleDependenciesArray, callBackFunc ? callBackFunc : pipe);
    };

    //minimalistic function for "define"
    define = function (module, moduleDependenciesArray, callBackFunc) {
        cache[module] = reqModule(moduleDependenciesArray, callBackFunc);
    };
})({});

/*REQUIRE_BUILD*/

module.exports = requirejs('webjs-express');
