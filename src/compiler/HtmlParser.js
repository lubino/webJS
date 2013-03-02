define(['compiler/Strings', 'compiler/Tag', 'compiler/ParsedText'], function (Strings, Tag, ParsedText) {

    var runConfig;
    var componentsName;

    function HtmlParser(/*String*/name, /*DependenciesMapper*/dependencies, runParameters) {

        runConfig = runParameters;

        var result =
            "  function(${dependencies}) { \n" +
            "    //--------- start of head tag --------- \n" +
            "    ${head}\n" +
            "    //--------- end of head tag --------- \n" +
            "\n" +
            "    //--------- start of body tag --------- \n" +
            "    /**\n" +
            "     * Opens component '${name}'\n" +
            "     * @param target name of ID or element where to open\n" +
            "     * @param customParameters parameters for component\n" +
            "     * @param callBack call back function\n" +
            "     */\n" +
            "    function ${constructorName}(target, customParameters, callBack) {\n" +
            "       ${components}.open(${constructorName}, target, customParameters, callBack);\n" +
            "    }\n" +
            "\n" +
            "    /**\n" +
            "     * Creates instance of '${name}' component and renders HTML content for it.\n" +
            "     * @param parameters global reference for all data\n" +
            "     * @param body reference to HTML element\n" +
            "     * @return new instance of '${name}' component\n" +
            "     */\n" +
            "    function create(parameters, body) {\n" +
            "       var instance = ${createInstance}(${constructorName}, parameters, body),html;\n" +
            "       html = '${html}';\n" +
            "       body.innerHTML = html;\n" +
            "       //CSS section:${css}\n" +
            "       //onLoad section:${onLoad}\n" +
            "       //title section:${title}\n" +
            "       return instance;\n" +
            "    }\n" +
            "    //--------- end of body tag --------- \n" +
            "\n" +
            "    //--------- factory configuration --------- \n" +
            "    ${hasBeforeCreate}${constructorName}.beforeCreate = beforeCreate;\n" +
            "    ${constructorName}.create = create;\n" +
            "    ${hasAfterCreate}${constructorName}.afterCreate = afterCreate;\n" +
            "    ${constructorName}.componentName = ${jsName};\n" +
            "  return ${constructorName};\n" +
            "  }";

        var parameters = {
            dependencies: "",
            head: "",
            name: name,
            jsName: Strings.toJSString(name),
            constructorName: Strings.toJSName(name),
            createInstance: runConfig.createInstance,
            html: "",
            onLoad: "",
            css: "",
            title: "",
            hasBeforeCreate: "//",
            hasAfterCreate: "//",
            components: "Components"
        };
        componentsName = runConfig.webDir + parameters.components;

        dependencies.init(jsNameGetter);
        dependencies.put(name, parameters.constructorName);
        dependencies.put(componentsName, parameters.components);

        var config = {
            inHead: false,
            inTitle: false,
            inTag: false,
            inScript: false,
            inJS: false,
            inJSString: false
        };
        this.parsingTag = function () {
            config.inTag = true;
            console.log("starting TAG")
        };

        this.parsingSpecial = function (type) {
            console.log("SPECIALIZING" + type)
        };

        this.parseSpecial = function (value, type) {
            //TODO export this to outside function
            var v = value.$c[0];
            if (type == '@') {
                var iO = v.indexOf('.');
                var moduleName = v.substr(0, iO);
                var key = v.substr(iO + 1);
                value.$c[0] = {
                    toJS: function () {
                        return dependencies.get(moduleName) + '("' + key + '")';
                    },
                    toDirectJS: function () {
                        return "' + " + dependencies.get(moduleName) + '("' + key + '")' + " + '";
                    }
                }
            } else {
                value.$c[0] = {
                    toJS: function () {
                        return v;
                    },
                    toDirectJS: function () {
                        return "' + " + v + " + '";
                    }
                }
            }
            console.log("SPECIAL" + type, [v], value.toJS());
            return value;
        };

        this.parseText = function (/*ParsedText*/ text) {
            console.log("TEXT", text.toJS(), text.$c, config.inTitle);
            if (config.inTitle) {
                parameters.title = "\n       instance.title = " + text.toJS() + ";";
            } else if (config.inBody) {
                if (config.inScript) {
                    parameters.html += parseJS(text);
                } else {
                    if (parameters.html > "") parameters.html += " +\n         ";
                    parameters.html += text.toJS();
                }
            } else if (config.inHead) {
                if (config.inScript) {
                    parameters.head += parseJS(text);
                }
            }
        };

        this.parseTag = function (/*String*/tagName, /*Map*/attributes) {
            var att = [];
            var k = attributes.keys();
            for (var l = 0; l < k.length; l++) {
                var newVar = attributes.get(k[l]);
                att.push(k[l] + '="' + (typeof newVar == "object" && newVar ? newVar.toJS() : newVar) + '"')
            }

            console.log("TAG '" + tagName + "'", att.join(' '), attributes.values());

            if (tagName == '/body') {
                config.inBody = false;
            }

            if (config.inBody) {
                if (tagName == 'script') {
                    //todo end HTML
                    if (parameters.html > "") parameters.html += ";\n\n       ";
                } else if (tagName == '/script') {
                    //todo end HTML
                    if (parameters.html > "") parameters.html += "\n       html = html";
                } else {
                    if (parameters.html > "") parameters.html += " +\n         ";
                    parameters.html += "'<" + tagName + attributesToJS(attributes) + ">'";
                }
            }

            if (tagName == 'head') {
                config.inHead = true;
            } else if (tagName == 'title') {
                config.inTitle = config.inHead;
            } else if (tagName == '/title') {
                config.inTitle = false;
            } else if (tagName == '/head') {
                config.inHead = false;
                config.inTitle = false;
            } else if (tagName == 'body') {
                config.inBody = true;
                fillOnLoad(dependencies, parameters, attributes);
            } else if (tagName == 'script') {
                config.inScript = true;
            } else if (tagName == '/script') {
                config.inScript = false;
            }
            config.inTag = false;
        };

        this.finish = function () {
            parameters.html = Strings.trimOne(parameters.html);
            parameters.dependencies = dependencies.variables().slice(1).join(", ");
        };

        this.toString = function () {
            return Strings.replaceWith(result, parameters);
        };

        this.name = name;

    }

    HtmlParser.prototype.parse = function (/*InputStream*/ input, /*ConsoleStack*/ cs) {
        parse(this, input, cs);
        this.finish();
        return this.toString();
    };

    function jsNameGetter(s) {
        return "_" + Strings.toJSName(s);
    }


    function fillOnLoad(dependencies, parameters, attributes) {
        if (attributes.containsKey("class")) {
            parameters.css += "\n       " + dependencies.get(componentsName) + ".setClass(body, " +
                attributes.get("class").toJS() + ");";
        }
        if (attributes.containsKey("style")) {
            parameters.css += "\n       " + dependencies.get(componentsName) + ".setStyle(body, " +
                attributes.get("style").toJS() + ");";
        }
        var keys = attributes.keys(), kl = keys.length;
        while (kl-- > 0) if (keys[kl] != "onload" && Strings.startsWith(keys[kl], "on")) {
            parameters.onLoad += "\n       " + dependencies.get(componentsName) + ".setEvent(body, " +
                Strings.toJSString(keys[kl].substr(2)) + ", function (event) {\n         "
                + Strings.addSemicolon(attributes.get(keys[kl]).toJS()) + "\n       });";
        }
        if (attributes.containsKey("onload")) {
            parameters.onLoad += "\n       " + Strings.addSemicolon(attributes.get("onload").toDirectJS());
        }
    }

    function parseJS(/*ParsedText*/ text) {
        //TODO do some JS parsing there with some controls
        return text.toDirectJS();
    }

    function attributesToJS(/*Map*/ attributes) {
        var result = "";
        var k = attributes.keys();
        for (var l = 0; l < k.length; l++) {
            var value = attributes.get(k[l]);
            result += " " + k[l];
            if (value) {
                result += '="' + Strings.trimOne(value.toJS()) + '"';
            }
        }
        return result;
    }

    function parse(/*HtmlParser*/parser, /*InputStream*/ input, /*ConsoleStack*/ cs) {
        if (cs) cs.startItem(parser.name, 1);
        var c, last = '', isStript = false;

        //noinspection JSValidateTypes
        var /*ParsedText*/text = new ParsedText();

        while (c = input.read()) {
            if (c == '<' && (!isStript || isInputOnEndOfScriptTag(input))) {
                //parse old text
                if (!text.empty()) parser.parseText(text);
                text.clear();
                //start parsing tag
                var tagName = Tag.parseTagWithAttributes(input, parser, cs);
                isStript = tagName == "script";
                last = '';
            } else if (Tag.isSpecialSymbol(last, c)) {
                parser.parsingSpecial(last);
                text.removeLastChar();
                text.addSpecial(parser.parseSpecial(Tag.readSpecialTag(input, parser), last));
            } else {
                text.addChar(c);
                last = c;
            }
        }
        if (text) parser.parseText(text);
    }

    function isInputOnEndOfScriptTag(input) {
        var start = input.getPosition();
        return input.cutString(start, start+8).toLowerCase()=="</script";
    }

    function doRequireModule(/*String*/js, /*DependenciesMapper*/ dependencies) {
        var requires = [], modules = dependencies.modules().slice(1);
        for (var di = 0; di < modules.length; di++) {
            requires.push(Strings.toJSString(modules[di]));
        }
        return "define([" + requires.join(", ") + "],\n  " + js + ");";
    }

    HtmlParser.doRequireModule = doRequireModule;

    return HtmlParser;
});