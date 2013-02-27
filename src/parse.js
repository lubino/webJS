define(['compiler/compile', 'compiler/ConsoleStack'], function (compile, ConsoleStack) {

    function log(a, b) {
        if (typeof window != "undefined" && window.console) console.log(a, b);
    }

    function loadAndParse(url, out, cs, runParameters) {
        var content = "";
        var loaded = false;
        var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && (xmlhttp.status == 200 || xmlhttp.status == 0)) {
                content = xmlhttp.responseText;
                loaded = true;
            }
        };
        xmlhttp.open("GET", url, false);
        xmlhttp.send();
        if (!loaded) throw "Can't load file '"+url+"'";

        return compile.file(url, compile.createImport(content), out, cs, runParameters);
    }

    function parse(url, locales, Components, Localization) {
        var runParameters = {};
        runParameters.createComponentInstance = "Components.createComponentInstance";
        runParameters.factory = "Components.registerComponentFactory";
        runParameters.safeValue = "Components._sV";
        runParameters.resource = "Localization.setResourceModule";
        runParameters.resourceBundle = "Localization.rb";

        var cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});

        var out = compile.createOutputStream();

        var type;
        if (locales && locales.length >0) {
            var index = url.lastIndexOf('.');
            var start = url.substr(0, index);
            var end = url.substr(index);
            for (var i=0;i<locales.length;i++) {
                type = loadAndParse(start+"_"+locales[i]+end, out, cs, runParameters);
            }
            eval(out.toString());
        } else {
            type = loadAndParse(url, out, cs, runParameters);
            eval(out.toString());
        }

        var name = url.substr(0, url.lastIndexOf('.'));
        if (type == 1) {
            return function (target, customParameters, callBack) {
                Components.openPage(name, target, customParameters, callBack);
            };
        } else if (type == 2) {
            return function (key) {
                return Localization.rb(name + '.' + key);
            }
        }
    }

    return parse;
});