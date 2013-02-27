define(['compiler/Map', 'compiler/Strings', 'compiler/MetaFunction', 'compiler/ServerRequest'], function (Map, String, MetaFunction, ServerRequest) {


    function JavaDocStack(/*String*/ javaDoc, /*ConsoleStack*/ cs) {
        var /*String*/ returns;
        var /*String*/ description = "";
        var /*Map<String, String>*/ paramsMap;
        var /*Map<String, String>*/ throwsMap;

        var /*String[]*/ lines = javaDoc.substr(2).split("\n");
        for (var i=0; i<lines.length;i++) {
            var line = lines[i];
            var /*int*/ s = 0;
            var /*int*/ l = line.length;
            var c = ' ';
            while (s<l && (c=line.charAt(s))==' ') s++;
            if (cs && c!='*') {
                cs.addError("Wrong JavaDoc format '"+String.trim(line)+"', line must start with '*' symbol.");
            }
            if (c=='*') {
                s++;
                while (s<l && line.charAt(s)==' ') s++;
            }

            if (line.indexOf("@param ",s)==s) {
                s+=7;
                while (s<l && line.charAt(s)==' ') s++;
                var /*int*/ a=s;
                while (s<l && line.charAt(s)>32) s++;
                if (!paramsMap) paramsMap = new Map();
                var /*String*/ key = line.substring(a, s);
                if (paramsMap.put(key, String.trim(line.substring(s)))!=null && cs != null) {
                    cs.addError("Only one JavaDoc '@param "+key+"' tag is supported.");
                }
            } else if (line.indexOf("@return ",s)==s) {
                s+=8;
                if (returns != null && cs != null) {
                    cs.addError("Wrong JavaDoc format '"+String.trim(line)+"', only one '@return' tag is supported.");
                }
                returns = String.trim(line.substring(s));
            } else if (line.indexOf("@throws ",s)==s) {
                s+=8;
                while (s<l && line.charAt(s)==' ') s++;
                var /*int*/ b=s;
                while (s<l && line.charAt(s)>32) s++;
                if (throwsMap == null) throwsMap = new Map();
                throwsMap.put(line.substring(b, s), String.trim(line.substring(s)));
            } else {
                var /*String*/ descriptionLine = String.trim(line.substring(s));
                if (descriptionLine.length>0) {
                    if (!description) description = descriptionLine;
                    else description += " "+descriptionLine;
                }
            }
        }

        this.returns = returns;
        this.description = description;
        this.paramsMap = paramsMap;
        this.throwsMap = throwsMap;
    }


    function logError(e) {
        if (this.logger) this.logger.log("Error:", e);
    }

    function log(e) {
        if (this.logger) this.logger.log("Info:", e);
    }

    function isString(/*String*/ key) {
        var c = key.charAt(0);
        return (c == '"' || c == '\'') && key.charAt(key.length - 1) == c;
    }



    var /*String*/ PARAMETRIC_PAGE = "parametricPage";
    var /*String*/ PARAMETRIC_CALL = "parametricCall";
    var /*String*/ DYNAMIC_PAGES = "dynamicPages";
    var /*DateFormat*/ DATE_FORMAT = "HH:mm:ss";

    function ConsoleStack(/*IOutputStreamCreator*/ osc, /*File*/ verbose, /*String*/ outputCharset, /*String*/ control, /*Boolean*/ silent, logger) {


        this.errors = null;
        this.file = null;
        this.files = null;
        this.silent = silent;
        this.osc=osc;
        this.logger=logger;

        if (verbose != null) {
            this.dir = verbose;
            this.outputCharset = outputCharset != null ? outputCharset : "UTF-8";
            if (osc && !osc.createDirectory(verbose)) throw verbose + " is not a valid directory";
        }

        this.isError = new Map();
        if (control != null) {
            var split = control.split(",");
            for (var i=0;i<split.length;i++) {
                this.isError.add(String.trim(split[i]));
            }
        }
    }

    function addFunction(/*String*/ name, /*String*/ parameters, /*String*/ jsBody, /*JavaDocStack*/ jds) {
        if (!this.silent) {
            if (jsBody != null) this.log("Adding function '" + name + parameters + "'.");
            else this.log("Adding empty function '" + name + parameters + "'.");
        }
        if (this.item != null) {
            if (jds == null && isError.contains("doc")) this.addError("JavaDoc for function '" + name + "' is missing.");
            if (this.item.functions == null) this.item.functions = [];
            var /*String*/ substring = String.trim(parameters.substring(1, parameters.length - 1));
            var /*String[]*/ functionParameters = substring.length > 0 ? substring.split(",") : [];
            for (var i = 0; i < functionParameters.length; i++) {
                functionParameters[i] = String.trim(functionParameters[i]);
            }
            var /*String*/ description = null;
            var /*String[]*/ parametersDescription = null;
            var /*String*/ returns = null;
            if (jds != null) {
                description = jds.description;
                returns = jds.returns;
                if (description == null) {
                    this.addError("There is no JavaDoc description for function '" + name + "'.");
                }
                if (returns == null) {
                    this.addError("There is no JavaDoc '@return' tag for function '" + name + "', use '@return void' at least.");
                }
                var l;
                if (jds.paramsMap != null) {
                    parametersDescription = [];
                    var /*int*/ i = 0;
                    var /*int*/ missing = 0;
                    for (l = 0;l<functionParameters.length;l++) {
                        var /*String*/ s = jds.paramsMap.get(functionParameters[l]);
                        if (s == null) {
                            missing++;
                            this.addError("There is no JavaDoc '@param " + functionParameters[l] + " ...' tag for parameter in function '" + name + "'.");
                        }
                        parametersDescription[i++] = s;
                    }
                    if (missing + jds.paramsMap.size() > functionParameters.length) {
                        this.addError("There are more JavaDoc '@param' tags than parameters in function '" + name + "'.");
                    }
                } else if (functionParameters.length > 0) {
                    for (l = 0;l<functionParameters.length;l++) {
                        this.addError("There is no JavaDoc '@param " + functionParameters[l] + " ...' tag for parameter in function '" + name + "'.");
                    }
                }
            }
            this.item.functions.add(new MetaFunction(name, functionParameters, jsBody, description, parametersDescription, returns));
        }
    }


    function start() {
        this.started = new Date().getTime();
    }

    function addError(/*String*/ e) {
        this.logError(e);
        if (this.item != null) {
            if (this.item.errors == null) this.item.errors = new Map();
            this.item.errors.add(e);
        }
        if (this.errors == null) this.errors = new Map();
        if (!this.errors.contains(this.file)) this.errors.add(this.file);
    }

    function addItem(/*String*/ name, /*String*/ parameters) {
        if (!this.silent) {
            if (parameters != null)
                this.log("Adding component reference '" + name + "' with parameters: " + parameters + ".");
            else this.log("Adding component reference '" + name + "'.");
        }
        if (this.item != null) {
            if (this.item.components == null) this.item.components = new Map();
            if (!this.item.components.contains(name)) this.item.components.add(name);
        }
    }

    function addCall(/*String*/ key) {
        if (!this.silent) this.log("Found server call " + key + ".");
        if (this.item != null) {
            var /*boolean*/ isString = isString(key);
            var /*int*/ p = -1;
            if (isString) {
                key = key.substring(1, key.length - 1);
                p = key.indexOf('.');
            } else {
                if (this.isError.contains(PARAMETRIC_CALL))
                    this.addError("Parameter '" + key + "' for createRequest function found, use only string constants!");
                key = "${" + key + "}";
            }
            var /*String*/ moduleName = p != -1 ? key.substring(0, p) : key;
            var /*String*/ functionName = p != -1 ? key.substring(p + 1) : "";
            if (this.item.calls == null) this.item.calls = [];
            var /*ServerRequest*/ old = null;
            for (var l = 0;l<this.item.calls.length;l++) {
                var request = this.item.calls[l];
                if (request.moduleName==(moduleName)) {
                    old = request;
                    break;
                }
            }
            if (old == null) {
                this.item.calls.add(new ServerRequest(moduleName, functionName));
            } else if (!old.functions.contains(functionName)) {
                old.functions.add(functionName);
            }
        }
    }

    function addPage(/*String*/ key) {
        if (!this.silent) this.log("Found page call " + key + ".");
        if (this.item != null) {
            if (isString(key)) {
                if (key.charAt(1) != '#') {
                    key = key.substring(1, key.length - 1);
                    if (this.isError.contains(DYNAMIC_PAGES))
                        this.addError("Wrong parameter for openPage(...) function, use \"#" + key + "\" instead of \"" + key + "\".");
                } else {
                    key = key.substring(2, key.length - 1);
                }
            } else {
                if (this.isError.contains(PARAMETRIC_PAGE))
                    this.addError("Parameter '" + key + "' for openPage function found, use only string constants!");
                key = "${" + key + "}";
            }

            if (this.item.pages == null) this.item.pages = new Map();
            if (!this.item.pages.contains(key)) this.item.pages.add(key);
        }
    }

    function saveItem() {
        if (this.item != null) {
            try {
                var /*String*/ filename = this.addFile(this.item.name, this.item.type);
                try {
                    this.saveFile(filename, JSON.stringify(this.item));
                    this.item = null;
                } catch (e) {
                    this.logError(""+e);
                }
            } catch (e) {
                this.logError(""+e);
            }
        }
    }

    function addFile(/*String*/ name, /*int*/ type) {
        var /*String*/ filename = (type != 1 ? type != 2 ? "m_" : "res_" : "cmp_") + name + ".js";
        if (this.files == null) this.files = new Map();
        if (!this.files.contains(filename)) this.files.add(filename);
        return filename;
    }

    function saveFile(/*String*/ filename, /*String*/ content) {
        if (!this.osc) return;
        var /*OutputStream*/ os = this.osc.create(dir.getAbsolutePath() + "/" + filename, false);
        os.write(("include_file(\"" + filename.replace("\"", "\\\"") + "\",\n " + content + "\n);").getBytes(outputCharset));
        os.close();
    }



    function render(/*String*/ name, /*String*/ newFile, /*int*/ type, /*WebJSCompiler*/ compiler) {
        var /*String*/ description;
        switch (type) {
            case 0:
                description = "module";
                break;
            case 1:
                description = "component";
                break;
            case 2:
                description = "resource";
                break;
            case 3:
                description = "java";
                break;
            default:
                description = "unknown";
        }
        this.log("Rendering " + description + ": " + name + (newFile != null ? " (" + newFile + ")" : ""));
        this.file = newFile;
        if (dir != null) {
            this.saveItem();
            this.item = compiler.createItemDefinition(name, type);
        }
    }

    function skipping(/*String*/ name, /*String*/ newFile, /*int*/ type) {
        this.saveItem();
        this.addFile(name, type);
        this.file = newFile;
        if (!this.silent) this.log("Skipping (file not modified): " + newFile);
    }

    function startIn(/*File[]*/ source) {
        if (source.length > 1) {
            this.log("Searching in " + source.length + " sources for webJS files.");
        } else {
            this.log("Searching in '" + source[0].getAbsolutePath() + "' for webJS files.");
        }
    }

    function follow(/*File[]*/ source) {
        if (source.length > 1) {
            this.log("Following file changes in " + source.length + " sources for webJS files.");
        } else {
            this.log("Following file changes in '" + source[0].getAbsolutePath() + "' for webJS files.");
        }
    }

    function exception(/*Exception*/ e) {
        addError(""+e);
    }

    function end(/*boolean*/ canEnd) {
        if (this.dir != null) {
            this.saveItem();
        }
        if (this.errors != null) {
            var /*String*/ message = "There are some error in " + this.errors.size() + " file(s)";
            this.errors = null;
            if (canEnd) throw message;
            else this.logError(message);
        }
        if (this.files != null && dir != null) {
            try {
                this.saveFile("consoleStack.js", JSON.stringify([new Date().getTime(), this.files, start]));
            } catch (e) {
                this.logError(e);
            }
        }
    }

    function moduleFunction(/*String*/ className, /*String*/ name, /*Class[]*/ paramTypes, /*MetaFunction*/ metaFunction) {
        var /*String*/ parameters = "";
        for (var i=0;i<paramTypes.length; i++) {
            var /*String*/ docName = paramTypes[i].getName();
            parameters += parameters.length > 0 ? ", " + docName : docName;
        }
        parameters = "(" + parameters + ")";
        var /*JavaDocStack*/ jds = null;
        var /*String*/ body = null;
        if (metaFunction != null) {
            body = metaFunction.body;
            var /*String*/ jD = "/**";
            if (metaFunction.description != null) jD += "\n * " + metaFunction.description;
            if (metaFunction.parameters != null) {
                parameters = "";
                for (var i=0;i<metaFunction.parameters.length;i++) {
                    var parameter = metaFunction.parameters[i];
                    if (parameters.length == 0) parameters = parameter;
                    else parameters += ", " + parameter;
                    if (metaFunction.parametersDescription != null)
                        jD += "\n * @param " + parameter + " " + metaFunction.parametersDescription[i];
                }
                parameters = "(" + parameters + ")";
            }
            if (metaFunction.returns != null) jD += "\n * @return " + metaFunction.returns;
            jD += "\n */";
            jds = new JavaDocStack(jD, this);
        }
        this.addFunction(name, parameters, className + "#" + body, jds);
    }



    ConsoleStack.prototype.addError = addError;
    ConsoleStack.prototype.start = start;
    ConsoleStack.prototype.addItem = addItem;
    ConsoleStack.prototype.render = render;
    ConsoleStack.prototype.skipping = skipping;
    ConsoleStack.prototype.startIn = startIn;
    ConsoleStack.prototype.follow = follow;
    ConsoleStack.prototype.exception = exception;
    ConsoleStack.prototype.end = end;
    ConsoleStack.prototype.moduleFunction = moduleFunction;
    ConsoleStack.prototype.addFunction = addFunction;
    ConsoleStack.prototype.addCall = addCall;
    ConsoleStack.prototype.addPage = addPage;
    ConsoleStack.prototype.saveItem = saveItem;
    ConsoleStack.prototype.addFile = addFile;
    ConsoleStack.prototype.saveFile = saveFile;
    ConsoleStack.prototype.logError = logError;
    ConsoleStack.prototype.log = log;

    ConsoleStack.JavaDocStack = JavaDocStack;

    return ConsoleStack;
});