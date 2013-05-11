define(['compiler/Strings'], function (Strings) {

    var runConfig;
    var localization;
    var localizationName;

    var localizationFrame =
        "    ${resource}(${jsName}, ${jsLocale}, {\n" +
        "      ${keys}\n" +
        "    });\n";
    var localizationFinish =
        "  function (${dependencies}) {\n" +
        "${frames}\n" +
        "  return ${localization}.getterFor(${jsName});\n"+
        "  }";

    /**
     * Converts resource bundle properties to JS object
     *
     * @param name resource bundle name
     * @param input   input stream of resource bundle properties
     * @param dependencies dependencies map
     * @param cs   ConsoleStack
     * @param runParameters defaults
     */
    function parseProperties(/*String*/ name, /*InputStream*/ input, /*DependenciesMapper*/dependencies, /*ConsoleStack*/ cs, runParameters) {
        runConfig = runParameters;
        if (cs) cs.startItem(name, 2);

        var /*int*/ i;
        var /*String*/ line = "";
        var /*String*/ locale = "";
        if ((i = name.indexOf('_')) != -1) {
            locale = name.substring(i + 1);
            name = name.substring(0, i);
        }

        var parameters = {
            resource: runConfig.resource,
            jsLocale: Strings.toJSString(locale),
            jsName: Strings.toJSString(name),
            keys: ""
        };

        localization = "Resources";
        localizationName = runConfig.webDir + localization;

        dependencies.init(null);
        dependencies.put(localizationName, localization);

        var isNotFirst = false;
        var c = ' ';
        while (c != '') {
            c = input.read();
            if (c == '' || c == '\n') {
                line = Strings.trim(line);
                if (Strings.startsWith(line, '#')) {
                    if (parameters.keys > "") parameters.keys += "\n      ";
                    parameters.keys += "//" + line.substr(1) + "\n      ";
                    line = "";
                }
                var /*boolean*/ doIt = line.length > 0;
                var /*int*/ lastCharacter = line.length - 1;
                if (doIt && line.charAt(lastCharacter) == '\\') {
                    line = line.substring(0, lastCharacter);
                    doIt = c == '';
                }
                if (doIt) {
                    var /*int*/ eq = line.indexOf('=');
                    if (eq == -1) {
                        if (cs) cs.addError("Property '" + line + "' does not contain '=' symbol");
                    } else {
                        var /*String*/ key = Strings.trim(line.substring(0, eq));
                        var /*String*/ value = Strings.trim(line.substring(eq + 1));
                        var useQuotes = Strings.toJSName(key) == key;
                        if (isNotFirst) parameters.keys += ',';
                        else isNotFirst = true;
                        if (parameters.keys > "") parameters.keys += "\n      ";
                        parameters.keys += useQuotes ? Strings.toJSString(key) : key;
                        parameters.keys += ': ' + Strings.toJSString(value);
                    }
                    line = "";
                }
                if (c == '') break;
            } else if (c >= ' ') {
                line += c;
            }
        }

        return Strings.replaceWith(localizationFrame, parameters);
    }


    /**
     * Creates function around Resources properties from function parseResource
     * @param name name of module
     * @param input rendered JS from parseResource function
     * @param dependencies dependencies Map
     * @return {string}
     */
    function finishProperties(/*String*/ name, /*String*/ input, /*DependenciesMapper*/dependencies) {
        var i;
        if ((i = name.indexOf('_')) != -1) {
            name = name.substring(0, i);
        }

        var parameters = {
            dependencies: dependencies.variables().join(", "),
            jsName: Strings.toJSString(name),
            localization: localization,
            frames: input
        };

        return Strings.replaceWith(localizationFinish, parameters);
    }

    function doRequireModule(/*String*/js, /*DependenciesMapper*/ dependencies) {
        var requires = [], modules = dependencies.modules();
        for (var di = 0; di < modules.length; di++) {
            requires.push(Strings.toJSString(modules[di]));
        }
        return "define([" + requires.join(", ") + "],\n  " + js + ");";
    }

    return {
        parseProperties: parseProperties,
        finishProperties: finishProperties,
        doRequireModule: doRequireModule,
        author: "Lubos Strapko (https://github.com/lubino)"
    }

});