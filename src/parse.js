define(['compiler/Build', 'compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/ConsoleStack', 'compiler/Map', 'compiler/InputStream', 'compiler/DependenciesMapper', 'compiler/Strings'], function (compile, HtmlParser, PropertiesParser, ConsoleStack, Map, InputStream, DependenciesMapper, Strings) {
    var runParameters = compile.defaultConfig();

    function log(a, b) {
        if (typeof window != "undefined" && window.console) console.log(a, b);
    }

    /**
     * Loads file using AJAX request
     * @param url url of file
     * @return InputStream
     */
    function load(url) {
        var content = "";
        var loaded = false;
        var ajax = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4 && (ajax.status == 200 || ajax.status == 0)) {
                content = ajax.responseText;
                loaded = true;
            }
        };
        ajax.open("GET", url, false);
        ajax.send();

        if (!loaded) throw "Can't load file '"+url+"'";

        //noinspection JSValidateTypes
        return new InputStream(content);
    }

    function execute(name, js, /*DependenciesMapper*/dependencies, type, /*ConsoleStack*/ cs) {
        try {
            if (window.console) console.log("Executing "+name+" of type "+type);
            if (type == 1 || type == 2) {
                var requires = [], modules = dependencies.modules();
                if (type==1) modules = modules.slice(1);
                for (var i=0;i<modules.length;i++) {
                    requires.push("require("+Strings.toJSString(modules[i])+")");
                }
                js = "("+js+")("+requires.join(', ')+")";
                cs.end(true);
                return eval(js);
            }
            return null;
        } catch (e) {
            if (window.console) {
                console.log("Error executing "+name, e);
                console.log("Error executing "+name, js);
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


    function parse(url, locales) {

        //noinspection JSValidateTypes
        var /*ConsoleStack*/ cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});

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
                    out += PropertiesParser.parseProperties(nameWithLocale, load(nameWithLocale+extension), dependencies, cs, runParameters);
                }
                out = PropertiesParser.finishProperties(nameWithLocale, out, dependencies);
            } else {
                throw "Can't parse property file without locales parameter, use parse('"+url+"', [...])";
            }
        } else if (type == 1) {
            //noinspection JSValidateTypes
            var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
            out = parser.parse(load(name+extension), cs);
        } else {
            throw "This kind of file '"+url+"' is not supported, wrong extension.";
        }
        return execute(name, out, dependencies, type, cs);
    }

    parse.toString = function (fileName, value) {
        /*ConsoleStack*/ cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});
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
            cs.end(true);
        } catch (e) {
            result += "\n\n\n/* \n\n"+e+"\n\n*/\n\n";
            log("Exception:", e);
        }
        return result;
    };
    
    parse.setConfig = setConfig;

    return parse;
});