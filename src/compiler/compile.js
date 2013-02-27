define(['compiler/Map', 'compiler/Strings', 'compiler/JSFunctions'], function (Map, Strings, JSFunctions) {

    var supportedAttributes = ["onclick", "onkeypress", "onchange", "onkeyup", "onfocus", "onload", "for"];

    var createComponentInstance = "Components.createComponentInstance";
    var factory = "Components.registerComponentFactory";
    var safeValue = "Components._sV";
    var PREFFIX = "\n          + ";

    var resource = "Localization.setResourceModule";
    var resourceBundle = "Localization.rb";
    var onlyAlphanumericKeys = false;

    function setRunParameters(runParameters) {
        if (runParameters) {
            if (runParameters.createComponentInstance) createComponentInstance = runParameters.createComponentInstance;
            if (runParameters.factory) factory = runParameters.factory;
            if (runParameters.safeValue) safeValue = runParameters.safeValue;


            if (runParameters.resource) resource = runParameters.resource;
            if (runParameters.resourceBundle) resourceBundle = runParameters.resourceBundle;
        }
    }


    function appendHtml(/*String*/ html, /*List<String>*/ componentResources) {
        html = Strings.trim(html);
        if (html.length == 0) return "";
        var /*String*/ htmlJS = PREFFIX + "'" + html.replace("\\", "\\\\").replace("'", "\\'").replace("\t", "\\t").replace("\n", "\\n") + "'";
        htmlJS = JSFunctions.extractSpecialTags(htmlJS, componentResources, "'\n          + " + resourceBundle + "('", "')\n          + '", '\'');
        return htmlJS;
    }

    function supportedAttribute(/*String*/ att, /*String*/ value) {
        return {
            att:att,
            value: value
        };
    }

    function scriptEnds(/*String*/ js) {
        var /*String*/ newJS = null;
        var /*int*/ scriptEnd = js.lastIndexOf('<');
        if (scriptEnd != -1 && scriptEnd + 7 < js.length && js.substring(scriptEnd + 1, scriptEnd + 8).toLowerCase() == "/script") {
            scriptEnd--;
            while (scriptEnd > 0 && js.charAt(scriptEnd) < 33) scriptEnd--;
            var /*int*/ scriptStart = 0;
            while (scriptStart <= scriptEnd && js.charAt(scriptStart) < 33) scriptStart++;
            if (scriptStart < scriptEnd) {
                newJS = "\n         " + js.substring(scriptStart, scriptEnd + 1) + "\n         html = html";
            } else {
                newJS = "\n         html = html";
            }
        }
        return newJS;
    }

    /**
     * Converts HTML component to compiled JS component
     *
     * @param name component name
     * @param input   input stream of HTML component
     * @param out  output stream for compiled JS component
     * @param cs   ConsoleStack
     * @param runParameters defaults
     * @throws java.io.IOException      on IO exception
     * @throws java.text.ParseException on parsing exception
     */
    function parseHTML(/*String*/ name, /*InputStreamReader*/ input, /*OutputStream*/ out, /*ConsoleStack*/ cs, runParameters) {
        setRunParameters(runParameters);
        var componentResources = new Map();
        var /*String*/ js = "";
        var functions = new Map();
        var /*String*/ title = null;
        var /*String*/ instanceTitle = null;
        var /*int*/ i;
        var /*boolean*/ inHead = false;
        var /*boolean*/ inScript = false;
        var /*boolean*/ inBody = false;
        var /*boolean*/ inTag = false;
        var /*boolean*/ tagHasName = false;
        var /*String*/ tag = "";
        var /*String*/ tagParams = "";
        var /*String*/ html = "";
        var /*String*/ olderHtml = '0';
        var /*Map<String, String>*/ ids = new Map();
        var /*String*/ htmlComment = null;

        var /*String*/ c;
        while ((c = input.read()) != '') {

            if (!inScript && c == '<') {
                inTag = true;
                tagHasName = false;
                tag = "";
                tagParams = "";
            } else if (inTag) {
                switch (c) {
                    case ' ':
                    case '\t':
                    case '\n':
                    case 13:
                        if (olderHtml != ' ') {
                            tagParams += ' ';
                        }
                        tagHasName = true;
                        olderHtml = ' ';
                        break;
                    case '>':
                        var /*String*/ tagLowerCase = tag.toLowerCase();
                        if (tagLowerCase == "head") {
                            inHead = true;
                        } else if (inHead && tagLowerCase==("/head")) {
                            inHead = false;
                        } else if (inHead && tagLowerCase==("title")) {
                            title = "";
                            var ct;
                            while ((ct = input.read()) != '') {
                                c = ct;
                                if (ct == '<') break;
                                else title += ct;
                            }
                            while ((ct = input.read()) != '') if (ct == '>') break;
                            title = Strings.trim(title);
                            var /*String*/ newTitle = JSFunctions.extractSpecialTags(title, componentResources, "\" + " + resourceBundle + "('", "') + \"", '"');
                            if (title!=(newTitle)) {
                                instanceTitle = '"' + newTitle + '"';
                                title = null;
                            }

                        } else if (tagLowerCase=="script") {
                            if (inBody) {
                                js += appendHtml(html, componentResources) + ";\n        ";
                                html = "";
                                olderHtml = '0';
                                while ((c = input.read()) != '') {
                                    if (c > ' ') {
                                        js += c;
                                        break;
                                    }
                                }
                            }
                            inScript = true;
                        } else if (inHead && tagLowerCase==("/script")) {
                            inScript = false;
                        } else if (tagLowerCase==("/html")) {
                            if (functions.size() == 0 && js != null) JSFunctions.parseFunctions(functions, js, cs);
                        } else if (tagLowerCase==("body")) {
                            //parse js
                            JSFunctions.parseFunctions(functions, js, cs);
                            js = "    /**\n" +
                                "     * Creates instance of '" + name + "' component and renders HTML content for it.\n" +
                                "     * @param parameters global reference for all data\n" +
                                "     * @param document reference to HTML document\n" +
                                "     * @param window reference to window or frame\n" +
                                "     * @return new instance of '" + name + "' component\n" +
                                "     */function create(parameters, document, window) {\n" +
                                "            var instance = " + createComponentInstance + "(this, parameters, document, window),\n" +
                                "         html = ''";
                            inBody = true;
                        } else if (inBody) {
                            if (tagLowerCase==("/body")) {
                                js += appendHtml(html, componentResources) + ";";
                                if (Strings.endsWith(js, " html = html;")) js = js.substring(0, js.lastIndexOf('\n'));
                                js += "\n        instance.getElement().innerHTML = html;";
                                js += "\n        instance.init();";
                                if (instanceTitle != null) {
                                    js += "\n        instance.title = " + instanceTitle + ";";
                                }
                                js += "\n        return instance;";
                                js += "\n    }";
                                var /*boolean*/ added = JSFunctions.parseFunctions(functions, js, cs);
                                //if (!added) throw new RuntimeException("Can't generate 'create' function for "+fileName+", compilation error input JavaScript: "+js);
                                if (!added) {
                                    var /*String*/ s = "Can't generate 'create' function, because of JavaScript compilation error";
                                    if (cs != null) cs.addError(s);
                                    else throw s;
                                }
                                html = js = "";
                                olderHtml = '0';
                                inBody = false;
                            } else {
                                if (tagParams.length > 0) {
                                    var /*boolean*/ addHtml = true;
                                    var /*String*/ params = tagParams;//.replace("\n", " ");
                                    var /*SupportedAttribute[]*/ atts = null;
                                    for (var l=0; l< supportedAttributes.length;l++) {
                                        var /*String*/ att = supportedAttributes[l];
                                        var /*int*/ attPosition = params.indexOf(att + "=\"");
                                        if (attPosition >= 0) {
                                            var /*int*/ attStartIndex = attPosition + att.length + 2;
                                            var /*int*/ j = params.indexOf('"', attStartIndex);
                                            if (j > 0) {
                                                if (atts == null) atts = [];
                                                atts.push(supportedAttribute(att, params.substring(attStartIndex, j)));
                                                var /*boolean*/ moreOnEnd = j + 2 < params.length;
                                                var /*boolean*/ moreOnBegin = attPosition > 0;
                                                if (moreOnBegin && moreOnEnd)
                                                    params = params.substring(0, attPosition - 1) + params.substring(j + 1);
                                                else if (moreOnEnd)
                                                    params = params.substring(j + 2);
                                                else if (moreOnBegin)
                                                    params = params.substring(0, attPosition - 1);
                                                else params = "";
                                            }
                                        }
                                    }
                                    var /*int*/ start = params.indexOf("id=\"") + 4;
                                    if (start < 4 && atts != null) {
                                        params += " id=\"\"";
                                        start = params.indexOf("id=\"") + 4;
                                    }
                                    if (start == 4 || (start > 4 && params.charAt(start - 5) == ' ')) {
                                        var /*int*/ length = params.indexOf('"', start) - start - 1;
                                        if (length > 0 || atts != null) {
                                            addHtml = false;
                                            js += appendHtml(html + "<" + tag + " " + params.substring(0, start), componentResources);
                                            js += PREFFIX + "instance.renderId({";
                                            var /*boolean*/ isNotEmpty = false;
                                            if (length > 0) {
                                                var pV = JSFunctions.parseTagVariables(params, start, start + length, null, safeValue, componentResources, resourceBundle, false);//TODO do it here: false
                                                var /*String*/ val = !pV.evaluate && pV.isStatic ? JSFunctions.trimOne(pV.variable) : pV.variable;
                                                if (pV.evaluate && Strings.startsWith(val, "component.", 1)) {
                                                    var /*int*/ valLength = val.length - 1;
                                                    var /*int*/ nameEnd = val.indexOf('(');
                                                    var /*String*/ componentName = Strings.trim(val.substring(11, nameEnd != -1 ? nameEnd : valLength));
                                                    js += "component: {name: \"" + componentName + "\"";
                                                    if (nameEnd != -1) {
                                                        var /*int*/ valEnd = val.lastIndexOf(')');
                                                        if (valEnd == -1)
                                                            throw "Can't parse '" + val + "'";
                                                        var /*String*/ parameters = val.substring(nameEnd + 1, valEnd);
                                                        //TODO add to module sync (initComponent:multiple)
                                                        //if (parameters.charAt(0)=='"')
                                                        js += ", parameters: " + parameters;
                                                        if (cs != null) cs.addItem(componentName, parameters);
                                                    } else if (cs != null) {
                                                        cs.addItem(componentName, null);
                                                    }
                                                    js += "}";
                                                } else {
                                                    js += (pV.evaluate ? "key: " : "val: ") + val;
                                                }
                                                ids.put(params.substring(start, start + length + 1), val);
                                                isNotEmpty = true;
                                            }
                                            if (atts != null) {
                                                for (var l =0;l<atts.length;l++) {
                                                    var att= atts[l];
                                                    if (isNotEmpty) js += ", ";
                                                    var pV = JSFunctions.parseTagVariables(att.value, 0, att.value.length - 1, null, safeValue, componentResources, resourceBundle, false);//TODO do it here: false
                                                    var /*boolean*/ on = Strings.startsWith(att.att,"on");
                                                    var /*String*/ key = on ? att.att.substr(2) : att.att;
                                                    if (key==("for")) {
                                                        key = "forId";
                                                    }
                                                    js += key + ": " + pV.variable;
                                                }
                                            }
                                            js += "})";
                                            html = params.substring(start + length + 1) + ">";
                                        }
                                    }
                                    if (addHtml) html += "<" + tag + " " + params + ">";
                                } else {
                                    html += "<" + tag + ">";
                                }
                            }
                        }
                        inTag = false;
                        //System.out.println("TAG: <" + tag + " ~ " + tagParams + " >");
                        olderHtml = '0';
                        htmlComment = null;
                        break;
                    default:
                        if (tagHasName) {
                            tagParams += c;
                        } else {
                            tag += c;
                            if (c == '-' && tag==("!--")) {
                                htmlComment = "";
                                while ((c = input.read()) != '') {
                                    if (c == '>' && Strings.endsWith(htmlComment,"--")) {
                                        htmlComment = htmlComment.substring(0, htmlComment.length - 2);
                                        inTag = false;
                                        break;
                                    } else {
                                        htmlComment += c;
                                    }
                                }
                            }

                        }
                        olderHtml = c;
                        break;
                }
            } else if (inScript) {
                if (c == '/') {
                    js += c;
                    if ((c = input.read()) != '') {
                        if (c == '/') {
                            js += c;
                            while ((c = input.read()) != '') {
                                if (c == '\n') {
                                    break;
                                } else if (c == '>') {
                                    var /*String*/ newJS = scriptEnds(js);
                                    if (newJS != null) {
                                        js = newJS;
                                        inScript = false;
                                        break;
                                    }
                                }
                                js += c;
                            }
                        } else if (c == '*') {
                            js += c;
                            var /*String*/ lastChar = ' ';
                            while ((c = input.read()) != '') {
                                if (c == '/' && lastChar == '*') {
                                    break;
                                } else if (c == '>') {
                                    var /*String*/ newJS = scriptEnds(js);
                                    if (newJS != null) {
                                        js = newJS;
                                        inScript = false;
                                        break;
                                    }
                                }
                                js += c;
                                lastChar = c;
                            }
                        }
                    }
                }
                if (inScript) {
                    if (c == '"' || c == "'") {
                        js += c;
                        var endChar = c, older = ' ';
                        while ((c = input.read()) != '') {
                            js += c;
                            if (c == '>') {
                                var /*String*/ newJS = scriptEnds(js);
                                if (newJS != null) {
                                    js = newJS;
                                    inScript = false;
                                    break;
                                }
                            }
                            if (c == endChar && older != '\\') break;
                            older = c;
                        }
                    } else {
                        js += c;
                        if (c == '>') {
                            var /*String*/ newJS = scriptEnds(js);
                            if (newJS != null) {
                                js = newJS;
                                inScript = false;
                            }
                        }
                    }
                }
            } else if (inBody) {
                if (tag==("pre")) {
                    switch (c) {
                        case '\n':
                            break;
                        default:
                            html += c;
                    }
                } else {
                    if (c<'!') c=' ';
                    if (olderHtml != ' ' || c != ' ') html += c;
                }
                olderHtml = c;
            }
        }

        if (factory != null) out.write(factory);
        out.write("({\n    componentName: \"");
        out.write(name.replace("\\", "\\\\").replace("\"", "\\\""));
        out.write("\",\n    componentResources: ");
        if (componentResources != null && componentResources.size() > 0) {
            var /*boolean*/ isArray = componentResources.size() > 1;
            var /*String*/ result = isArray ? "[" : "";
            var /*boolean*/ notFirst = false;
            var crs = componentResources.values();
            for (var k=0; k < crs.length;k++) {
                var /*String*/ componentResource = crs[k];
                if (notFirst) result += ", ";
                else notFirst = true;
                result += '"' + componentResource + '"';
            }
            if (isArray) result += "]";
            out.write(result);
        } else {
            out.write("null");
        }
        if (title != null) {
            out.write(",\n    title: \"");
            out.write(title.replace("\\", "\\\\").replace("\"", "\\\""));
            out.write("\"");
        }
        var fs = functions.values();
        for (var f=0; f<fs.length;f++) {
            var /*JSFunctions*/ func = fs[f];
            out.write(",\n    ");
            if (func.javaDoc != null) {
                out.write(func.javaDoc);
                out.write("\n    ");
            }
            out.write(func.name);
            out.write(": function ");
            out.write(func.parameters);
            out.write(" {\n        ");
            out.write(func.body);
            out.write("\n    }");
        }
        out.write("\n});");
    }

    /**
     * Converts resource bundle properties to JS object
     *
     * @param name resource bundle name
     * @param input   input stream of resource bundle properties
     * @param out  output stream for JS object
     * @param cs   ConsoleStack
     * @param runParameters defaults
     */
    function parseResource(/*String*/ name, /*InputStreamReader*/ input, /*OutputStream*/ out, /*ConsoleStack*/ cs, runParameters) {
        setRunParameters(runParameters);
        var /*int*/ i;
        var /*String*/ line = "";
        var /*String*/ locale = "";
        if ((i = name.indexOf('_')) != -1) {
            locale = name.substring(i + 1);
            name = name.substring(0, i);
        }

        if (resource != null) out.write(resource);
        out.write('("');
        out.write(name.replace("\\", "\\\\").replace("\"", "\\\""));
        out.write('", {\n "_locale": "');
        out.write(locale.replace("\\", "\\\\").replace("\"", "\\\""));
        out.write('"');

        var c = ' ';
        while (c != '') {
            c = input.read();
            if (c == '' || c == '\n') {
                line = Strings.trim(line);
                if (Strings.startsWith(line,'#')) {
                    out.write("\n //" +line.substr(1));
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
                    if (eq == -1) throw "Property '" + line + "' does not contain '=' delimiter";
                    var /*String*/ key = Strings.trim(line.substring(0, eq));
                    var /*String*/ value = Strings.trim(line.substring(eq + 1));
                    eq = key.length;
                    var useQuotes = false;
                    while (eq-- > 0)
                        if ((((c = key.charAt(eq)) < 'a' || c > 'z') && (c < 'A' || c > 'Z') && (c < '0' || c > '9'))) {
                            if (onlyAlphanumericKeys) throw "Key of property '" + key + "' must contain only alphanumeric characters!";
                            else useQuotes = true;
                        }
                    if (useQuotes) out.write(',\n "');
                    else out.write(',\n ');
                    out.write(key);
                    if (useQuotes) out.write('": "');
                    else out.write(': "');
                    out.write(value.replace("\\", "\\\\").replace("\"", "\\\""));
                    out.write('"');
                    line = "";
                }
                if (c == '') break;
            } else if (c >= ' ') {
                line += c;
            }
        }

        out.write("\n});");
    }

    function parseFile(/*String*/ name, /*InputStreamReader*/ input, /*OutputStream*/ out, /*ConsoleStack*/ cs, runParameters) {
        var fileNameLowerCase = name.toLowerCase();
        if (Strings.endsWith(fileNameLowerCase, ".html")) {
            parseHTML(name.substr(0, name.length-5), input, out, cs, runParameters);
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".htm")) {
            parseHTML(name.substr(0, name.length-4), input, out, cs, runParameters);
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".properties")) {
            parseResource(name.substr(0, name.length-11), input, out, cs, runParameters);
            return 2;
        } else if (Strings.endsWith(fileNameLowerCase, ".java")) {
            //TODO
            return 3;
        } else throw "Unknown file type '"+name+"'";
    }

    function createImport(s) {
        var i = 0, j = s.length;
        return {
            read: function () {
                return i < j ? s.charAt(i++) : '';
            }
        };
    }


    function createOutputStream() {
        var result = "";

        return {
            write: function (s) {
                result += s;
            }, toString: function () {
                return result;
            }
        };
    }


    function parseArgs(args) {
        var result = {
            inputCharset: "UTF-8",
            outputCharset: "UTF-8",
            webDir: "web"
        };
        if (args != null) {
            var /*int*/ i = 0, j;
            while (i < args.length) {
                var /*String[]*/ paths;
                if (args[i] == "-source") {
                    paths = args[++i].split(";");
                    if (paths.length > 1 || paths[0].length > 0) {
                        result.sources = [];
                        for (j = 0; j < paths.length; j++) if (paths[j] > '') {
                            result.sources.push(paths[j]);
                        }
                    }
                } else if (args[i] == "-cp") {
                    paths = args[++i].split(";");
                    if (paths.length > 1 || paths[0].length > 0) {
                        result.cp = [];
                        for (j = 0; j < paths.length; j++) if (paths[j] > '') {
                            result.cp.push(paths[j]);
                        }
                    }
                } else if (args[i] == "-dest")
                    result.destination = args[++i];
                else if (args[i] == "-safeValue")
                    result.safeValue = args[++i];
                else if (args[i] == "-factory")
                    result.factory = args[++i];
                else if (args[i] == "-create")
                    result.createComponentInstance = args[++i];
                else if (args[i] == "-in")
                    result.inputCharset = args[++i];
                else if (args[i] == "-out")
                    result.outputCharset = args[++i];
                else if (args[i] == "-rb")
                    result.resourceBundle = args[++i];
                else if (args[i] == "-control")
                    result.control = args[++i];
                else if (args[i] == "-v")
                    result.verbose = args[++i];
                else if (args[i] == "-api")
                    result.webDir = args[++i];
                else if (args[i] == "-javadoc")
                    result.javaDocPath = args[++i];
                else if (args[i] == "-overwrite")
                    result.overwrite = true;
                else if (args[i] == "-silent")
                    result.silent = true;
                else if (args[i] == "-f")
                    result.follow = [];
                i++;
            }
        }
        return result;
    }

    function doRequireModule(name, webDir, type, content) {
        var fnc, depName, dep;

        if (type == 1) {
            dep = '"' + webDir + 'Components", "' + webDir + 'Localization"';
            depName = "Components, Localization";
            fnc = "function(target, customParameters, callBack) {\n"
                + "  Components.openPage(\"" + name + "\", target, customParameters, callBack);\n}";
        } else if (type == 2) {
            dep = '"' + webDir + 'localization"';
            depName = "Localization";
            fnc = "function(key) {\n  return Localization.rb(\"" + name + ".\"+key);\n}";
        }

        return "define([" + dep + "], function (" + depName + ") {\n" + content + "\n\n\nreturn " + fnc + "\n});";
    }


    function build(params, cs, file, log) {

        var runParameters = parseArgs(params);
        if (!runParameters.destination) {
            log("\n" +
                "Usage: node r.js -lib w.js [options] -source SOURCE_DIR -dest DESTINATION_DIR" +
                "\n" +
                "where options include:\n" +
                "  -factory PARAMETER   to set the \"factory\" parameter\n" +
                "                         (Default: \"Components.registerComponentFactory\")\n" +
                "  -create PARAMETER      to set the \"createComponentInstance\" parameter\n" +
                "                         (Default: \"Components.createComponentInstance\")\n" +
                "  -rb PARAMETER        to set the \"resourceBundle\" parameter\n" +
                "                         (Default: \"Localization.rb\")\n" +
                "  -safeValue PARAMETER to set the \"safeValue\" parameter\n" +
                "                         (Default: \"Components._sV\")\n" +
                "  -in PARAMETER        to set the \"inputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -out PARAMETER       to set the \"outputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -control POLICIES    to set the coding rules policy\n" +
                "                       (e.g. \"-control parametricPage,parametricCall,dynamicPages,doc\")\n" +
                "  -v VERBOSE_DIR       to set the verbose output directory\n" +
                "  -cp JAVA_CLASS_PATH  to set the CLASS_PATH for compiled java sources\n" +
                "  -javadoc PATH        to set the JavaDoc PATH of compiled java sources\n" +
                "  -overwrite           to overwrite all existing files also with the latest \"modified\" timestamp\n" +
                "  -silent              do not inform me about skipped files\n" +
                "  -f                   Follow. The program will not terminate after compiling all the files, but\n" +
                "                       will enter an endless loop, wherein it waits for file changes.\n" +
                "\n" +
                "Author: Lubos Strapko (https://github.com/lubino)");
            throw "Required start parameters not included!";
        }

        runParameters.createComponentInstance = "Components.createComponentInstance";
        runParameters.factory = "Components.registerComponentFactory";
        runParameters.safeValue = "Components._sV";
        runParameters.resource = "Localization.setResourceModule";
        runParameters.resourceBundle = "Localization.rb";

        function toPath(s) {
            var source = String(s);
            if (source.indexOf("/") === -1) {
                source = source.replace(/\\/g, "/");
            }
            return source;
        }

        var files = [];
        var filter = {
            include: /(\.htm(l)?)|(\.properties)$/g,
            exclude: /compiler\.html?$/g
        };
        var i;
        for (i = 0; i < runParameters.sources.length; i++) {
            var source = toPath(runParameters.sources[i]);
            var toAdd = file.getFilteredFileList(source, filter, true, false);
            if (source.charAt(source.length - 1) != '/') source += '/';
            for (var l = 0; l < toAdd.length; l++) {
                files.push({file: toAdd[l], name: toAdd[l].replace(source, "")});
            }
        }

        var destination = toPath(runParameters.destination);
        if (!Strings.endsWith(destination, '/')) destination += '/';
        var webDir = runParameters.webDir;
        if (!Strings.endsWith(webDir, '/')) webDir += '/';

        var propertiesMap = new Map(), outs;
        for (i = 0; i < files.length; i++) {
            var fileName = files[i].name;
            var name;
            var fileToLower = fileName.toLocaleLowerCase();
            var out = createOutputStream();
            var writeAfter = false;
            if (Strings.endsWith(fileToLower, ".properties")) {
                writeAfter = true;
                var localeIndex = fileName.indexOf('_');
                if (localeIndex > 0) {
                    name = fileName.substr(0, localeIndex);
                    fileName = name + ".js";
                } else {
                    name = fileName.substr(0, fileName.lastIndexOf('.'));
                    fileName = name + ".js";
                }
                outs = propertiesMap.get(name);
                if (!outs) {
                    outs = [out];
                    propertiesMap.put(name, outs);
                } else {
                    outs.push(out);
                }
                //containsKey
            } else {
                name = fileName.substr(0, fileName.lastIndexOf('.'));
                fileName = name + ".js";
            }
            log(i + ": " + files[i].name + " (" + destination + fileName + ")");
            parseFile(files[i].name, createImport(file.readFile(files[i].file, runParameters.inputCharset)), out, cs, runParameters);
            if (!writeAfter) file.saveFile(destination + fileName, doRequireModule(name, webDir, 1, out.toString()), runParameters.outputCharset);
        }

        var names = propertiesMap.keys();
        var lineSeparator = file.getLineSeparator();
        for (i = 0; i < names.length; i++) {
            outs = propertiesMap.get(names[i]);
            var result = "";
            for (var k = 0; k < outs.length; k++) {
                if (!result) result = outs[k].toString();
                else result += lineSeparator + outs[k].toString();
            }
            file.saveFile(destination + names[i] + ".js", doRequireModule(names[i], webDir, 2, result), runParameters.outputCharset);
        }
    }

    return {
        file: parseFile,
        html: parseHTML,
        resource: parseResource,
        build: build,
        createImport: createImport,
        createOutputStream: createOutputStream
    };
});