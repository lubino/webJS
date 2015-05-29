var require, requirejs, define;
(function (cache, definitions) {
    var predefinedModule, global = {}, defineCalled, paths=[''];
    window.cache = cache;
    window.definitions = definitions;

    function getModuleName(moduleName) {
        if (moduleName.charAt(0)=='.') {
            var path = paths[paths.length-1].split('/');
            path.splice(path.length-1, 1);
            path = path.concat(moduleName.split('/'));
            for (var i = 0; i < path.length; i++) {
                if (path[i] == '.') path.splice(i--, 1);
                else if (path[i] == '..') {
                    path.splice(i-1, 2);
                    i-=2;
                }
            }
            return path.join('/');
        }
        return moduleName;
    }

    /**
     * @param moduleName name of module
     * @param callBack mandatory
     */
    function loadModule(moduleName, callBack) {
        function finishLoad(result) {
            cache[moduleName] = [result];
            if (callBack) callBack();
        }
        var fileName = moduleName+".js";
        try {
            var req = new XMLHttpRequest();
            req.open('GET', fileName, !!callBack);
            // In Firefox, a JavaScript MIME type means that the script is immediately eval-ed
            req.overrideMimeType("text/plain");
            req.onreadystatechange = function(event) {
                if (req.readyState === 4 /* complete */) {
                    predefinedModule=moduleName;
                    defineCalled = false;
                    try {
                        var moduleObject = eval("(function (exports,module,global) {" + req.responseText + ";return {exports:exports,module:module}})");
                    } catch (e) {
                        throw "Error evaluating "+fileName+": " + e;
                    }
                    var e={},m = {exports:e}, result;
                    try {
                        result = moduleObject(e,m,global);
                    } catch (e) {
                        throw "Error executing "+fileName+": " + e;
                    }
                    if (defineCalled) {
                        reqModule(!callBack, definitions[moduleName][0], definitions[moduleName][1], finishLoad);
                    } else {
                        finishLoad(result.module.exports);
                    }
                }
            };
            req.send();
        } catch (e) {
            throw new Error("Could not load: "+fileName
                    + ". Possible reasons:\n"
                    + "- File does not exist\n"
                    + "- Firefox blocks XHR for local files above the current directory\n"
                    + "- Chrome blocks XHR for local files (use command line option --allow-file-access-from-files)"
            );
        }
    }

    //loads module from cache or execute "define" function to get module
    function reqModule(synch, moduleDependenciesArray, moduleFunc, callBack) {
        var values = [], i = 0, moduleName = 'not defined';

        function finishIt() {
            var result;
            if (moduleFunc) result = moduleFunc.apply(null, values);
            if (callBack) callBack(result);
        }

        function afterTick() {
            paths.pop();
            var moduleWrapper = cache[moduleName];
            if (!moduleWrapper) {
                if (console) console.error("Module '" + moduleName + "' is not loaded, you need to repair your dependencies for MF", {MF: moduleFunc, dependencies: moduleDependenciesArray});
                throw "Module '" + moduleName + "' is not loaded, you need to repair your dependencies for MF";
            }

            //add next argument for calling moduleFunc
            values.push(moduleWrapper[0]);

            if (i < moduleDependenciesArray.length) tick();
            else finishIt();
        }

        function tick() { //if moduleName is not cached already, run the definition moduleFunc and cache it
            moduleName = getModuleName(moduleDependenciesArray[i++]);
            paths.push(moduleName);
            if (!cache[moduleName]) {
                if (definitions[moduleName]) {
                    reqModule(synch, definitions[moduleName][0], definitions[moduleName][1], function (result) {
                        delete definitions[moduleName];
                        cache[moduleName] = [result];
                        afterTick();
                    });
                } else if (synch) {
                    loadModule(moduleName);
                    afterTick();
                } else {
                    loadModule(moduleName, afterTick);
                }
            } else {
                afterTick();
            }

        }

        if (moduleDependenciesArray.length>0) tick();
        else finishIt();
        //call the
        if (synch && !moduleFunc) return values[0];
    }

    //minimalistic function for "require"
    requirejs = require = function (moduleDependenciesArray, moduleFunc) {
        return reqModule(!moduleFunc, typeof moduleDependenciesArray == 'string' ? [moduleDependenciesArray] : moduleDependenciesArray, moduleFunc, null);
    };

    //minimalistic function for "define"
    define = function () {
        var name, moduleDependenciesArray, callBackFunc;
        if (arguments.length > 2) {
            name = arguments[0];
            moduleDependenciesArray = arguments[1];
            callBackFunc = arguments[2];
        } else if (arguments.length = 2) {
            name = predefinedModule;
            moduleDependenciesArray = arguments[0];
            callBackFunc = arguments[1];
        } else if (arguments.length = 1) {
            name = predefinedModule;
            moduleDependenciesArray = [];
            callBackFunc = arguments[0];
        } else {
            name = predefinedModule;
            moduleDependenciesArray = [];
            callBackFunc = null;
        }
        definitions[name] = [moduleDependenciesArray, callBackFunc];
        defineCalled = true;
    };

    require.setPath = function (path) {
        paths[0] = path;
    }
})({}, {});