define(['compiler/Build', 'compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/ConsoleStack', 'compiler/Map', 'compiler/InputStream', 'compiler/DependenciesMapper', 'compiler/Strings'], function (compile, HtmlParser, PropertiesParser, ConsoleStack, Map, InputStream, DependenciesMapper, Strings) {
    var runParameters = compile.defaultConfig();

    function log(a, b) {
        if (typeof window != "undefined" && window.console) console.log(a, b);
    }

    /**
     * Loads file using AJAX request
     * @param url url of file
     * @param callBack callBack or null for synchronous load
     * @return InputStream
     */
    function load(url, callBack) {
        var content = "";
        var loaded = false;
        var ajax = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        ajax.onreadystatechange = function () {
            if (!loaded && ajax.readyState == 4 && (ajax.status == 200 || (ajax.responseText && ajax.status == 0))) {
                loaded = !!ajax.responseText;
                if (callBack) {
                    callBack(new InputStream(ajax.responseText));
                } else {
                    content = ajax.responseText;
                }
            }
        };
        ajax.open("GET", url, !!callBack);
        ajax.send();

        if (!callBack && !loaded) throw "Can't load file '"+url+"'";

        //noinspection JSValidateTypes
        return callBack ? null : new InputStream(content);
    }

    function execute(name, js, /*DependenciesMapper*/dependencies, type, /*ConsoleStack*/ cs) {
        try {
            if (window.console) console.log("Executing " + name + " of type " + type);

            var requires = [], modules = dependencies.modules(),i;
            if (type == 1) modules = modules.slice(1);

            if (type == 1 || type == 2) {
                for (i = 0; i < modules.length; i++) {
                    requires.push("require(" + Strings.toJSString(modules[i]) + ")");
                }
                js = "(" + js + ")(" + requires.join(', ') + ")";
            } else {
                return null;
            }
            cs.end(true);
            return eval(js);
        } catch (e) {
            if (window.console) {
                console.log("Error executing "+name, e, js);
            }
            throw e;
        }

    }

    function setConfig(config) {
        if (config) {
            if (config.webDir) runParameters.webDir = config.webDir;
            if (config.createInstance) runParameters.createInstance = config.createInstance;
            if (config.safeValue) runParameters.safeValue = config.safeValue;
            if (config.resource) runParameters.resource = config.resource;
            if (config.webDir) runParameters.webDir = config.webDir;
        }
    }


    /**
     * Parses HTML or PROPERTIES file and returns webJS component module for it
     * @param url HTML or PROPERTIES file
     * @param locales in case of PROPERTIES file parameter locales defines all locales to parse
     * @returns webJS component factory function
     */
    function parse(url, locales) {

        //noinspection JSValidateTypes
        var /*ConsoleStack*/ cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});
        cs.start();

        var out = "";
        //noinspection JSValidateTypes
        var /*DependenciesMapper*/dependencies = new DependenciesMapper();

        var type = compile.parseType(url);
        var index = url.lastIndexOf('.');
        var name = url.substr(0, index);
        var extension = url.substr(index);
        if (type == 2) {
            if (locales && locales.length >0) {
                for (var i=0;i<locales.length;i++) {
                    var nameWithLocale = name+"_"+locales[i];
                    out += PropertiesParser.parseProperties(nameWithLocale, load(nameWithLocale+extension, null), dependencies, cs, runParameters);
                }
                out = PropertiesParser.finishProperties(nameWithLocale, out, dependencies);
            } else {
                throw "Can't parse property file without locales parameter, use parse('"+url+"', [...])";
            }
        } else if (type == 1) {
            //noinspection JSValidateTypes
            var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
            out = parser.parse(load(name+extension, null), cs);
        } else {
            throw "This kind of file '"+url+"' is not supported, wrong extension.";
        }
        return execute(name, out, dependencies, type, cs);
    }

    parse.toString = function (fileName, value,/*ConsoleStack*/cs) {
        var loadCS = !cs;
        if (loadCS) {
            cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});
            cs.start();
        }
        var result = "";
        try {
            //noinspection JSValidateTypes
            var /*DependenciesMapper*/ dependencies = new DependenciesMapper();
            var type = compile.parseType(fileName);
            var index = fileName.lastIndexOf('.');
            var name = fileName.substr(0, index);
            var extension = fileName.substr(index);

            //noinspection JSValidateTypes
            var /*InputStream*/ input = new InputStream(value);
            if (type == 1) {
                //noinspection JSValidateTypes
                var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
                result = parser.parse(input, cs);
                result = HtmlParser.doRequireModule(result, dependencies);
            } else if (type == 2) {
                result = PropertiesParser.parseProperties(name, input, dependencies, cs, runParameters);
                result = PropertiesParser.finishProperties(name, result, dependencies);
                result = PropertiesParser.doRequireModule(result, dependencies);
            } else {
                throw "This kind of file '"+fileName+"' is not supported, wrong extension.";
            }
            if (loadCS) cs.end(true);
        } catch (e) {
            cs.addError(e);
            result += "\n\n\n/* \n\n"+e+"\n\n*/\n\n";
        }
        return result;
    };
    
    parse.setConfig = setConfig;

    return parse;
});