define(['compiler/Strings', 'compiler/Tag', 'compiler/ParsedText', 'compiler/Map', 'compiler/JSFunctions', 'compiler/beautify'], function (Strings, Tag, ParsedText, Map, JSFunctions, js_beautify) {

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
            "     * @param target name of ID or element where to open (or null)\n" +
            "     * @param customParameters parameters for component(or null)\n" +
            "     * @param parentInstance instance of parent component (or null)\n" +
            "     * @param callBack call back function\n" +
            "     */\n" +
            "    function ${constructorName}(target, customParameters, parentInstance, callBack) {\n" +
            "       ${components}.open(${constructorName}, target, customParameters, parentInstance, callBack);\n" +
            "    }\n" +
            "\n" +
            "    /**\n" +
            "     * Creates instance of '${name}' component and renders HTML content for it.\n" +
            "     * @param parameters global reference for all data\n" +
            "     * @param body reference to HTML element (or null)\n" +
            "     * @param parentInstance reference to instance of parent component for this child (or null)\n" +
            "     * @return new instance of '${name}' component\n" +
            "     */\n" +
            "    function create(parameters, body, parentInstance) {\n" +
            "       var instance = ${createInstance}(${constructorName}, parameters, body, parentInstance), html='';\n" +
            "       ${html}\n" +
            "       body.innerHTML = html;" +
            "       ${css}" +
            "       ${title}" +
            "       ${onLoad}\n" +
            "       return instance;\n" +
            "    }\n" +
            "    //--------- end of body tag --------- \n" +
            "\n" +
            "    //--------- factory configuration --------- \n" +
            "    ${hasBeforeCreate}${constructorName}.beforeCreate = beforeCreate;\n" +
            "    ${constructorName}.create = create;\n" +
            "    ${hasAfterCreate}${constructorName}.afterCreate = afterCreate;\n" +
            "    ${hasOnDestroy}${constructorName}.onDestroy = onDestroy;\n" +
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
            onLoad: "",
            css: "",
            hasBeforeCreate: "//",
            hasAfterCreate: "//",
            hasOnDestroy: "//",
            components: "Components"
        };

        var lineSplitter = "\n         ";
        var END_PARSED_JS = new ParsedJS(ctxJs,"",ctxJs, null);
        var html = new ParsedJS(ctxJsEmpty, "", ctxJs, {nl:lineSplitter,v:"html += "});
        var title = new ParsedJS(ctxJsEmpty, "", ctxJs, {nl:lineSplitter,v:"instance.title = "});

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
//            console.log("starting TAG")
        };

        this.parsingSpecial = function (type) {
//            console.log("SPECIALIZING" + type)
        };

        this.parseSpecial = function (value, type) {
            if (type == '@') {
                var iO, valuesIndex,
                     v = value.$c[0];
                if (typeof v != "string" || (valuesIndex=v.indexOf(':')+1)==1 || (iO = v.indexOf('.', valuesIndex))<valuesIndex+1) {
                    throw "Sorry, special tag '@{valuesObject:fileName.propertyName}' must have constant fileName (not variable). The valuesObject is not mandatory, but also must have constant name."+iO;
                }
                var values = valuesIndex ? v.substr(0, valuesIndex-1) : null,
                    moduleName = v.substr(valuesIndex, iO),
                    key = iO+2<v.length ? v.substr(iO + 1) : "",
                    result = new ParsedJS(ctxJsValue, dependencies.get(moduleName) + "(", ctxJsEmpty, null);
                if (key>"") {
                    if (values) {
                        result.add(key);
                        result.add(new ParsedJS(ctxJsEmpty, ","+values, ctxJsValue, null));
                    } else result.add(key);
                }

                if (value.$c.length>1) {
                    result.add(toJS(value.$c.slice(1), ctxJsString, dependencies));
                }
                result.add(new ParsedJS(ctxJsEmpty, ")", ctxJsValue, null));
                return result;
            } else if (type=='$') {
                return toJS(['('].concat(value.$c,[')']), ctxJsValue, dependencies);
            }
            throw "Sorry, unknown special tag '"+type+"'.";
        };

        this.parseText = function (/*ParsedText*/ text) {
//            console.log("TEXT", text.$c, config.inTitle);
            if (config.inTitle) {
                title.add(toJS(text.$c, ctxHtml, dependencies));
            } else if (config.inBody) {
                if (config.inScript) {
                    html.add(toJS(text.$c, ctxJs, dependencies));
                } else {
                    html.add(toJS(text.$c, ctxHtml, dependencies));
                }
            } else if (config.inHead) {
                if (config.inScript) {
                    var replaceArr = [];
                    var parsedScript = toJS(text.$c, ctxJs, dependencies, function (type, value, valName) {
                        if (type == "require call") replaceArr.push([value, valName]);
                        return value;
                    });
                    var result = parsedScript.value;
                    for (var i=0;i<replaceArr.length;i++) {
                        result = Strings.replace(result, replaceArr[i][0], replaceArr[i][1]);
                    }
                    parameters.head += result;
                }
            }
        };

        this.parseTag = function (/*String*/tagName, /*Map*/attributes) {

//            console.log("TAG '" + tagName + "'", attributes.values());

            if (tagName == '/body') {
                config.inBody = false;
            }

            if (config.inBody) {
                if (tagName == 'script') {
                    html.add(new ParsedJS(ctxJs, "", ctxJs, null));
                } else if (tagName == '/script') {
                    //end od script
                } else {
                    html.add("<" + tagName);
                    attributesToJS(html, attributes, dependencies);
                    html.add(">");
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

        this.finish = function (cs) {

            //noinspection JSValidateTypes
            var /*Map*/ functions = new Map();

            JSFunctions.parseFunctions(functions, parameters.head, cs);
            if (functions.containsKey("beforeCreate")) parameters.hasBeforeCreate = "";
            if (functions.containsKey("afterCreate")) parameters.hasAfterCreate = "";
            if (functions.containsKey("onDestroy")) parameters.hasOnDestroy = "";
            html.add(END_PARSED_JS);
            title.add(END_PARSED_JS);
            parameters.html = html.value;
            parameters.title = title.value;
            parameters.dependencies = dependencies.variables().slice(1).join(", ");
            this.str=js_beautify(Strings.replaceWith(result, parameters));
        };

        this.toString = function () {
            if (typeof this.str == "undefined") throw "Functions HtmlParser.toString() called before calling HtmlParser.finish(cs).";
            return this.str;
        };

        this.name = name;

    }

    HtmlParser.prototype.parse = function (/*InputStream*/ input, /*ConsoleStack*/ cs) {
        try {
            parse(this, input, cs);
        } catch (e) {
            if (cs) cs.addError(e);
            else throw e;
        }
        this.finish(cs);
        return this.toString();
    };

    function jsNameGetter(s) {
        return "_" + Strings.toJSName(s);
    }

    function fillOnLoad(dependencies, parameters, attributes) {
        if (attributes.containsKey("class")) {
            try {
                parameters.css += "\n       " + dependencies.get(componentsName) + ".setClass(body, '" +
                    toJS(attributes.get("class").$c, ctxJsString, dependencies).value + "');";
            } catch (e) {
                throw "Can't parse 'class' tag on body element ("+e+")."
            }
        }
        if (attributes.containsKey("style")) {
            try {
                parameters.css += "\n       " + dependencies.get(componentsName) + ".setStyle(body, '" +
                    toJS(attributes.get("style").$c, ctxJsString, dependencies).value + "');";
            } catch (e) {
                throw "Can't parse 'style' tag on body element ("+e+")."
            }
        }
        var keys = attributes.keys(), kl = keys.length;
        while (kl-- > 0) if (keys[kl] != "onload" && Strings.startsWith(keys[kl], "on")) {
            try {
                parameters.onLoad += "\n       " + dependencies.get(componentsName) + ".setEvent(body, " +
                    Strings.toJSString(keys[kl].substr(2)) + ", function (event) {\n         "
                    + toJS(attributes.get(keys[kl]).$c, ctxJs, dependencies).value + "\n       });";
            } catch (e) {
                throw "Can't parse '"+keys[kl]+"' event on body element ("+e+")."
            }
        }
        if (attributes.containsKey("onload")) {
            try {
                parameters.onLoad += "\n       " + toJS(attributes.get("onload").$c, ctxJs, dependencies).add(new ParsedJS(ctxJs, "", ctxJsEmpty, null)).value;
            } catch (e) {
                throw "Can't parse onLoad event on body element ("+e+")."
            }
        }
    }

    var idPrefixes = new Map();
    var ctxHtml=1,
        ctxTag=2,
        ctxTagAttribute=2,
        ctxJs=3,
        ctxJsVar=4,
        ctxJsValue=5,
        ctxJsEmpty=0,
        ctxJsStandardString=6, //"blablabla"
        ctxJsString=7, //'bla bla bla'
        ctxJsFunctionParam=8;
    var zeroOptions = {nl:"\n",v:"/* WARNING */"};
    var idOptions = {nl:"",v:"",ctx: function (fromContext, toContext) {
        return ctx(fromContext, toContext);
    }};

    idPrefixes.put("component.", function (value, key, keyValue, id, dependencies) {
        var moduleName = "";
        var functionParameters = "";
        var wrapperMap = new Map();
        var parsed = toJS(value.$c, ctxJsValue, dependencies, function (type, value, context) {
            //console.log("parserListener "+type + context, value);
            if (type == "parsing" && typeof value == "object") {
                var jsName = Strings.toJSName(value.value);
                wrapperMap.put(jsName, value.value);
                value.value = jsName;
            } else if (type == "function") {
                if (typeof value=="string" && Strings.startsWith(value, "component.")) moduleName = value.substr(10);
            } else if (type == "function params") {
                if (typeof value=="string" && !functionParameters) functionParameters = Strings.trim(value);
            }
            return value;
        });
        var s = parsed.value;
        if (!moduleName && !Strings.startsWith(s, "component.")) {
            throw "Error parsing component name '"+keyValue+"'";
        }
        if (!moduleName) {
            moduleName = s.substr(10);
        }

        id.put("component", wrapWithMap(wrapperMap, "{name: "+Strings.toJSString(moduleName)+", factory: "+dependencies.get(moduleName)+(functionParameters ? ", parameters: "+functionParameters : "")+"}"));
    });

    idPrefixes.put("parameters.", function (value, key, keyValue, id, dependencies) {
        var wrapperMap = new Map();
        var parsed = toJS(value.$c, ctxJsValue, dependencies, function (type, value) {
            //console.log("parserListener "+type + context, value);
            if (type == "parsing" && typeof value == "object") {
                var jsName = Strings.toJSName(value.value);
                wrapperMap.put(jsName, value.value);
                value.value = jsName;
            }
            return value;
        });
        var s = parsed.value;
        if (!Strings.startsWith(s, "parameters.")) {
            throw "Error parsing component name '"+keyValue+"'";
        }
        id.put("sync", wrapWithMap(wrapperMap, "function (__val) {if (typeof __val != 'undefined') "+s+" = __val; return "+s+";}"));
    });

    function attributesToJS(html, /*Map*/ attributes, dependencies) {
        var k = attributes.keys(), l = k.length, id = null, value;
        while (l-->0) {
            var name = k[l];
            value = attributes.get(name);
            var nameLowerCase = name.toLowerCase();
            if (value) {
                if (nameLowerCase == "id") {
                    if (!id) id = new Map();

                    var key = "'"+toJS(value.$c, ctxJsString, dependencies).value+"'";
                    var keyValue = Strings.fromJSString(key);
                    var idPrefixesKeys = idPrefixes.keys();
                    var idPrefixesValues = idPrefixes.values();
                    for (var i=0;i<idPrefixesKeys.length;i++) {
                        if (Strings.startsWith(keyValue, idPrefixesKeys[i])) {
                            idPrefixesValues[i](value, key, keyValue, id, dependencies);
                        }
                    }
                    id.put("key", key);
                    attributes.remove(name);
                } else if (Strings.startsWith(nameLowerCase, "on")) {
                    if (!id) id = new Map();
                    var eventFunction = "function (event, element) {"+toJS(value.$c, ctxJs,  dependencies).value+"}";
                    id.put(nameLowerCase, eventFunction);
                    attributes.remove(name);
                }
            }
        }
        for (l = 0; l < k.length; l++) {
            value = attributes.get(k[l]);
            html.add(' '+k[l]);
            if (value) {
                html.add('="');
                html.add(toJS(value.$c, ctxJsVar,dependencies));
                html.add('"');
            }
        }
        if (id) {
            var elements = id.keys(), values = id.values(), js = "instance.newId({";
            for (l=0;l<elements.length;l++) {
                if (l>0) js+=', ';
                js+=elements[l]+': '+values[l];
            }
            js+="})";
            html.add(' id="');
            html.add(new ParsedJS(ctxJsValue, js, ctxJsValue, null));
            html.add('"');
        }
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

    function removeWhiteSpacesFromHtml(s) {
        var l= s.length, r="", lastIsWhiteSpace=false, inPre = false;
        for (var i = 0;i<l;i++) {
            var c = s.charAt(i);
            if (inPre) {
                if (c == '<' && i + 5 < l && s.substr(i + 1, 4).toLowerCase() == '/pre') {
                    c = s.charAt(i + 5);
                    inPre = !(c < '!' || c == '>');
                    r += '</pre';
                    i += 5;
                    lastIsWhiteSpace = r<'!';
                }
                r+=c;
            } else if (c<'!') {
                if (!lastIsWhiteSpace) r+=' ';
                lastIsWhiteSpace = true;
            } else {
                if (c == '<' && i + 4 < l && s.substr(i + 1, 3).toLowerCase() == 'pre') {
                    c = s.charAt(i + 4);
                    inPre = c < '!' || c == '>';
                    r += '<pre';
                    i += 4;
                }
                r+=c;
                lastIsWhiteSpace = false;
            }
        }
        return r;
    }


    function ctx(fromContext, toContext, options) {
        if (!options) options = zeroOptions;
        else if (options.ctx) return options.ctx(fromContext, toContext);
        switch (fromContext) {
            case ctxJsEmpty:
                switch (toContext) {
                    case ctxJsString: return "'";
                    case ctxJsStandardString: return '"';
                    case ctxJs: return options.nl;
                    case ctxJsValue: return '';

                }
                return "";

            case ctxJs:
                switch (toContext) {
                    case ctxJsString: return options.nl+options.v+"'";
                    case ctxJsStandardString: return options.nl+options.v+'"';
                    case ctxJs: return ';'+options.nl;
                    case ctxJsValue: return options.nl+options.v;

                }
                return "";
            case ctxJsValue:
                switch (toContext) {
                    case ctxJsString: return " + '";
                    case ctxJsStandardString: return ' + "';
                    case ctxJs: return ';'+options.nl;
                    case ctxJsValue: return ' + ';

                }
                return "";
            case ctxJsString:
                switch (toContext) {
                    case ctxJsStandardString: return '\' + "';
                    case ctxJs: return "';"+options.nl;
                    case ctxJsValue: return "' + ";
                    case ctxJsEmpty: return "'";
                }
                return "";
            case ctxJsStandardString:
                switch (toContext) {
                    case ctxJsString: return '" + \'';
                    case ctxJs: return '";'+options.nl;
                    case ctxJsValue: return '" + ';
                    case ctxJsEmpty: return '"';
                }
                return "";
        }
        return "";
    }

    /*
     * @param content
     * @param context
     * @param dependencies
     * @param listener function or null
     * @return {ParsedJS}
     */
    function toJS(content, context, dependencies, listener) {
        var length = content.length;
        var result, value = content[0];
        var contextStack = createContextStack();
        if (listener) value = listener('parsing', value, context);
        if (typeof value == "string") {
            if (context==ctxJs || context==ctxJsValue) {
                result = parseContext(value, context, contextStack, dependencies, listener);
            } else {
                if (context==ctxHtml) {
                    value = removeWhiteSpacesFromHtml(value);
                }
                result = new ParsedJS(ctxJsString, Strings.encodeString(value), ctxJsString, null);
            }
        } else if (typeof value == "number") {
            result = new ParsedJS(ctxJsValue, ""+value, ctxJsValue, null);
        } else if (typeof value == "object" && typeof value.startContext == "number" &&
            typeof value.endContext == "number" && typeof value.value == "string") {
            result = value;
        }

        for (var i = 1; i < length; i++) {
            var c = content[i];
            if (listener) c = listener('parsing', c, context);
            if (context==ctxJs || context==ctxJsValue) {
                if (typeof c == "string") {
                    c = parseContext(c, null, contextStack, dependencies, listener);
                } else {
                    contextStack.next(c.value);
                }
            } else {
                if (context==ctxHtml && typeof c == "string") c = removeWhiteSpacesFromHtml(c);
            }
            result.add(c);
        }
        //if (contextStack.root() != null) console.log("Root parsing", content, contextStack.root());
        return result;

    }

    function add(/*ParsedJS*/ parsedJS, value) {
        if (typeof value == "string") {
            if (parsedJS.endContext != ctxJsString) parsedJS.value += ctx(parsedJS.endContext, ctxJsString, parsedJS.options);
            parsedJS.value += Strings.encodeString(value);
            parsedJS.endContext = ctxJsString;
        } else if (typeof value == "number") {
            if (parsedJS.endContext != ctxJsValue) parsedJS.value += ctx(parsedJS.endContext, ctxJsValue, parsedJS.options);
            parsedJS.endContext = ctxJsValue;
        } else {
            if (parsedJS.endContext != value.startContext) parsedJS.value += ctx(parsedJS.endContext, value.startContext, parsedJS.options);
            parsedJS.value += value.value;
            parsedJS.endContext = value.endContext;
        }
        return parsedJS;
    }

    function ParsedJS(startContext, value, endContext, options) {
        this.startContext = startContext;
        this.value = value;
        this.endContext = endContext;
        this.options = options;
        this.add = function (js) {
            return add(this, js);
        };
    }

    function createContextStack() {
        var contextStack = [];
        var joinedValue = "";
        var offset = 0;
        var root = null;
        return {
            next: function (value) {
                offset = joinedValue.length;
                joinedValue += value;
            },
            last: function () {
                return contextStack[contextStack.length - 1];
            },
            push: function (context, index) {
                if (typeof index == "object") index = index.i-offset;
                var item = {c:context, i:index+offset};
                var parent = null;
                if (contextStack.length==0) root = item;
                else parent = this.last();
                if (parent) {
                    if (!parent.children) parent.children = [];
                    parent.children.push(item);
                }
                contextStack.push(item);
            },
            pop: function () {
                return contextStack.pop();
            },
            length: function () {
                return contextStack.length;
            },
            value: function (from, to) {
                //console.log("evaluating", [joinedValue, from, to+offset]);
                return joinedValue.substring(from, offset+to);
            },
            errorAt: function (at) {
                var length = Math.min(20, offset+at);
                return joinedValue.substr(offset+at-length, length)+"___."+ joinedValue.charAt(offset+at)+".___"+ joinedValue.substr(offset+at+1,20);
            },
            setI: function (i) {
                contextStack[contextStack.length - 1].i=i+offset;
            },
            root: function () {
                return root;
            }
        }
    }

    function parseContext(/*String*/value, context, /*ContextStack*/contextStack, dependencies, listener) {
//        console.log("parseContext for "+context, [value]);
        contextStack.next(value);
        var length = value.length;
        if (typeof context != "number") context = contextStack.last().c;
        else contextStack.push(context, 0);
        var startContext = context;
        for (var i = 0; i < length; i++) try {

            var c = value.charAt(i);
            var lastStack;
            if (context == ctxJsString || context == ctxJsStandardString) {
                i = findEndOfString(context == ctxJsString ? "'" : '"', value, i);
                if (i < length) {
                    lastStack = contextStack.pop();
                    var otherPartValue = contextStack.value(lastStack.i, i);
                    lastStack.endingString = otherPartValue;
                    lastStack = contextStack.last();
                    context = lastStack.c;
                    //lastStack.i = i + 1;
                } else {
//                    console.log("Found string starting value");
                }
            } else if (context == ctxJs) {
                if (c == 'r' && i > 1 && i + 3 < length && value.substr(i - 2, 4) == 'var ') {
                    context = ctxJsVar;
                    contextStack.push(context, i + 2);
                    lastStack = contextStack.last();
                    i++;
                } else if (c==';') {
                    lastStack = contextStack.last();
                    if (listener) listener("statement", contextStack.value(lastStack.i, i), lastStack.c);
                    contextStack.setI(i+1);
                } else if (c=='(') {
                    lastStack = contextStack.last();
                    contextStack.push(context, lastStack);
                    lastStack = contextStack.last();
                    var fName = Strings.trim(contextStack.value(lastStack.i, i));
                    lastStack.funcName = fName;
                    if (listener) listener("function", fName, lastStack.c);
                    context = ctxJsValue;
                    contextStack.push(context, i + 1);
                    lastStack = contextStack.last();
                    lastStack.isFunc = true;

//                    console.log("Found function '" + findFunctionName(value, i-1)+"'" , JSON.stringify(contextStack));
                } else if (c == "'" || c == '"') {
                    context = c == "'" ? ctxJsString : ctxJsStandardString;
                    contextStack.push(context, i);
                    i = findEndOfString(c, value, i + 1);
                    if (i < length) {
                        lastStack = contextStack.pop();
                        var wholeValue = contextStack.value(lastStack.i, i + 1);
                        lastStack.string = Strings.fromJSString(wholeValue);
                        lastStack = contextStack.last();
                        context = lastStack.c;
                        //lastStack.i = i + 1;
                    } else {
//                        console.log("Found string starting value");
                    }
                }
            } else if (context == ctxJsVar) {
                if (c == '=') {
                    lastStack = contextStack.last();
                    var vName = Strings.trim(contextStack.value(lastStack.i, i));
                    lastStack.varName = vName;
                    if (listener) listener("declaration name", vName, lastStack.c);
                    context = ctxJsValue;
                    contextStack.push(context, i + 1);
                    lastStack = contextStack.last();
                    lastStack.isVar = true;
                }
            } else if (context == ctxJsValue) {
                if (c == ';' || c == ',') {
                    lastStack = contextStack.pop();
                    var variableValue = Strings.trim(contextStack.value(lastStack.i, i));
                    //TODO check require JS
                    //(" "+variableValue+" ").match(/[\s;]+require\('([\S]+)'\)[\s;]+/m)
              //console.log("!!!!!!", variableValue);
                    if (variableValue && Strings.startsWith(variableValue, "require")) {
                        var test = Strings.trim(variableValue.substr(7));
                        if (Strings.startsWith(test,"(") && Strings.endsWith(test,")")) {
                            test = Strings.trim(test.substr(1,test.length-2));
                            c = test.charAt(0);
                            if (c=='"' || c=="'") {
                                if (findEndOfString(c, test, 1)==test.length-1) {
                                    //TODO
                                    var mNameee = test.substr(1,test.length-2);
                                    var nnnn = dependencies.get(mNameee);
                                    if (listener) listener("require call", variableValue, nnnn, mNameee);
                                }
                            }
                        }
                    }
                    if (c == ',') {
                        if (lastStack.isFunc) {
                            lastStack.funcParam = variableValue;
                            if (listener) listener("function params", variableValue, lastStack.c);
                            context = ctxJsValue;
                            contextStack.push(context, i + 1);
                            lastStack = contextStack.last();
                            lastStack.isFunc = true;
                        } else if (lastStack.isVar) {
                            if (listener) listener("declaration value", variableValue, lastStack.c);
                        } else if (lastStack.isJson) {
                            //TODO add support for objects
                        }
                    } else {
                        if (lastStack.isVar) {
                            contextStack.pop();
                            if (listener) listener("declaration value", variableValue, lastStack.c);
                        } else if (lastStack.isFunc || lastStack.isJson) {
                            //TODO error ';' is not allowed in function parameters
                        }
                    }
                    contextStack.setI(i+1);
                    lastStack = contextStack.last();
                    context = lastStack.c;

                } else if (c == "'" || c == '"') {
                    context = c == "'" ? ctxJsString : ctxJsStandardString;
                    contextStack.push(context, i);
                    i = findEndOfString(c, value, i + 1);
                    if (i < length) {
                        lastStack = contextStack.pop();
                        var wholeValue = contextStack.value(lastStack.i, i + 1);
                        lastStack.string = Strings.fromJSString(wholeValue);
//                        console.log("Found string value '" + wholeValue + "'");
                        lastStack = contextStack.last();
                        context = lastStack.c;
                        //lastStack.i = i + 1;
                    } else {
//                        console.log("Found string starting value");
                    }
                } else if (c=='(') {
                    lastStack = contextStack.last();
                    contextStack.push(context, lastStack);
                    lastStack = contextStack.last();
                    var name = Strings.trim(contextStack.value(lastStack.i, i));
                    lastStack.funcName = name;
                    if (listener) listener("function", name, lastStack.c);
                    context = ctxJsValue;
                    contextStack.push(context, i + 1);
                    lastStack = contextStack.last();
                    lastStack.isFunc = true;
                } else if (c==')') {
                    lastStack = contextStack.pop();
                    var funParam = Strings.trim(contextStack.value(lastStack.i, i));
                    lastStack.funcParam = funParam;
                    if (listener) listener("function params", funParam);
                    contextStack.pop();
                    lastStack = contextStack.last();
                    context = lastStack.c;
                }
            }

        } catch (e) {
            throw "Can't parse JavaScript '"+contextStack.errorAt(i)+"' ("+e+")";
        }
//        console.log("parseContext end "+context);
        return new ParsedJS(startContext, value, context, null);
    }

    function findEndOfString(type, value, start) {
        var length = value.length;
        start--;
        while (++start<length) if (value.charAt(start)==type && countOfSlashes(value, -start-1)%2==0) {
            return start;
        }
        return length;
    }

    /**
     * Counts number of slashes
     * @param value
     * @param start
     */
    function countOfSlashes(value, start) {
        var count = 0, length = value.length;
        if (start>=0) {
            //go up
            while (start<length) if (value.charAt(start++)=='\\') count++; else break;
        } else {
            //go down
            start = -start;
            while (start<length) if (value.charAt(start--)=='\\') count++; else break;
        }
        return count;
    }

    function wrapWithMap(/*Map*/map, js) {
        if (map.size()==0) return js;
        return "(function ("+map.keys().join(", ")+") {return "+js+"})("+map.values().join(", ")+")";
    }

    return HtmlParser;
});