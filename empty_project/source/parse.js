
define('compiler/Strings',[], function () {

    function replace(s, searchValue, newValue) {
        var i = 0, len1 = searchValue.length, len2 = newValue.length;
        while ((i = s.indexOf(searchValue, i)) != -1) {
            var b = i > 1 ? s.substr(0, i) : "";
            var e = i + len1 < s.length ? s.substr(i + len1) : "";
            s = b + newValue + e;
            i += len2;
        }
        return s;
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function startsWith(s, key, at) {
        if (typeof at != "number") at = 0;
        return s.indexOf(key) == at;
    }

    function endsWith(s, key) {
        var looksAt = s.length - key.length;
        return looksAt >= 0 && s.indexOf(key) == looksAt;
    }

    function regionMatches(s, start, key) {
        return s.indexOf(key, start) == start;
    }

    function removeWhiteSpaces(s) {
        if (!s) return s;
        var r = "", last = ' ';
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            if (c < '!') c = ' ';
            if (c != ' ' || last != ' ') {
                r += last = c;
            }
        }
        return r;
    }

    function replaceWith(/*String*/ s, /*Object*/o) {
        for (var key in o) {
            var attKey = "" + key;
            var att = "${"+key+"}";
            s = replace(s, att, String(o[attKey]));
        }
        return s;
    }

    /**
     * Converts string to a string fine for JS variable value
     * @param s some string
     */
    function toJSString(s) {
        return "'" + encodeString(s) + "'";
    }

    /**
     * Converts string to a string fine for JS variable value
     * @param s some string
     */
    function fromJSString(s) {
        //TODO do type detection
        var length = s.length - 2;
        return length > 0 ? decodeString(s.substr(1, length)) : "";
    }

    var encodeStringTokens = [String.fromCharCode(13), "\t", "\n", "'", "\\"], encodeStringSymbols = ["", "\\t", "\\n", "\\'", "\\\\"];

    /**
     * Converts string to a string fine for JS variable value
     * @param s some string
     */
    function encodeString(s) {
        var l = encodeStringTokens.length;
        while (l-- > 0) {
            s = replace(s, encodeStringTokens[l], encodeStringSymbols[l]);
        }
        return s;
    }

    var decodeStringTokens = [String.fromCharCode(13), "\t", "\n", "'", "\\"], decodeStringSymbols = ["", "\\t", "\\n", "\\'", "\\\\"];

    /**
     * Converts string to a string fine for JS variable value
     * @param s some string
     */
    function decodeString(s) {
        var l = decodeStringTokens.length;
        while (l-- > 0) {
            s = replace(s, decodeStringSymbols[l], decodeStringTokens[l]);
        }
        return s;
    }

    function addSemicolon(s) {
        s = trim(s);
        if (!endsWith(s, ";")) s += ";";
        return s;
    }


    /**
     * Converts string to a string fine for JS variable name
     * @param s some string
     */
    function toJSName(s) {
        var l = s.length;
        var result = "";
        for (var i = 0; i < l; i++) {
            var c = s.charAt(i);
            var isOK = c == '$' || c == '_';
            if (!isOK) isOK = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
            if (!result) {
                //c is the first symbol
                if (isOK) {
                    result = c;
                    continue;
                } else result = "_";
            }
            isOK = isOK || (c >= '0' && c <= '9');
            if (isOK) {
                result += c;
            } else if (c == '\\' || c == '/' || c == '.') {
                result += "_"
            }
        }
        return result;
    }

    function trimOne(/*String*/ s) {
        return s > '' ? s.substring(1, s.length - 1) : "";
    }

    function toPath(s) {
        var source = String(s);
        if (source.indexOf("\\") > -1) {
            source = source.replace(/\\/g, "/");
        }
        return source;
    }


    return {
        replace: replace,
        trim: trim,
        trimOne: trimOne,
        startsWith: startsWith,
        endsWith: endsWith,
        regionMatches: regionMatches,
        removeWhiteSpaces: removeWhiteSpaces,
        replaceWith: replaceWith,
        toJSString: toJSString,
        fromJSString: fromJSString,
        encodeString: encodeString,
        addSemicolon: addSemicolon,
        toJSName: toJSName,
        toPath: toPath,
        author: "Lubos Strapko (https://github.com/lubino)"
    };
});
define('compiler/Map',[],function () {

    /**
     * Map
     * @constructor Map
     */
    function Map() {

        var map = {};
        var _keys = [];
        var _values = [];

        function size() {
            return _keys.length;
        }

        function keys() {
            return _keys;
        }

        function values() {
            return _values;
        }

        function containsKey(key) {
            return typeof map[key] != "undefined";
        }

        function add(key) {
            map[key] = _keys.length;
            _keys.push(key);
            _values.push(key);
        }

        function put(key, value) {
            map[key] = _keys.length;
            _keys.push(key);
            _values.push(value);
        }

        function getValue(key) {
            var i = map[key];
            if (typeof i == 'undefined') return null;
            return _values[i];
        }

        function remove(key) {
            var i = map[key];
            if (typeof i == 'undefined') return null;
            delete map[key];
            for (var field in map) {
                var otherKey = ""+field;
                if (map[otherKey]>i) map[otherKey]--;
            }
            _keys.splice(i,1);
            return _values.splice(i,1);
        }

        this.size = size;
        this.contains = containsKey;
        this.containsKey = containsKey;
        this.keys = keys;
        this.values = values;
        this.put = put;
        this.get = getValue;
        this.add = add;
        this.remove = remove;
    }

    return Map;
});
define('compiler/Brackets',[], function () {


    var /*String[]*/ startings = ['{', '[', '('];
    var /*String[]*/ endings = ['}', ']', ')'];

    function isStarting(c) {
        return c=='{' || c== '[' || c== '(';
    }
    function isEnding(c) {
        return c=='}' || c== ']' || c== ')';
    }
    function endingTo(c) {
        switch (c) {
            case '{': return '}';
            case '[': return ']';
            case '(': return ')';
        }
        return null;
    }

    function Brackets(/*String 1*/ starting, /*String 1*/ ending, /*int*/ start, /*int*/ end, /*int[]*/ comas) {
        this.starting = starting;
        this.ending = ending;
        this.start = start;
        this.end = end;
        this.comas = comas;
    }

    function findEndingBracket(/*String*/ js, /*int*/ start, starting, ending) {
        var /*int*/ i = start;
        var /*int*/ count = 1;
        var /*int*/ end = js.length;
        while (i++ < end) {
            var c = js.charAt(i);
            if (c==starting) {
                count++;
            } else if (c==ending) {
                count--;
                if (count==0) return i;
            }
        }
        return -1;
    }


    function _findEndingBracket(/*String*/ js, /*int*/ start, /*int*/ end) {
        var /*int*/ i = start;
        var /*int*/ count = 1;
        var /*Array*/ result = null;

        while (i++ < end) {
            var c = js.charAt(i);
            if (isStarting(c)) {
                count++;
            } else if (isEnding(c)) {
                count--;
                if (count==0) {
                    //TODO wrong bracket if (c != ending) throw RuntimeException();
                    return new Bracket(i, result);
                }
            } else if (c==',' && count == 1) {
                if (!result) result = [];
                result.push(i);
            }
        }
        return new Bracket(-1, null);
    }

    function _findEndingBracketInput(/*InputStream*/ input, type) {
        var start = input.getPosition();
        var /*String[]*/ level = [endingTo(type)];
        var length = level.length;
        var /*Array*/ result = null;
        var lastType = '';
        var c;

        while (c = input.read()) {
            if (isStarting(c)) {
                lastType = endingTo(c);
                level.push(lastType);
            } else if (c == lastType) {
                level.pop();
                length = level.length;
                if (length==0) {
                    return new Bracket(input.getPosition(), result);
                }
                lastType = level[length-1];
            } else if (c==',' && length == 1) {
                if (!result) result = [];
                result.push(input.getPosition());
            }
        }
        throw "Can't find ending bracket to '"+input.errorAt(start)+"'";
    }

    function Bracket(/*int*/ end, /*Array*/ result) {
        this.end = end; //index of bracket
        var comas; // indexes of comas

        if (result) {
            var /*int*/ size = result.length;
            if (size > 0) {
                comas = [];
                for (var i = 0;i< result.length;i++) {
                    comas.push(result[i]);
                }
                comas[size] = end;
            }
        }
        this.comas = comas;
    }

    /**
     * Find brackets in js
     * @param js the JavaScript resource
     * @param start index of first letter of script
     * @param end index of last letter of script
     * @return
     */
    function findFirst(/*String*/ js, /*int*/ start, /*int*/ end) {
        var /*int*/ firstIndex = end;
        var /*int*/ first = -1;
        for (var i = 0; i < startings.length; i++) {
            var /*int*/ p = js.indexOf(startings[i], start);
            if (p<firstIndex && p>=0) {
                firstIndex = p;
                first = i;
            }
        }
        if (first>=0) {
            var starting = startings[first];
            var ending = endings[first];
            var endingBracket = _findEndingBracket(js, firstIndex, end);
            return new Brackets(starting, ending, firstIndex, endingBracket.end, endingBracket.comas);
        }
        return  null;
    }

    /**
     * finds ending bracket of typy 'type'
     * @param input
     * @param type
     */
    function findEnd(/*InputStream*/ input, type) {
        var start = input.getPosition();
        return type+input.cutString(start, _findEndingBracketInput(input, type).end);
    }

    Brackets.findEndingBracket = findEndingBracket;
    Brackets.findFirst = findFirst;
    Brackets.findEnd = findEnd;

    return Brackets;
});
define('compiler/ParsedText',['compiler/Strings'], function () {
    function ParsedText() {


        var content = [];
        var lastIsString = false;

        this.$c = content;
        this.empty = function () {
            return content.length == 0;
        };
        this.clear = function () {
            lastIsString = false;
            this.$c = content = [];
        };
        this.addSpecial = function (special) {
            lastIsString = false;
            content.push(special);
        };
        this.removeLastChar = function () {
            if (lastIsString) {
                var l = content.length - 1;
                content[l] = content[l].substr(0, content[l].length-1);
            }
        };
        this.addChar = function (c) {
            if (!lastIsString) {
                lastIsString = true;
                content.push(c);
            } else {
                var l = content.length - 1;
                content[l] = content[l]+c;
            }
        };
    }
    return ParsedText;
});
define('compiler/Tag',['compiler/Map', 'compiler/Brackets', 'compiler/ParsedText'], function (Map, Brackets, ParsedText) {

        function isSpecialSymbol(c, after) {
            return after == '{' && (c == '@' || c == '$');
        }

        function readString(/*InputStream*/ input, /*String*/ type, /*HtmlParser*/ parser, /*ParsedText*/ value) {
            var c, last='', i = input.getPosition();
            while ((c=input.read())) {
                if (c==type) {
                    return;
                }
                if (isSpecialSymbol(last, c)) {
                    value.removeLastChar();
                    value.addSpecial(parser.parseSpecial(readSpecialTag(input, parser), last));
                } else {
                    value.addChar(c);
                    last = c;
                }
            }
            throw "Can't find end of string from '"+input.errorAt(i)+"'";
        }

        function readSpecialTag(/*InputStream*/ input, /*HtmlParser*/ parser) {
            var c, last = '';

            //noinspection JSValidateTypes
            var /*ParsedText*/ value = new ParsedText();
            while (c = input.read()) {
                if (isSpecialSymbol(last, c)) {
                    parser.parsingSpecial(last);
                    value.removeLastChar();
                    value.addSpecial(parser.parseSpecial(readSpecialTag(input, parser), last));
                    c = input.read();
                }
                if (c == '{') {
                    value.addChar(Brackets.findEnd(input, c));
                }
                if (c == '"' || c == "'") {
                    value.addChar(c);
                    readString(input, c, parser, value);
                }
                if (c == '}') {
                    break;
                }
                value.addChar(c);
                last = c;
            }

            return value;
        }

        function parseTagName(/*InputStream*/ input) {
            var c, last = '', name="";
            while (c=input.read()) {
                if (isSpecialSymbol(last, c)) {
                    throw "Tag name with symbols '"+last+c+"' is not allowed in '"+input.errorAt(input.getPosition()-1)+"'";
                }
                if (c==">") {
                    input.setRelative(-1);
                    return name;
                }
                if (c>='!') {
                    name+=c;
                    last = c;
                } else if (name) {
                    break;
                }
            }
            return name.toLowerCase();
        }

        function parseTagWithAttributes(/*InputStream*/ input, /*HtmlParser*/ parser, /*ConsoleStack*/ cs) {
            parser.parsingTag();
            try {
                var c, last;
                var /*String*/ tagName = parseTagName(input);

                //noinspection JSValidateTypes
                var /*Map*/ attributes = new Map();

                while (true) {
                    //find next parameter ignoring white spaces
                    last = '';
                    while (c = input.read()) {
                        if (c>='!') break;
                    }

                    var /*String*/ name = "";
                    if (c != '>') {
                        name+=c;
                        var notOK = input.getPosition();
                        //parse attribute name
                        while (c = input.read()) {
                            if (isSpecialSymbol(last, c)) {
                                if (cs) cs.addError("Symbol '"+last+c+"' is not allowed in '"+input.errorAt(input.getPosition()-1)+"'");
                                return null;
                            }
                            if (c=="=" || c == ">") {
                                notOK = false;
                                break;
                            }
                            if (c>='!') {
                                name+=c;
                                last = c;
                            } else {
                                while (c && c < '!') {
                                    last = c;
                                    c = input.read();
                                    if (c != '=' || c != '>') {
                                        input.setRelative(-1);
                                        break;
                                    }
                                }
                                notOK = false;
                                break;
                            }
                        }
                        if (notOK) {
                            if (cs) cs.addError("Can't find end of attribute in '"+input.errorAt(notOK)+"'");
                            return null;
                        }
                    } else {
                        break;
                    }

                    var /*ParsedText*/ value = null;
                    if (c == "=") {
                        //noinspection JSValidateTypes
                        notOK = input.getPosition();
                        //parse attribute value
                        var type = '';
                        last = c;
                        while (c=input.read()) {
                            if (c>='!') break
                        }
                        if (c=='"' || c=="'") {
                            last = type = c;
                            c = input.read();
                        }
                        value = new ParsedText();
                        if (c != type && c!='>') {
                            value.addChar(c);
                            last = c;
                            while (c = input.read()) {
                                if (isSpecialSymbol(last, c)) {
                                    parser.parsingSpecial(last);
                                    value.removeLastChar();
                                    value.addSpecial(parser.parseSpecial(readSpecialTag(input, parser), last));
                                    last = '';
                                    c = input.read();
                                }
                                if (type == '') {
                                    if (c == ">") {
                                        notOK = false;
                                        input.setRelative(-1);
                                        break;
                                    }
                                    if (c < '!') {
                                        notOK = false;
                                        break;
                                    }
                                } else {
                                    if (c == type) {
                                        notOK = false;
                                        break;
                                    } else if (c=='>') {
                                        if (cs) cs.addWarning("Can't find end of attribute value in '" + input.errorAt(notOK) + "'");
                                        notOK = false;
                                        break;
                                    }
                                }
                                value.addChar(c);
                                last = c;
                            }
                            if (notOK) {
                                if (cs) cs.addError("Can't find end of attribute value in '" + input.errorAt(notOK) + "'");
                                return null;
                            }
                        } else {
                            value.addChar("");
                        }
                    }

                    if (name!="/" || value !== null) attributes.put(name, value);
                    if (c=='>') {
                        break;
                    }
                }
                parser.parseTag(tagName, attributes);
                return tagName;
            } catch (e) {
                if (cs) cs.addError(e);
            }
            return null;
        }

        return {
            parseTagWithAttributes: parseTagWithAttributes,
            isSpecialSymbol: isSpecialSymbol,
            readSpecialTag: readSpecialTag,
            author: "Lubos Strapko (https://github.com/lubino)"
        };
    }

)
;
define('compiler/MetaFunction',[],function () {

    function MetaFunction(/*String*/ name, /*String[]*/ parameters, /*String*/ body, /*String*/ description, /*String[]*/ parametersDescription, /*String*/ returns) {
        this.name = name;
        this.parameters = parameters;
        if (body != null && body.length > 320) body = body.substring(0, 317) + "...";
        this.body = body;
        this.description = description;
        this.parametersDescription = parametersDescription;
        this.returns = returns;
    }

    return MetaFunction;
});
define('compiler/ServerRequest',['compiler/Map'],function (Map) {
    function ServerRequest(/*String*/ moduleName, /*String*/ functionName) {
        this.moduleName = moduleName;
        this.functions = new Map();
        this.functions.add(functionName);
    }

    return ServerRequest;
});
define('compiler/ItemDefinition',[], function () {

    function ItemDefinition(/*String*/ name, /*int*/ type) {

        this.name = name;
        this.type = type;

        //this. /*long*/ compiled = new Date().getTime();
        this. /*List<MetaFunction>*/ functions = null;
        this. /*List<ServerRequest>*/ calls = null;
        this. /*List<String>*/ components = null;
        this. /*List<String>*/ pages = null;
        this. /*List<String>*/ errors = null;
    }

    return ItemDefinition;
});
define('compiler/ConsoleStack',['compiler/Map', 'compiler/Strings', 'compiler/MetaFunction', 'compiler/ServerRequest', 'compiler/ItemDefinition'], function (Map, Strings, MetaFunction, ServerRequest, ItemDefinition) {


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
                cs.addError("Wrong JavaDoc format '"+Strings.trim(line)+"', line must start with '*' symbol.");
            }
            if (c=='*') {
                s++;
                while (s<l && line.charAt(s)==' ') s++;
            }

            if (line.indexOf("@param ",s)==s) {
                s+=7;
                while (s<l && line.charAt(s)==' ') s++;
                var /*int*/ a=s;
                while (s<l && line.charAt(s)>' ') s++;
                if (!paramsMap) paramsMap = new Map();
                var /*String*/ key = line.substring(a, s);
                if (paramsMap.put(key, Strings.trim(line.substring(s)))!=null && cs != null) {
                    cs.addError("Only one JavaDoc '@param "+key+"' tag is supported.");
                }
            } else if (line.indexOf("@return ",s)==s) {
                s+=8;
                if (returns != null && cs != null) {
                    cs.addError("Wrong JavaDoc format '"+Strings.trim(line)+"', only one '@return' tag is supported.");
                }
                returns = Strings.trim(line.substring(s));
            } else if (line.indexOf("@throws ",s)==s) {
                s+=8;
                while (s<l && line.charAt(s)==' ') s++;
                var /*int*/ b=s;
                while (s<l && line.charAt(s)>' ') s++;
                if (throwsMap == null) throwsMap = new Map();
                throwsMap.put(line.substring(b, s), Strings.trim(line.substring(s)));
            } else {
                var /*String*/ descriptionLine = Strings.trim(line.substring(s));
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
        if (this.logger) this.logger.log("Parser ERROR:", e);
    }

    function log(e) {
        if (this.logger) this.logger.log("Parser info:", e);
    }

    function isString(/*String*/ key) {
        var c = key.charAt(0);
        return (c == '"' || c == '\'') && key.charAt(key.length - 1) == c;
    }



    var /*String*/ PARAMETRIC_PAGE = "parametricPage";
    var /*String*/ PARAMETRIC_CALL = "parametricCall";
    var /*String*/ DYNAMIC_PAGES = "dynamicPages";

    function ConsoleStack(/*IOutputStreamCreator*/ osc, /*File*/ verbose, /*String*/ outputCharset, /*String*/ control, /*Boolean*/ silent, logger) {


        this.errors = null;
        this.fileName = null;
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
                this.isError.add(Strings.trim(split[i]));
            }
        }
    }

    function addFunction(/*String*/ name, /*String[]*/ functionParameters, /*String*/ jsBody, /*JavaDocStack*/ jds) {
        if (!this.silent) {
            if (jsBody != null) {
                var shrt = Strings.removeWhiteSpaces(jsBody);
                this.log("function " + name + "("+ functionParameters.join(", ") + ") {"+(shrt.length>200 ? shrt.substr(0,200)+'...' : shrt)+"}");
            } else this.log("Accepting empty function " + name + "("+ functionParameters.join(", ") + ") {}");
        }
        if (name == "beforeCreate") {
            if (functionParameters.length != 2 || functionParameters[0]=='instance')
                this.addError("Function 'beforeCreate' must have 2 function parameters (parameters, callBack) instead of ("+functionParameters.join(", ")+")!");
            if (!jsBody || jsBody.indexOf(functionParameters[1]+'()')==-1)
                this.addError("Function 'beforeCreate' must invoke 2nd function parameter '"+functionParameters[1]+"()' to run callback function!");
        } else if (name == "afterCreate") {
            if (functionParameters.length != 1 || functionParameters[0]=='parameters')
                this.addError("Function 'afterCreate' must have one function parameter (instance) instead of ("+functionParameters.join(", ")+")!");
        } else if (name == "onDestroy") {
            if (functionParameters.length != 1 || functionParameters[0]=='parameters')
                this.addError("Function 'onDestroy' must have one function parameter (instance) instead of ("+functionParameters.join(", ")+")!");
        } else if (name == "onChildDestroy") {
            if (functionParameters[0]=='instance')
                this.addError("Function 'onChildDestroy' must have two function parameters (child, instance) instead of ("+functionParameters.join(", ")+")!");
            if (functionParameters[1]=='child')
                this.addError("Function 'onChildDestroy' must have two function parameter (child, instance) instead of ("+functionParameters.join(", ")+")!");
        } else if (name == "extendInstance") {
            if (functionParameters[0]=='instance')
                this.addError("Function 'extendInstance' with first function parameter instance is not allowed!");
        }

        if (this.item != null) {
            if (jds == null && this.isError.contains("doc")) this.addError("JavaDoc for function '" + name + "' is missing.");
            if (this.item.functions == null) this.item.functions = new Map();
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

    function addWarning(/*String*/ e) {
        if (this.logger) this.logger.log("Parser warning:", e);
    }

    function addError(/*String*/ e) {
        this.logError(e);
        if (this.errors == null) this.errors = new Map();
        if (!this.errors.containsKey(this.item.name)) this.errors.put(this.item.name, this.item);
        if (this.item.errors == null) this.item.errors = new Map();
        this.item.errors.add(e);
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
        this.fileName = newFile;
        if (dir != null) {
            this.saveItem();
            this.item = new ItemDefinition(name, type);
        }
    }

    function startItem(name, type) {
        this.item = new ItemDefinition(name, type);
    }

    function skipping(/*String*/ fileName, /*String*/ newFile, /*int*/ type) {
        this.saveItem();
        this.addFile(fileName, type);
        this.fileName = newFile;
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

    function collectErrors(errors) {
        var result = '';
        var items = errors ? errors.values() : null;
        if (items) for (var i = 0; i < items.length;i++) {
            if (result) result += '\n  also ';
            result += items[i].name+': ';
            var keys = items[i].errors.keys();
            for (var l=0;l<keys.length;l++) {
                result += '\n    '+keys[l];
            }
        }
        return result;
    }

    function end(/*boolean*/ canEnd) {
        var now = new Date().getTime();
        this.log("Duration "+(now-this.started)/1000+"s");
        if (this.dir != null) {
            this.saveItem();
        }
        if (this.errors != null) {
            var /*String*/ message = "Can't parse " + collectErrors(this.errors);
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
        var /*String[]*/ parameters = [], i;
        for (i=0;i<paramTypes.length; i++) {
            var /*String*/ docName = paramTypes[i].getName();
            parameters.push(docName);
        }
        var /*JavaDocStack*/ jds = null;
        var /*String*/ body = null;
        if (metaFunction != null) {
            body = metaFunction.body;
            var /*String*/ jD = "/**";
            if (metaFunction.description != null) jD += "\n * " + metaFunction.description;
            if (metaFunction.parameters != null) {
                parameters = [];
                for (i=0;i<metaFunction.parameters.length;i++) {
                    var parameter = metaFunction.parameters[i];
                    parameters.push(parameter);
                    if (metaFunction.parametersDescription != null)
                        jD += "\n * @param " + parameter + " " + metaFunction.parametersDescription[i];
                }
            }
            if (metaFunction.returns != null) jD += "\n * @return " + metaFunction.returns;
            jD += "\n */";
            jds = new JavaDocStack(jD, this);
        }
        this.addFunction(name, parameters, className + "#" + body, jds);
    }

    ConsoleStack.prototype.addError = addError;
    ConsoleStack.prototype.addWarning = addWarning;
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
    ConsoleStack.prototype.startItem = startItem;

    ConsoleStack.JavaDocStack = JavaDocStack;

    return ConsoleStack;
});
define('compiler/JSFunctions',['compiler/Map', 'compiler/ConsoleStack', 'compiler/Strings', 'compiler/Brackets'],function (Map, ConsoleStack, Strings, Brackets) {

    var /*String[]*/ KEYWORDS = ["parameters", "instance", "static", "component", "document", "window", "event"];
    var /*String*/ KEYWORD = "var.";
    var /*int*/ KEYWORD_LEN = KEYWORD.length;


    function JSFunctions(/*String*/ name, /*String[]*/ parameters, /*String*/ body, /*String*/ javaDoc) {
        this.name = name;
        this.parameters = parameters;
        this.body = body;
        this.javaDoc = javaDoc;
    }


    function functionName(/*String*/ js, /*int*/ position, /*int*/ length) {
        var /*String 1*/ a;
        while (position < length && (a = js.charAt(position)) < '!') position++;
        if (a == '(') {
            //anonymous function
            return "";
        }
        var /*int*/ start = position;
        while (position < length && !isSpace(js.charAt(position))) position++;
        var /*int*/ actualEnd = position;
        while (position < length && (a = js.charAt(position)) < '!') position++;
        return a == '(' ? js.substring(start, actualEnd) : null;
    }

    function addFunction(/*Map*/ map, /*String*/ js, /*ConsoleStack*/ cs, /*int*/ position, /*int*/ length, /*String*/ name) {
        var /*String*/ javaDoc = null;
        var jds = null;
        var /*int*/ i, /*int*/ start;
        var /*String 1*/ c;
        if (position > 5) {
            i = position - 1;
            while (i > 5 && (c = js.charAt(i)) < '!') i--;
            if (js.charAt(i - 1) == '*' && c == '/') {
                start = i - 4;
                while (start >= 0 && (js.charAt(start) != '/' || js.charAt(start + 1) != '*' || js.charAt(start + 2) != '*'))
                    start--;
                if (start != -1) {
                    javaDoc = js.substring(start, i + 1);
                    jds = new ConsoleStack.JavaDocStack(javaDoc, cs);
                }
            }
        }

        var /*Brackets*/ brackets = Brackets.findFirst(js, position + 8, length - 1);
        if (brackets != null) {
            i = brackets.start;
            var /*int*/ j = brackets.end + 1;
            var /*String*/ parameters = js.substring(i, j);
            var /*String[]*/ functionParameters = [];
            if (parameters && parameters.length>2) {
                var /*String[]*/ paramsWithoutBrackets = Strings.trim(parameters.substr(1, parameters.length - 2)).split(",");
                for (var p = 0; p < paramsWithoutBrackets.length; p++) {
                    functionParameters.push(Strings.trim(paramsWithoutBrackets[p]));
                }
            }

            brackets = Brackets.findFirst(js, j, length - 1);

            if (!brackets) return j;

            var /*int*/ l = brackets.end+1;
            var /*int*/ level = 0;
            start = j;
            var /*int*/ end = 0;
            var endChar = ' ', older = ' ';
            var /*boolean*/ isString = false;
            while (j < l) {
                c = js.charAt(j++);
                if (isString) {
                    isString = c != endChar || older == '\\';
                } else if (c == (endChar = '"') || c == (endChar = '\'')) {
                    isString = true;
                } else if (c == '{') {
                    if (level == 0) start = j - 1;
                    level++;
                } else if (c == '}') {
                    level--;
                    if (level < 1) {
                        end = j - 1;
                        j = l;
                    }
                } else if (cs != null && c == '(') {
                    var /*String*/ last = Strings.trim(js.substring(Math.max(j - 20, 0), j - 1));
                    var /*boolean*/ isCall = Strings.endsWith(last, ".createRequest");
                    if (!isCall) isCall = Strings.endsWith(last, ".request");
                    if (isCall || Strings.endsWith(last, ".openPage")) {
                        var /*String*/ t = "";
                        var /*int*/ k = j;
                        while (k < l && ((c = js.charAt(k)) != ',' && c != ')')) {
                            t += c;
                            k++;
                        }
                        t = Strings.trim(t);
                        if (isCall) cs.addCall(t);
                        else cs.addPage(t);
                    }
                }
                older = c;
            }
            var /*boolean*/ added = false;
            if (start + 1 < end) {
                while (start++ < end) {
                    if (js.charAt(start) >= '!') break;
                }
                while (start < end--) {
                    if (js.charAt(end) >= '!') break;
                }
                if (start < end) {
                    added = true;
                    var /*String*/ jsBody = js.substring(start, end + 1);
                    if (cs != null) cs.addFunction(name, functionParameters, jsBody, jds);
                    map.put(name, new JSFunctions(name, functionParameters, jsBody, javaDoc));
                } else {
                    if (cs != null) cs.addFunction(name, functionParameters, null, jds);
                    map.put(name, new JSFunctions(name, functionParameters, "", javaDoc));
                }
            } else {
                if (cs != null) {
                    cs.addWarning("Error processing function '" + name + parameters+"' (start="+start+", end="+end+")");
                }
                end = brackets.end + 1;
            }
            position = added ? -end : end;
        }
        return position;

    }


    /**
     * @param map map of JS functions (Map<String, JSFunctions>)
     * @param js  JavaScript
     * @param cs  ConsoleStack
     * @return {boolean} if the functions is added
     */
    function parseFunctions(/*Map*/ map, /*String*/ js, /*ConsoleStack*/ cs) {
        var /*boolean*/ result = false;
        var /*int*/ position = -1;
        var /*int*/ end = js.length;
        var /*String 1*/ lastChar = ' ';
        while (++position < end) {
            var /*String 1*/ q = js.charAt(position);
            if (q == 'f' && lastChar < '!' && position + 10 < end && js.substring(position + 1, position + 8)==("unction")) {
                var /*String*/ name = functionName(js, position + 8, end);
                if (name != null) {
                    if (name.length == 0) {
                        var /*int*/ i = 0;
                        while (map.containsKey(name = "anonymous" + i)) i++;
                        if (cs != null) cs.addWarning("Unsupported anonymous function '" + name + "' found.");
                    }
                    if (map.containsKey(name)) {
                        if (cs != null) cs.addError("There in not only one '" + name + "' function.");
                        var /*int*/ i = 0;
                        var /*String*/ newName;
                        while (map.containsKey(newName = name + i)) i++;
                        name = newName;
                    }
                    position = addFunction(map, js, cs, position, end, name);
                    if (position < 0) {
                        result = true;
                        position = -position;
                    }
                    q = ' ';
                }
            } else if (q == '\'' || q == '"') {
                position++;
                while (position < end && (js.charAt(position) != q || js.charAt(position - 1) == '\\')) position++;
                q = ' ';
            } else if (q == '/') {
                var next = js.charAt(position + 1);
                if (next == '/') {
                    position += 2;
                    while (position < end && js.charAt(position) != '\n') position++;
                    q = ' ';
                } else if (next == '*') {
                    position += 2;
                    while (position < end && (js.charAt(position) != '/' || js.charAt(position - 1) != '*'))
                        position++;
                    q = ' ';
                }
            }
            lastChar = q;
        }
        return result;
    }

    function extractSpecialTags(/*String*/ htmlJS, /*DependenciesMapper*/ dependenciesMapper, /*String*/ Fbefore, /*String*/ after, /*String 1*/ stringChar) {
        var /*int*/ i = 0;
        while ((i = htmlJS.indexOf("@{", i) + 2) != 1) {
            var /*int*/ end = Brackets.findEndingBracket(htmlJS, i - 1, '{', '}');
            if (end != -1) {
                //int len = htmlJS.length;
                var /*String*/ resource = htmlJS.substring(i, end);
                var /*int*/ p;
                if (resource.length > 0 && (p = resource.indexOf('.')) > 0) {
                    var /*String*/ name = resource.substring(0, p);
                    var key = resource.substr(p+1);
                    htmlJS = htmlJS.substring(0, i - 2) + before + dependenciesMapper.get(name)+ "('" + key + "')" + after + htmlJS.substring(end + 1);
                }
            }

        }
        i = 0;
        var /*String*/ s = stringChar + " + (";
        var /*String*/ s1 = "\\" + stringChar;
        var /*String*/ s2 = stringChar;
        var /*String*/ s3 = ") + " + stringChar;
        while ((i = htmlJS.indexOf("${", i) + 2) != 1) {
            var /*int*/ end = Brackets.findEndingBracket(htmlJS, i - 1, '{', '}');
            if (end != -1) {
                //int len = htmlJS.length;
                var /*String*/ js = htmlJS.substring(i, end);
                if (js.length > 0) {
                    htmlJS = htmlJS.substring(0, i - 2) + s + Strings.replace(js,s1, s2) + s3 + htmlJS.substring(end + 1);
                }
            }

        }
        return htmlJS;
    }

    /**
     * Parses id or onClick variable: "parameters.items[i].names[j]"
     *
     *
     * @param js                 JavaString
     * @param start              index of first character
     * @param end                index of last character
     * @param parentStatic       should be evaluated by eval()
     * @param safeValue          webJS function
     * @param dependenciesMapper dependenciesMapper
     * @param lowerLevel
     * @return {ParsedVariable} parsed JavaScript
     */
    function parseTagVariables(/*String*/ js, /*int*/ start, /*int*/ end, /*Boolean*/ parentStatic, /*String*/ safeValue, /*DependenciesMapper*/ dependenciesMapper, /*boolean*/ lowerLevel) {
        while (start <= end && js.charAt(start) == ' ') start++;
        while (start <= end && js.charAt(end) == ' ') end--;
        var /*boolean*/ isStatic;
        if (lowerLevel) {
            isStatic = false;
            for (var l=0;l<KEYWORDS.length;l++) {
                var  keyword = KEYWORDS[l];
                var /*int*/ length = keyword.length;
                var /*int*/ lastLetter = start + length - 1;
                if (lastLetter <= end && Strings.regionMatches(js, start, keyword) && (lastLetter == end || isSpace(js.charAt(lastLetter + 1)))) {
                    isStatic = true;
                    break;
                }
            }
        } else if (typeof parentStatic != "boolean") {
            isStatic = start + KEYWORD_LEN > end || !Strings.regionMatches(js, start, KEYWORD);
            if (!isStatic) start += KEYWORD_LEN;
        } else isStatic = parentStatic;

        var /*String*/ variable = null;

        var /*Brackets*/ first = Brackets.findFirst(js, start, end);
        if (first != null) {
            var /*boolean*/ json = first.starting == '{';
            if (first.start + 1 < first.end) {
                var /*String*/ inVar;
                var /*boolean*/ isStaticInVar;
                var /*String*/ startingBracket = first.starting;
                var /*String*/ endingBracket = first.ending;
                if (json && first.start > 0 && js.charAt(first.start - 1) == '$') {
                    json = false;
                    isStaticInVar = false;
                    //TODO
                    inVar = extractSpecialTags(js.substring(first.start + 1, first.end), dependenciesMapper, "\" + " , " + \"", '"');
                    first.start -= 1;
                    endingBracket = startingBracket = "";
                } else if (first.comas != null) {
                    isStaticInVar = false;
                    inVar = null;
                    var /*int*/ fromIndex = first.start + 1;
                    var /*String*/ attName = "";
                    for (var i=0;i< first.comas.length;i++) {
                        var /*int*/ toIndex = first.comas[i];
                        if (json) {
                            var /*int*/ endIndex = js.indexOf(':', fromIndex);
                            if (endIndex >= toIndex)
                                throw "Wrong JSON object '" + js.substring(fromIndex, toIndex) + "'";
                            attName = Strings.trim(js.substring(fromIndex, endIndex)) + ": ";
                            if (attName.length == 2)
                                throw "Wrong JSON object '" + js.substring(fromIndex, toIndex) + "'";
                            fromIndex = endIndex + 1;
                        }
                        var /*ParsedVariable*/ parsed = parseTagVariables(js, fromIndex, toIndex - 1, null, safeValue, dependenciesMapper, true);
                        if (json) {
                            if (inVar == null) {
                                inVar = attName + parsed.variable;
                            } else {
                                inVar += ", " + attName + parsed.variable;
                            }

                        } else if (inVar == null) {
                            isStaticInVar = parsed.isStatic;
                            if (isStaticInVar) {
                                inVar = parsed.variable;
                            } else {
                                inVar = safeValue + "(" + parsed.variable + ")";
                            }
                        } else {
                            if (isStaticInVar && parsed.isStatic) {
                                inVar = '"' + Strings.trimOne(inVar) + ", " + Strings.trimOne(parsed.variable) + '"';
                            } else if (isStaticInVar) {
                                inVar = '"' + Strings.trimOne(inVar) + ', " + ' + safeValue + "(" + parsed.variable + ') + ""';
                            } else if (parsed.isStatic) {
                                isStaticInVar = true;
                                inVar = '"" + ' + inVar + " + \", " + Strings.trimOne(parsed.variable) + '"';
                            } else {
                                inVar += ' + ", " + ' + safeValue + "(" + parsed.variable + ")";
                            }
                        }
                        fromIndex = toIndex + 1;
                    }

                    if (json && !isStaticInVar) {
                        isStaticInVar = true;
                        inVar = '"' + inVar + '"';
                    }

                } else {
                    var /*int*/ fromIndex = first.start + 1;
                    var /*int*/ toIndex = first.end;
                    var /*String*/ attName = "";
                    if (json) {
                        var /*int*/ endIndex = js.indexOf(':', fromIndex);
                        if (endIndex == -1 || endIndex >= toIndex)
                            throw "Wrong JSON object '" + js.substring(fromIndex, toIndex) + "'";
                        attName = Strings.trim(js.substring(fromIndex, endIndex)) + ": ";
                        if (attName.length == 2)
                            throw "Wrong JSON object '" + js.substring(fromIndex, toIndex) + "'";
                        fromIndex = endIndex + 1;
                        /*ParsedVariable*/ inner = parseTagVariables(js, fromIndex, toIndex - 1, null, safeValue, dependenciesMapper, true);
                        isStaticInVar = true;
                        if (inner.isStatic) {
                            inVar = '"' + attName + Strings.trimOne(inner.variable) + '"';
                        } else {
                            inVar = '"' + attName + '" + ' + safeValue + "(" + inner.variable + ') + ""';
                        }
                    } else {
                        var /*ParsedVariable*/ inner = parseTagVariables(js, fromIndex, toIndex - 1, null, safeValue, dependenciesMapper, true);
                        isStaticInVar = inner.isStatic;
                        if (isStaticInVar) {
                            inVar = inner.variable;
                        } else {
                            inVar = safeValue + "(" + inner.variable + ")";
                        }
                    }
                }


                //if (!isStatic && isStaticInVar) isStatic = true;

                var /*String*/ starting = js.substring(start, first.start);
                var /*String*/ beforeEnd;
                if (isStatic && isStaticInVar) {
                    beforeEnd = "\"" + starting + startingBracket + Strings.trimOne(inVar) + endingBracket + "\"";
                } else if (isStatic) {
                    beforeEnd = "\"" + starting + startingBracket + "\" + " + inVar + " + \"" + endingBracket + "\"";
                } else if (isStaticInVar) {
                    isStatic = true;
                    if (starting.length == 0) {
                        beforeEnd = "\"" + startingBracket + Strings.trimOne(inVar) + endingBracket + "\"";
                    } else {
                        beforeEnd = "\"\" + " + starting + " + \"" + startingBracket + Strings.trimOne(inVar) + endingBracket + "\"";
                        //throw new RuntimeException("Local variables are not supported in this construction: " + beforeEnd);
                    }
                } else {
                    beforeEnd = starting + startingBracket + inVar + endingBracket;
                }
                if (first.end < end) {
                    //there is something after ")", "}"  or "]"
                    var /*ParsedVariable*/ endParsedVar = parseTagVariables(js, first.end + 1, end, isStatic, safeValue, dependenciesMapper, lowerLevel);
                    var /*boolean*/ isStaticEndVar = endParsedVar.isStatic;
                    var /*String*/ endVar = endParsedVar.variable;
                    if (isStatic && isStaticEndVar) {
                        variable = '"' + Strings.trimOne(beforeEnd) + Strings.trimOne(endVar) + '"';
                    } else if (isStatic) {
                        variable = '"' + Strings.trimOne(beforeEnd) + '" + ' + endVar + ' + ""';
                    } else if (isStaticEndVar) {
                        //isStatic = true;
                        variable = '"" + ' + beforeEnd + ' + "' + Strings.trimOne(endVar) + '"';
                        throw "Local variables are not supported in this construction: " + variable;
                    } else {
                        variable = beforeEnd + endVar;
                    }
                } else {
                    variable = beforeEnd;
                }
            }
        }
        if (variable == null) {
            variable = js.substring(start, end + 1);
            if (isStatic) variable = '"' + variable + '"';
        }
        /*
         String actualVariable = "";
         while (i <= end) {
         char c = js.charAt(i);
         if ((c>='a' && c<='z')||(c>='A' && c<='Z')||(c>='A' && c<='Z')||)
         }
         */
        var /*boolean*/ evaluate = isStatic;
        if (!isStatic && variable.length > 0 && variable.charAt(0) == '\'') {
            isStatic = true;
            variable = "\"" + variable + "\"";
        }
        return new ParsedVariable(variable, isStatic, evaluate);
    }

    function ParsedVariable(variable, isStatic, evaluate) {
        this.variable = variable;
        this.isStatic = isStatic;
        this.evaluate = evaluate;
    }

    function stringToCode(/*String*/ s, /*String*/ safeValue) {
        var /*int*/ j;
        if (s.charAt(0) == '"' && s.charAt(j = s.length - 1) == '"') {
            var /*int*/ i = 0;
            var /*boolean*/ instr = true;
            var last = ' ';
            var sb = "";
            var /*String*/ outOfStr = "";
            while (++i < j) {
                var c = s.charAt(i);
                if (c == '"' && last != '\'') {
                    instr = !instr;
                    if (instr) {
                        var /*int*/ st = 0, en = outOfStr.length;
                        if (Strings.startsWith(outOfStr, " + ")) st += 3;
                        if (Strings.endsWith(outOfStr," + ")) en -= 3;
                        sb += Strings.replace(outOfStr.substring(st, en),safeValue, "");
                        outOfStr = "";
                    }
                } else {
                    if (instr) sb += c;
                    else outOfStr += c;
                }


                last = c == '\\' && last == "'" ? ' ' : c;
            }
            return sb;
        }
        return null;
    }

    function isSpace(c) {
        return !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c == '_'));
    }


    JSFunctions.parseFunctions = parseFunctions;
    JSFunctions.parseTagVariables = parseTagVariables;
    JSFunctions.stringToCode = stringToCode;
    JSFunctions.functionName = functionName;


    return JSFunctions
});
define('compiler/beautify',[], function () {
    /*jslint onevar: false, plusplus: false */
    /*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
    /*

     JS Beautifier
     ---------------


     Written by Einar Lielmanis, <einar@jsbeautifier.org>
     http://jsbeautifier.org/

     Originally converted to javascript by Vital, <vital76@gmail.com>
     "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>

     You are free to use this in any way you want, in case you find this useful or working for you.

     Usage:
     js_beautify(js_source_text);
     js_beautify(js_source_text, options);

     The options are:
     indent_size (default 4)          - indentation size,
     indent_char (default space)      - character to indent with,
     preserve_newlines (default true) - whether existing line breaks should be preserved,
     max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

     jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

     jslint_happy   !jslint_happy
     ---------------------------------
     function ()      function()

     brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "expand-strict"
     put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.

     expand-strict: put brace on own line even in such cases:

     var a =
     {
     a: 5,
     b: 6
     }
     This mode may break your scripts - e.g "return { a: 1 }" will be broken into two lines, so beware.

     space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

     unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

     e.g

     js_beautify(js_source_text, {
     'indent_size': 1,
     'indent_char': '\t'
     });


     */



    function js_beautify(js_source_text, options) {

        var input, output, token_text, last_type, last_text, last_last_text, last_word, flags, flag_store, indent_string;
        var whitespace, wordchar, punct, parser_pos, line_starters, digits;
        var prefix, token_type, do_block_just_closed;
        var wanted_newline, just_added_newline, n_newlines;
        var preindent_string = '';


        // Some interpreters have unexpected results with foo = baz || bar;
        options = options ? options : {};

        var opt_brace_style;

        // compatibility
        if (options.space_after_anon_function !== undefined && options.jslint_happy === undefined) {
            options.jslint_happy = options.space_after_anon_function;
        }
        if (options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
            opt_brace_style = options.braces_on_own_line ? "expand" : "collapse";
        }
        opt_brace_style = options.brace_style ? options.brace_style : (opt_brace_style ? opt_brace_style : "collapse");


        var opt_indent_size = options.indent_size ? options.indent_size : 4,
            opt_indent_char = options.indent_char ? options.indent_char : ' ',
            opt_preserve_newlines = typeof options.preserve_newlines === 'undefined' ? true : options.preserve_newlines,
            opt_break_chained_methods = typeof options.break_chained_methods === 'undefined' ? false : options.break_chained_methods,
            opt_max_preserve_newlines = typeof options.max_preserve_newlines === 'undefined' ? false : options.max_preserve_newlines,
            opt_jslint_happy = options.jslint_happy === 'undefined' ? false : options.jslint_happy,
            opt_keep_array_indentation = typeof options.keep_array_indentation === 'undefined' ? false : options.keep_array_indentation,
            opt_space_before_conditional = typeof options.space_before_conditional === 'undefined' ? true : options.space_before_conditional,
            opt_unescape_strings = typeof options.unescape_strings === 'undefined' ? false : options.unescape_strings;

        just_added_newline = false;

        // cache the source's length.
        var input_length = js_source_text.length;

        function trim_output(eat_newlines) {
            eat_newlines = typeof eat_newlines === 'undefined' ? false : eat_newlines;
            while (output.length && (output[output.length - 1] === ' '
                || output[output.length - 1] === indent_string
                || output[output.length - 1] === preindent_string
                || (eat_newlines && (output[output.length - 1] === '\n' || output[output.length - 1] === '\r')))) {
                output.pop();
            }
        }

        function trim(s) {
            return s.replace(/^\s\s*|\s\s*$/, '');
        }

        // we could use just string.split, but
        // IE doesn't like returning empty strings
        function split_newlines(s) {
            //return s.split(/\x0d\x0a|\x0a/);

            s = s.replace(/\x0d/g, '');
            var out = [],
                idx = s.indexOf("\n");
            while (idx !== -1) {
                out.push(s.substring(0, idx));
                s = s.substring(idx + 1);
                idx = s.indexOf("\n");
            }
            if (s.length) {
                out.push(s);
            }
            return out;
        }

        function force_newline() {
            var old_keep_array_indentation = opt_keep_array_indentation;
            opt_keep_array_indentation = false;
            print_newline();
            opt_keep_array_indentation = old_keep_array_indentation;
        }

        function print_newline(ignore_repeated, reset_statement_flags) {

            flags.eat_next_space = false;
            if (opt_keep_array_indentation && is_array(flags.mode)) {
                return;
            }

            ignore_repeated = typeof ignore_repeated === 'undefined' ? true : ignore_repeated;
            reset_statement_flags = typeof reset_statement_flags === 'undefined' ? true : reset_statement_flags;

            if (reset_statement_flags) {
                flags.if_line = false;
                flags.chain_extra_indentation = 0;
            }

            trim_output();

            if (!output.length) {
                return; // no newline on start of file
            }

            if (output[output.length - 1] !== "\n" || !ignore_repeated) {
                just_added_newline = true;
                output.push("\n");
            }
            if (preindent_string) {
                output.push(preindent_string);
            }
            for (var i = 0; i < flags.indentation_level + flags.chain_extra_indentation; i += 1) {
                print_indent_string();
            }
            if (flags.var_line && flags.var_line_reindented) {
                print_indent_string(); // skip space-stuffing, if indenting with a tab
            }
        }

        function print_indent_string() {
            // Never indent your first output indent at the start of the file
            if(last_text != '') {
                output.push(indent_string);
            }
        }

        function print_single_space() {

            var last_output = ' ';

            if (flags.eat_next_space) {
                flags.eat_next_space = false;
            } else if (last_type === 'TK_COMMENT') {
                print_newline();
            } else {
                if (output.length) {
                    last_output = output[output.length - 1];
                }
                if (last_output !== ' ' && last_output !== '\n' && last_output !== indent_string) { // prevent occassional duplicate space
                    output.push(' ');
                }
            }
        }


        function print_token() {
            just_added_newline = false;
            flags.eat_next_space = false;
            output.push(token_text);
        }

        function indent() {
            flags.indentation_level += 1;
        }


        function remove_indent() {
            if (output.length && output[output.length - 1] === indent_string) {
                output.pop();
            }
        }

        function set_mode(mode) {
            if (flags) {
                flag_store.push(flags);
            }
            flags = {
                previous_mode: flags ? flags.mode : 'BLOCK',
                mode: mode,
                var_line: false,
                var_line_tainted: false,
                var_line_reindented: false,
                in_html_comment: false,
                if_line: false,
                chain_extra_indentation: 0,
                in_case_statement: false, // switch(..){ INSIDE HERE }
                in_case: false, // we're on the exact line with "case 0:"
                case_body: false, // the indented case-action block
                eat_next_space: false,
                indentation_level: (flags ? flags.indentation_level + ((flags.var_line && flags.var_line_reindented) ? 1 : 0) : 0),
                ternary_depth: 0
            };
        }

        function is_array(mode) {
            return mode === '[EXPRESSION]' || mode === '[INDENTED-EXPRESSION]';
        }

        function is_expression(mode) {
            return in_array(mode, ['[EXPRESSION]', '(EXPRESSION)', '(FOR-EXPRESSION)', '(COND-EXPRESSION)']);
        }

        function restore_mode() {
            do_block_just_closed = flags.mode === 'DO_BLOCK';
            if (flag_store.length > 0) {
                var mode = flags.mode;
                flags = flag_store.pop();
                flags.previous_mode = mode;
            }
        }

        function all_lines_start_with(lines, c) {
            for (var i = 0; i < lines.length; i++) {
                var line = trim(lines[i]);
                if (line.charAt(0) !== c) {
                    return false;
                }
            }
            return true;
        }

        function is_special_word(word) {
            return in_array(word, ['case', 'return', 'do', 'if', 'throw', 'else']);
        }

        function in_array(what, arr) {
            for (var i = 0; i < arr.length; i += 1) {
                if (arr[i] === what) {
                    return true;
                }
            }
            return false;
        }

        function unescape_string(s) {
            var esc = false,
                out = '',
                pos = 0,
                s_hex = '',
                escaped = 0,
                c;

            while (esc || pos < s.length) {

                c = s.charAt(pos);
                pos++;

                if (esc) {
                    esc = false;
                    if (c === 'x') {
                        // simple hex-escape \x24
                        s_hex = s.substr(pos, 2);
                        pos += 2;
                    } else if (c === 'u') {
                        // unicode-escape, \u2134
                        s_hex = s.substr(pos, 4);
                        pos += 4;
                    } else {
                        // some common escape, e.g \n
                        out += '\\' + c;
                        continue;
                    }
                    if ( ! s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
                        // some weird escaping, bail out,
                        // leaving whole string intact
                        return s;
                    }

                    escaped = parseInt(s_hex, 16);

                    if (escaped >= 0x00 && escaped < 0x20) {
                        // leave 0x00...0x1f escaped
                        if (c === 'x') {
                            out += '\\x' + s_hex;
                        } else {
                            out += '\\u' + s_hex;
                        }
                        continue;
                    } else if (escaped == 0x22 || escaped === 0x27 || escaped == 0x5c) {
                        // single-quote, apostrophe, backslash - escape these
                        out += '\\' + String.fromCharCode(escaped);
                    } else if (c === 'x' && escaped > 0x7e && escaped <= 0xff) {
                        // we bail out on \x7f..\xff,
                        // leaving whole string escaped,
                        // as it's probably completely binary
                        return s;
                    } else {
                        out += String.fromCharCode(escaped);
                    }
                } else if (c == '\\') {
                    esc = true;
                } else {
                    out += c;
                }
            }
            return out;
        }

        function look_up(exclude) {
            var local_pos = parser_pos;
            var c = input.charAt(local_pos);
            while (in_array(c, whitespace) && c !== exclude) {
                local_pos++;
                if (local_pos >= input_length) {
                    return 0;
                }
                c = input.charAt(local_pos);
            }
            return c;
        }

        function get_next_token() {
            var i;

            n_newlines = 0;

            if (parser_pos >= input_length) {
                return ['', 'TK_EOF'];
            }

            wanted_newline = false;

            var c = input.charAt(parser_pos);
            parser_pos += 1;


            var keep_whitespace = opt_keep_array_indentation && is_array(flags.mode);

            if (keep_whitespace) {

                var whitespace_count = 0;

                while (in_array(c, whitespace)) {

                    if (c === "\n") {
                        trim_output();
                        output.push("\n");
                        just_added_newline = true;
                        whitespace_count = 0;
                    } else {
                        if (just_added_newline) {
                            if (c === indent_string) {
                                output.push(indent_string);
                            } else {
                                if (c !== '\r') {
                                    output.push(' ');
                                }
                            }
                        }
                    }

                    if (parser_pos >= input_length) {
                        return ['', 'TK_EOF'];
                    }

                    c = input.charAt(parser_pos);
                    parser_pos += 1;

                }

            } else {
                while (in_array(c, whitespace)) {

                    if (c === "\n") {
                        n_newlines += ((opt_max_preserve_newlines) ? (n_newlines <= opt_max_preserve_newlines) ? 1 : 0 : 1);
                    }


                    if (parser_pos >= input_length) {
                        return ['', 'TK_EOF'];
                    }

                    c = input.charAt(parser_pos);
                    parser_pos += 1;

                }

                if (opt_preserve_newlines) {
                    if (n_newlines > 1) {
                        for (i = 0; i < n_newlines; i += 1) {
                            print_newline(i === 0);
                            just_added_newline = true;
                        }
                    }
                }
                wanted_newline = n_newlines > 0;
            }


            if (in_array(c, wordchar)) {
                if (parser_pos < input_length) {
                    while (in_array(input.charAt(parser_pos), wordchar)) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos === input_length) {
                            break;
                        }
                    }
                }

                // small and surprisingly unugly hack for 1E-10 representation
                if (parser_pos !== input_length && c.match(/^[0-9]+[Ee]$/) && (input.charAt(parser_pos) === '-' || input.charAt(parser_pos) === '+')) {

                    var sign = input.charAt(parser_pos);
                    parser_pos += 1;

                    var t = get_next_token();
                    c += sign + t[0];
                    return [c, 'TK_WORD'];
                }

                if (c === 'in') { // hack for 'in' operator
                    return [c, 'TK_OPERATOR'];
                }
                if (wanted_newline && last_type !== 'TK_OPERATOR'
                    && last_type !== 'TK_EQUALS'
                    && !flags.if_line && (opt_preserve_newlines || last_text !== 'var')) {
                    print_newline();
                }
                return [c, 'TK_WORD'];
            }

            if (c === '(' || c === '[') {
                return [c, 'TK_START_EXPR'];
            }

            if (c === ')' || c === ']') {
                return [c, 'TK_END_EXPR'];
            }

            if (c === '{') {
                return [c, 'TK_START_BLOCK'];
            }

            if (c === '}') {
                return [c, 'TK_END_BLOCK'];
            }

            if (c === ';') {
                return [c, 'TK_SEMICOLON'];
            }

            if (c === '/') {
                var comment = '';
                // peek for comment /* ... */
                var inline_comment = true;
                if (input.charAt(parser_pos) === '*') {
                    parser_pos += 1;
                    if (parser_pos < input_length) {
                        while (parser_pos < input_length &&
                            ! (input.charAt(parser_pos) === '*' && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === '/')) {
                            c = input.charAt(parser_pos);
                            comment += c;
                            if (c === "\n" || c === "\r") {
                                inline_comment = false;
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                break;
                            }
                        }
                    }
                    parser_pos += 2;
                    if (inline_comment && n_newlines === 0) {
                        return ['/*' + comment + '*/', 'TK_INLINE_COMMENT'];
                    } else {
                        return ['/*' + comment + '*/', 'TK_BLOCK_COMMENT'];
                    }
                }
                // peek for comment // ...
                if (input.charAt(parser_pos) === '/') {
                    comment = c;
                    while (input.charAt(parser_pos) !== '\r' && input.charAt(parser_pos) !== '\n') {
                        comment += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            break;
                        }
                    }
                    if (wanted_newline) {
                        print_newline();
                    }
                    return [comment, 'TK_COMMENT'];
                }

            }

            if (c === "'" || // string
                c === '"' || // string
                (c === '/' &&
                    ((last_type === 'TK_WORD' && is_special_word(last_text)) ||
                        (last_text === ')' && in_array(flags.previous_mode, ['(COND-EXPRESSION)', '(FOR-EXPRESSION)'])) ||
                        (last_type === 'TK_COMMA' || last_type === 'TK_COMMENT' || last_type === 'TK_START_EXPR' || last_type === 'TK_START_BLOCK' || last_type === 'TK_END_BLOCK' || last_type === 'TK_OPERATOR' || last_type === 'TK_EQUALS' || last_type === 'TK_EOF' || last_type === 'TK_SEMICOLON')))) { // regexp
                var sep = c,
                    esc = false,
                    has_char_escapes = false,
                    resulting_string = c;

                if (parser_pos < input_length) {
                    if (sep === '/') {
                        //
                        // handle regexp separately...
                        //
                        var in_char_class = false;
                        while (esc || in_char_class || input.charAt(parser_pos) !== sep) {
                            resulting_string += input.charAt(parser_pos);
                            if (!esc) {
                                esc = input.charAt(parser_pos) === '\\';
                                if (input.charAt(parser_pos) === '[') {
                                    in_char_class = true;
                                } else if (input.charAt(parser_pos) === ']') {
                                    in_char_class = false;
                                }
                            } else {
                                esc = false;
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                // incomplete string/rexp when end-of-file reached.
                                // bail out with what had been received so far.
                                return [resulting_string, 'TK_STRING'];
                            }
                        }

                    } else {
                        //
                        // and handle string also separately
                        //
                        while (esc || input.charAt(parser_pos) !== sep) {
                            resulting_string += input.charAt(parser_pos);
                            if (esc) {
                                if (input.charAt(parser_pos) === 'x' || input.charAt(parser_pos) === 'u') {
                                    has_char_escapes = true;
                                }
                                esc = false;
                            } else {
                                esc = input.charAt(parser_pos) === '\\';
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                // incomplete string/rexp when end-of-file reached.
                                // bail out with what had been received so far.
                                return [resulting_string, 'TK_STRING'];
                            }
                        }

                    }
                }

                parser_pos += 1;
                resulting_string += sep;

                if (has_char_escapes && opt_unescape_strings) {
                    resulting_string = unescape_string(resulting_string);
                }

                if (sep === '/') {
                    // regexps may have modifiers /regexp/MOD , so fetch those, too
                    while (parser_pos < input_length && in_array(input.charAt(parser_pos), wordchar)) {
                        resulting_string += input.charAt(parser_pos);
                        parser_pos += 1;
                    }
                }
                return [resulting_string, 'TK_STRING'];
            }

            if (c === '#') {


                if (output.length === 0 && input.charAt(parser_pos) === '!') {
                    // shebang
                    resulting_string = c;
                    while (parser_pos < input_length && c !== '\n') {
                        c = input.charAt(parser_pos);
                        resulting_string += c;
                        parser_pos += 1;
                    }
                    output.push(trim(resulting_string) + '\n');
                    print_newline();
                    return get_next_token();
                }



                // Spidermonkey-specific sharp variables for circular references
                // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
                // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
                var sharp = '#';
                if (parser_pos < input_length && in_array(input.charAt(parser_pos), digits)) {
                    do {
                        c = input.charAt(parser_pos);
                        sharp += c;
                        parser_pos += 1;
                    } while (parser_pos < input_length && c !== '#' && c !== '=');
                    if (c === '#') {
                        //
                    } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                        sharp += '[]';
                        parser_pos += 2;
                    } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                        sharp += '{}';
                        parser_pos += 2;
                    }
                    return [sharp, 'TK_WORD'];
                }
            }

            if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
                parser_pos += 3;
                c = '<!--';
                while (input.charAt(parser_pos) !== '\n' && parser_pos < input_length) {
                    c += input.charAt(parser_pos);
                    parser_pos++;
                }
                flags.in_html_comment = true;
                return [c, 'TK_COMMENT'];
            }

            if (c === '-' && flags.in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
                flags.in_html_comment = false;
                parser_pos += 2;
                if (wanted_newline) {
                    print_newline();
                }
                return ['-->', 'TK_COMMENT'];
            }

            if (c === '.') {
                return [c, 'TK_DOT'];
            }

            if (in_array(c, punct)) {
                while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }

                if (c === ',') {
                    return [c, 'TK_COMMA'];
                } else if (c === '=') {
                    return [c, 'TK_EQUALS'];
                } else {
                    return [c, 'TK_OPERATOR'];
                }
            }

            return [c, 'TK_UNKNOWN'];
        }

        //----------------------------------
        indent_string = '';
        while (opt_indent_size > 0) {
            indent_string += opt_indent_char;
            opt_indent_size -= 1;
        }

        while (js_source_text && (js_source_text.charAt(0) === ' ' || js_source_text.charAt(0) === '\t')) {
            preindent_string += js_source_text.charAt(0);
            js_source_text = js_source_text.substring(1);
        }
        input = js_source_text;

        last_word = ''; // last 'TK_WORD' passed
        last_type = 'TK_START_EXPR'; // last token type
        last_text = ''; // last token text
        last_last_text = ''; // pre-last token text
        output = [];

        do_block_just_closed = false;

        whitespace = "\n\r\t ".split('');
        wordchar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'.split('');
        digits = '0123456789'.split('');

        punct = '+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! !! , : ? ^ ^= |= ::';
        punct += ' <%= <% %> <?= <? ?>'; // try to be a good boy and try not to break the markup language identifiers
        punct = punct.split(' ');

        // words which should always start on new line.
        line_starters = 'continue,try,throw,return,var,if,switch,case,default,for,while,break,function'.split(',');

        // states showing if we are currently in expression (i.e. "if" case) - 'EXPRESSION', or in usual block (like, procedure), 'BLOCK'.
        // some formatting depends on that.
        flag_store = [];
        set_mode('BLOCK');

        parser_pos = 0;
        while (true) {
            var t = get_next_token();
            token_text = t[0];
            token_type = t[1];
            if (token_type === 'TK_EOF') {
                break;
            }

            switch (token_type) {

                case 'TK_START_EXPR':

                    if (token_text === '[') {

                        if (last_type === 'TK_WORD' || last_text === ')') {
                            // this is array index specifier, break immediately
                            // a[x], fn()[x]
                            if (in_array(last_text, line_starters)) {
                                print_single_space();
                            }
                            set_mode('(EXPRESSION)');
                            print_token();
                            break;
                        }

                        if (flags.mode === '[EXPRESSION]' || flags.mode === '[INDENTED-EXPRESSION]') {
                            if (last_last_text === ']' && last_text === ',') {
                                // ], [ goes to new line
                                if (flags.mode === '[EXPRESSION]') {
                                    flags.mode = '[INDENTED-EXPRESSION]';
                                    if (!opt_keep_array_indentation) {
                                        indent();
                                    }
                                }
                                set_mode('[EXPRESSION]');
                                if (!opt_keep_array_indentation) {
                                    print_newline();
                                }
                            } else if (last_text === '[') {
                                if (flags.mode === '[EXPRESSION]') {
                                    flags.mode = '[INDENTED-EXPRESSION]';
                                    if (!opt_keep_array_indentation) {
                                        indent();
                                    }
                                }
                                set_mode('[EXPRESSION]');

                                if (!opt_keep_array_indentation) {
                                    print_newline();
                                }
                            } else {
                                set_mode('[EXPRESSION]');
                            }
                        } else {
                            set_mode('[EXPRESSION]');
                        }



                    } else {
                        if (last_word === 'for') {
                            set_mode('(FOR-EXPRESSION)');
                        } else if (in_array(last_word, ['if', 'while'])) {
                            set_mode('(COND-EXPRESSION)');
                        } else {
                            set_mode('(EXPRESSION)');
                        }
                    }

                    if (last_text === ';' || last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || last_text === '.') {
                        if (wanted_newline) {
                            print_newline();
                        }
                        // do nothing on (( and )( and ][ and ]( and .(
                    } else if (last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                        print_single_space();
                    } else if (last_word === 'function' || last_word === 'typeof') {
                        // function() vs function ()
                        if (opt_jslint_happy) {
                            print_single_space();
                        }
                    } else if (in_array(last_text, line_starters) || last_text === 'catch') {
                        if (opt_space_before_conditional) {
                            print_single_space();
                        }
                    }
                    print_token();

                    break;

                case 'TK_DOT':

                    if (is_special_word(last_text)) {
                        print_single_space();
                    } else if (last_text === ')') {
                        if (opt_break_chained_methods || wanted_newline) {
                            flags.chain_extra_indentation = 1;
                            print_newline(true /* ignore_repeated */, false /* reset_statement_flags */);
                        }
                    }

                    print_token();
                    break;

                case 'TK_END_EXPR':
                    if (token_text === ']') {
                        if (opt_keep_array_indentation) {
                            if (last_text === '}') {
                                // trim_output();
                                // print_newline(true);
                                remove_indent();
                                print_token();
                                restore_mode();
                                break;
                            }
                        } else {
                            if (flags.mode === '[INDENTED-EXPRESSION]') {
                                if (last_text === ']') {
                                    restore_mode();
                                    print_newline();
                                    print_token();
                                    break;
                                }
                            }
                        }
                    }
                    restore_mode();
                    print_token();
                    break;

                case 'TK_START_BLOCK':

                    if (last_word === 'do') {
                        set_mode('DO_BLOCK');
                    } else {
                        set_mode('BLOCK');
                    }
                    if (opt_brace_style === "expand" || opt_brace_style === "expand-strict") {
                        var empty_braces = false;
                        if (opt_brace_style === "expand-strict") {
                            empty_braces = (look_up() === '}');
                            if (!empty_braces) {
                                print_newline(true);
                            }
                        } else {
                            if (last_type !== 'TK_OPERATOR') {
                                if (last_type === 'TK_EQUALS' ||
                                    (is_special_word(last_text) && last_text !== 'else')) {
                                    print_single_space();
                                } else {
                                    print_newline(true);
                                }
                            }
                        }
                        print_token();
                        if (!empty_braces) {
                            indent();
                        }
                    } else {
                        if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                            if (last_type === 'TK_START_BLOCK') {
                                print_newline();
                            } else {
                                print_single_space();
                            }
                        } else {
                            // if TK_OPERATOR or TK_START_EXPR
                            if (is_array(flags.previous_mode) && last_text === ',') {
                                if (last_last_text === '}') {
                                    // }, { in array context
                                    print_single_space();
                                } else {
                                    print_newline(); // [a, b, c, {
                                }
                            }
                        }
                        indent();
                        print_token();
                    }

                    break;

                case 'TK_END_BLOCK':
                    restore_mode();
                    if (opt_brace_style === "expand" || opt_brace_style === "expand-strict") {
                        if (last_text !== '{') {
                            print_newline();
                        }
                        print_token();
                    } else {
                        if (last_type === 'TK_START_BLOCK') {
                            // nothing
                            if (just_added_newline) {
                                remove_indent();
                            } else {
                                // {}
                                trim_output();
                            }
                        } else {
                            if (is_array(flags.mode) && opt_keep_array_indentation) {
                                // we REALLY need a newline here, but newliner would skip that
                                opt_keep_array_indentation = false;
                                print_newline();
                                opt_keep_array_indentation = true;

                            } else {
                                print_newline();
                            }
                        }
                        print_token();
                    }
                    break;

                case 'TK_WORD':

                    // no, it's not you. even I have problems understanding how this works
                    // and what does what.
                    if (do_block_just_closed) {
                        // do {} ## while ()
                        print_single_space();
                        print_token();
                        print_single_space();
                        do_block_just_closed = false;
                        break;
                    }

                    prefix = 'NONE';

                    if (token_text === 'function') {
                        if (flags.var_line && last_type !== 'TK_EQUALS' ) {
                            flags.var_line_reindented = true;
                        }
                        if ((just_added_newline || last_text === ';') && last_text !== '{'
                            && last_type !== 'TK_BLOCK_COMMENT' && last_type !== 'TK_COMMENT') {
                            // make sure there is a nice clean space of at least one blank line
                            // before a new function definition
                            n_newlines = just_added_newline ? n_newlines : 0;
                            if (!opt_preserve_newlines) {
                                n_newlines = 1;
                            }

                            for (var i = 0; i < 2 - n_newlines; i++) {
                                print_newline(false);
                            }
                        }
                        if (last_type === 'TK_WORD') {
                            if (last_text === 'get' || last_text === 'set' || last_text === 'new' || last_text === 'return') {
                                print_single_space();
                            } else {
                                print_newline();
                            }
                        } else if (last_type === 'TK_OPERATOR' || last_text === '=') {
                            // foo = function
                            print_single_space();
                        } else if (is_expression(flags.mode)) {
                            // print nothing
                        } else {
                            print_newline();
                        }

                        print_token();
                        last_word = token_text;
                        break;
                    }

                    if (token_text === 'case' || (token_text === 'default' && flags.in_case_statement)) {
                        print_newline();
                        if (flags.case_body) {
                            // switch cases following one another
                            flags.indentation_level--;
                            flags.case_body = false;
                            remove_indent();
                        }
                        print_token();
                        flags.in_case = true;
                        flags.in_case_statement = true;
                        break;
                    }

                    if (last_type === 'TK_END_BLOCK') {

                        if (!in_array(token_text.toLowerCase(), ['else', 'catch', 'finally'])) {
                            prefix = 'NEWLINE';
                        } else {
                            if (opt_brace_style === "expand" || opt_brace_style === "end-expand" || opt_brace_style === "expand-strict") {
                                prefix = 'NEWLINE';
                            } else {
                                prefix = 'SPACE';
                                print_single_space();
                            }
                        }
                    } else if (last_type === 'TK_SEMICOLON' && (flags.mode === 'BLOCK' || flags.mode === 'DO_BLOCK')) {
                        prefix = 'NEWLINE';
                    } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                        prefix = 'SPACE';
                    } else if (last_type === 'TK_STRING') {
                        prefix = 'NEWLINE';
                    } else if (last_type === 'TK_WORD') {
                        if (last_text === 'else') {
                            // eat newlines between ...else *** some_op...
                            // won't preserve extra newlines in this place (if any), but don't care that much
                            trim_output(true);
                        }
                        prefix = 'SPACE';
                    } else if (last_type === 'TK_START_BLOCK') {
                        prefix = 'NEWLINE';
                    } else if (last_type === 'TK_END_EXPR') {
                        print_single_space();
                        prefix = 'NEWLINE';
                    }

                    if (in_array(token_text, line_starters) && last_text !== ')') {
                        if (last_text === 'else') {
                            prefix = 'SPACE';
                        } else {
                            prefix = 'NEWLINE';
                        }

                    }

                    if (flags.if_line && last_type === 'TK_END_EXPR') {
                        flags.if_line = false;
                    }
                    if (in_array(token_text.toLowerCase(), ['else', 'catch', 'finally'])) {
                        if (last_type !== 'TK_END_BLOCK' || opt_brace_style === "expand" || opt_brace_style === "end-expand" || opt_brace_style === "expand-strict") {
                            print_newline();
                        } else {
                            trim_output(true);
                            print_single_space();
                        }
                    } else if (prefix === 'NEWLINE') {
                        if (is_special_word(last_text)) {
                            // no newline between 'return nnn'
                            print_single_space();
                        } else if (last_type !== 'TK_END_EXPR') {
                            if ((last_type !== 'TK_START_EXPR' || token_text !== 'var') && last_text !== ':') {
                                // no need to force newline on 'var': for (var x = 0...)
                                if (token_text === 'if' && last_word === 'else' && last_text !== '{') {
                                    // no newline for } else if {
                                    print_single_space();
                                } else {
                                    flags.var_line = false;
                                    flags.var_line_reindented = false;
                                    print_newline();
                                }
                            }
                        } else if (in_array(token_text, line_starters) && last_text !== ')') {
                            flags.var_line = false;
                            flags.var_line_reindented = false;
                            print_newline();
                        }
                    } else if (is_array(flags.mode) && last_text === ',' && last_last_text === '}') {
                        print_newline(); // }, in lists get a newline treatment
                    } else if (prefix === 'SPACE') {
                        print_single_space();
                    }
                    print_token();
                    last_word = token_text;

                    if (token_text === 'var') {
                        flags.var_line = true;
                        flags.var_line_reindented = false;
                        flags.var_line_tainted = false;
                    }

                    if (token_text === 'if') {
                        flags.if_line = true;
                    }
                    if (token_text === 'else') {
                        flags.if_line = false;
                    }

                    break;

                case 'TK_SEMICOLON':

                    print_token();
                    flags.var_line = false;
                    flags.var_line_reindented = false;
                    if (flags.mode === 'OBJECT') {
                        // OBJECT mode is weird and doesn't get reset too well.
                        flags.mode = 'BLOCK';
                    }
                    break;

                case 'TK_STRING':

                    if (last_type === 'TK_END_EXPR' && in_array(flags.previous_mode, ['(COND-EXPRESSION)', '(FOR-EXPRESSION)'])) {
                        print_single_space();
                    } else if (last_type === 'TK_WORD') {
                        print_single_space();
                    } else if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                        if (opt_preserve_newlines && wanted_newline && flags.mode !== 'OBJECT') {
                            print_newline();
                            print_indent_string();
                        }
                    } else {
                        print_newline();
                    }
                    print_token();
                    break;

                case 'TK_EQUALS':
                    if (flags.var_line) {
                        // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                        flags.var_line_tainted = true;
                    }
                    print_single_space();
                    print_token();
                    print_single_space();
                    break;

                case 'TK_COMMA':
                    if (flags.var_line) {
                        if (is_expression(flags.mode) || last_type === 'TK_END_BLOCK' ) {
                            // do not break on comma, for(var a = 1, b = 2)
                            flags.var_line_tainted = false;
                        }
                        if (flags.var_line_tainted) {
                            print_token();
                            flags.var_line_reindented = true;
                            flags.var_line_tainted = false;
                            print_newline();
                            break;
                        } else {
                            flags.var_line_tainted = false;
                        }

                        print_token();
                        print_single_space();
                        break;
                    }

                    if (last_type === 'TK_COMMENT') {
                        print_newline();
                    }

                    if (last_type === 'TK_END_BLOCK' && flags.mode !== "(EXPRESSION)") {
                        print_token();
                        if (flags.mode === 'OBJECT' && last_text === '}') {
                            print_newline();
                        } else {
                            print_single_space();
                        }
                    } else {
                        if (flags.mode === 'OBJECT') {
                            print_token();
                            print_newline();
                        } else {
                            // EXPR or DO_BLOCK
                            print_token();
                            print_single_space();
                        }
                    }
                    break;


                case 'TK_OPERATOR':

                    var space_before = true;
                    var space_after = true;
                    if (is_special_word(last_text)) {
                        // "return" had a special handling in TK_WORD. Now we need to return the favor
                        print_single_space();
                        print_token();
                        break;
                    }

                    // hack for actionscript's import .*;
                    if (token_text === '*' && last_type === 'TK_DOT' && !last_last_text.match(/^\d+$/)) {
                        print_token();
                        break;
                    }

                    if (token_text === ':' && flags.in_case) {
                        flags.case_body = true;
                        indent();
                        print_token();
                        print_newline();
                        flags.in_case = false;
                        break;
                    }

                    if (token_text === '::') {
                        // no spaces around exotic namespacing syntax operator
                        print_token();
                        break;
                    }

                    if (in_array(token_text, ['--', '++', '!']) || (in_array(token_text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(last_text, line_starters) || last_text == ','))) {
                        // unary operators (and binary +/- pretending to be unary) special cases

                        space_before = false;
                        space_after = false;

                        if (last_text === ';' && is_expression(flags.mode)) {
                            // for (;; ++i)
                            //        ^^^
                            space_before = true;
                        }
                        if (last_type === 'TK_WORD' && in_array(last_text, line_starters)) {
                            space_before = true;
                        }

                        if (flags.mode === 'BLOCK' && (last_text === '{' || last_text === ';')) {
                            // { foo; --i }
                            // foo(); --bar;
                            print_newline();
                        }
                    } else if (token_text === ':') {
                        if (flags.ternary_depth === 0) {
                            if (flags.mode === 'BLOCK') {
                                flags.mode = 'OBJECT';
                            }
                            space_before = false;
                        } else {
                            flags.ternary_depth -= 1;
                        }
                    } else if (token_text === '?') {
                        flags.ternary_depth += 1;
                    }
                    if (space_before) {
                        print_single_space();
                    }

                    print_token();

                    if (space_after) {
                        print_single_space();
                    }

                    break;

                case 'TK_BLOCK_COMMENT':

                    var lines = split_newlines(token_text);
                    var j; // iterator for this case

                    if (all_lines_start_with(lines.slice(1), '*')) {
                        // javadoc: reformat and reindent
                        print_newline();
                        output.push(lines[0]);
                        for (j = 1; j < lines.length; j++) {
                            print_newline();
                            output.push(' ');
                            output.push(trim(lines[j]));
                        }

                    } else {

                        // simple block comment: leave intact
                        if (lines.length > 1) {
                            // multiline comment block starts with a new line
                            print_newline();
                        } else {
                            // single-line /* comment */ stays where it is
                            if (last_type === 'TK_END_BLOCK') {
                                print_newline();
                            } else {
                                print_single_space();
                            }

                        }

                        for (j = 0; j < lines.length; j++) {
                            output.push(lines[j]);
                            output.push("\n");
                        }

                    }
                    if (look_up('\n') !== '\n') {
                        print_newline();
                    }
                    break;


                case 'TK_INLINE_COMMENT':
                    print_single_space();
                    print_token();
                    print_single_space();
                    break;

                case 'TK_COMMENT':

                    if (last_text === ',' && !wanted_newline) {
                        trim_output(true);
                    }
                    if (last_type !== 'TK_COMMENT') {
                        if (wanted_newline) {
                            print_newline();
                        } else {
                            print_single_space();
                        }
                    }
                    print_token();
                    print_newline();
                    break;

                case 'TK_UNKNOWN':
                    print_token();
                    break;
            }

            // The cleanest handling of inline comments is to treat them as though they aren't there.
            // Just continue formatting and the behavior should be logical.
            if(token_type !== 'TK_INLINE_COMMENT') {
                last_last_text = last_text;
                last_type = token_type;
                last_text = token_text;
            }
        }

        var sweet_code = preindent_string + output.join('').replace(/[\r\n ]+$/, '');
        return sweet_code;

    }

    return js_beautify;
});
define('compiler/HtmlParser',['compiler/Strings', 'compiler/Tag', 'compiler/ParsedText', 'compiler/Map', 'compiler/JSFunctions', 'compiler/beautify'], function (Strings, Tag, ParsedText, Map, JSFunctions, js_beautify) {

    var runConfig;
    var componentsName;
    var ignoredNames;

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
            "    var factory = ${constructorName};\n" +
            "\n" +
            "    /**\n" +
            "     * Creates instance of '${name}' component and renders HTML content for it.\n" +
            "     * @param parameters global reference for all data\n" +
            "     * @param body reference to HTML element (or null)\n" +
            "     * @param parentInstance reference to instance of parent component for this child (or null)\n" +
            "     * @return new instance of '${name}' component\n" +
            "     */\n" +
            "    function create(parameters, body, parentInstance) {\n" +
            "       var instance = ${createInstance}(factory, parameters, body, parentInstance), html='';\n" +
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
            "    ${hasBeforeCreate}factory.beforeCreate = beforeCreate;\n" +
            "    factory.create = create;\n" +
            "    ${hasAfterCreate}factory.afterCreate = afterCreate;\n" +
            "    ${hasOnDestroy}factory.onDestroy = onDestroy;\n" +
            "    ${hasOnChildDestroy}factory.onChildDestroy = onChildDestroy;\n" +
            "    factory.componentName = ${jsName};\n" +
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
            hasOnChildDestroy: "//",
            components: "Components"
        };

        var lineSplitter = "\n         ";
        var END_PARSED_JS = new ParsedJS(ctxJs,"",ctxJs, null);
        var html = new ParsedJS(ctxJsEmpty, "", ctxJs, {nl:lineSplitter,v:"html += "});
        var title = new ParsedJS(ctxJsEmpty, "", ctxJs, {nl:lineSplitter,v:"instance.title = "});

        componentsName = runConfig.webDir + parameters.components;
        ignoredNames = { instance: 1, parameters:1, body: 1, parentInstance:1, event: 1, element:1,
            beforeCreate:1, create:1, afterCreate:1, onDestroy:1};
        ignoredNames[parameters.components]=1;
        ignoredNames["null"]=1;

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
                    moduleName = v.substr(valuesIndex, iO - valuesIndex),
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
            if (functions.containsKey("onChildDestroy")) parameters.hasOnChildDestroy = "";
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
        var s = toJS(value.$c, ctxJsValue, dependencies).value;
        if (!Strings.startsWith(s, "component.")) {
            throw "Error parsing component name '"+keyValue+"'";
        }
        var i=s.indexOf('('), j = s.lastIndexOf(')'), moduleName = i>0 ? s.substr(10, i-10) : s.substr(10);
        var functionParameters = i>0 && j>i ? s.substr(i+1, j-i-1) : "";
        var names=[];
        addNamesForWrap(names, functionParameters);
        id.put("component", wrapEventFunction(names, "{name: "+Strings.toJSString(moduleName)+", factory: "+dependencies.get(moduleName)+(functionParameters ? ", parameters: "+functionParameters : "")+"}"));
    });

    idPrefixes.put("parameters.", function (value, key, keyValue, id, dependencies) {
        var s = toJS(value.$c, ctxJsValue, dependencies).value;
        if (!Strings.startsWith(s, "parameters.")) {
            throw "Error parsing component name '"+keyValue+"'";
        }
        var names=[];
        addNamesForWrap(names, s);
        id.put("sync", wrapEventFunction(names, "function (__val) {if (typeof __val != 'undefined') "+s+" = __val; return "+s+";}"));
    });

    function arrayContains(a, obj) {
        var i = a.length;
        while (i-->0) if (a[i] === obj) return true;
        return false;
    }

    function notNumberOrString(str) {
        var c = str.charAt(0);
        return c != "'" && c != '"' && (c<'0' || c>'9');
    }

    function addNamesForWrap(names, value) {
        var r = value.match(/([\w_\."']+)/g);
        if (r) {
            for (var i = 0; i < r.length; i++) {
                var baseName = r[i],
                    index = baseName.indexOf('.');
                if (index>0) baseName = baseName.substr(0, index);
                if (index != 0 && !ignoredNames[baseName]  && !arrayContains(names, baseName) && notNumberOrString(baseName)) {
                    names.push(baseName);
                }
            }
        }
    }

    function isSplitter(str, index) {
        return index < 0 || str.length <= index || str.charAt(index).match(/([\w_])/g);

    }

    function insert(str, i, what, remove) {
        var result = (i>0 ? str.substr(0, i) : "")+what, from = remove>0 ? remove + i : i;
        if (from+1<str.length) result += str.substr(from);
        return result;
    }

    function wrapEventFunction(names, func) {
        if (names.length>0) {
            var params = "", body = func, i,l;
            for (i = 0; i < names.length; i++) {
                var name = names[i], jsName = Strings.toJSName(name);
                if (jsName != name) {
                    while (true) {
                        l = body.indexOf(name);
                        if (l<0) break;
                        if (isSplitter(body, l-1) && isSplitter(body, l+name.length)) body = insert(body, l, jsName, name.length);
                        else break;
                    }
                }
                if (i>0) params += ", "+jsName;
                else params = jsName;
            }
            return "(function ("+params+"){return "+body+"})("+names.join(', ')+")";
        }
        return func;
    }

    function listenerForEventFunction(names) {

        function listen(type, name) {
            if (type == 'function params') addNamesForWrap(names, name);
            return name;
        }

        return listen;
    }

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
                    var names = [];
                    var listener = listenerForEventFunction(names),
                        eventFunction = "function (event, element) {"+toJS(value.$c, ctxJs,  dependencies, listener).value+"}";
                    id.put(nameLowerCase, wrapEventFunction(names, eventFunction));
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
        var l= s.length, result="", lastIsWhiteSpace=false, inPre = false;
        for (var i = 0;i<l;i++) {
            var c = s.charAt(i);
            if (inPre) {
                if (c == '<' && i + 5 < l && s.substr(i + 1, 4).toLowerCase() == '/pre') {
                    c = s.charAt(i + 5);
                    inPre = !(c < '!' || c == '>');
                    result += '</pre';
                    i += 5;
                    lastIsWhiteSpace = result<'!';
                }
                result+=c;
            } else if (c<'!') {
                if (!lastIsWhiteSpace) result+=' ';
                lastIsWhiteSpace = true;
            } else {
                if (c == '<' && i + 4 < l && s.substr(i + 1, 3).toLowerCase() == 'pre') {
                    c = s.charAt(i + 4);
                    inPre = c < '!' || c == '>';
                    result += '<pre';
                    i += 4;
                }
                result+=c;
                lastIsWhiteSpace = false;
            }
        }
        return result;
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

    return HtmlParser;
});
define('compiler/PropertiesParser',['compiler/Strings'], function (Strings) {

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

        var isNotFirst = false, ignoreSpace = false;
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
                    ignoreSpace = true;
                    doIt = c == '';
                }
                if (doIt) {
                    var /*int*/ eq = line.indexOf('=');
                    if (eq == -1) {
                        if (cs) cs.addError("Property '" + line + "' does not contain '=' symbol");
                    } else {
                        var /*String*/ key = Strings.trim(line.substring(0, eq));
                        var /*String*/ value = Strings.trim(line.substring(eq + 1));
                        var useQuotes = Strings.toJSName(key) != key;
                        if (isNotFirst) parameters.keys += ',';
                        else isNotFirst = true;
                        if (parameters.keys > "") parameters.keys += "\n      ";
                        parameters.keys += useQuotes ? Strings.toJSString(key) : key;
                        parameters.keys += ': ' + valueToJSString(value);
                    }
                    line = "";
                }
                if (c == '') break;
            } else if (c >= ' ' && (!ignoreSpace || c != ' ')) {
                line += c;
                ignoreSpace = false;
            }
        }

        return Strings.replaceWith(localizationFrame, parameters);
    }

    function valueToJSString(value) {
        var l = value.length, r = "'", last='';
        for (var i = 0; i < l; i++) {
            var c = value.charAt(i);
            if (c == '\\') {
                if (last == '\\') {
                    r += '\\\\';
                    last = '';
                } else last = c;
            } else if (c == "'") {
                r += "\\'";
                last = c;
            } else {
                if (last == '\\') r += '\\';
                r += c;
                last = c;
            }
        }
        return r + "'";
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
define('compiler/DependenciesMapper',['compiler/Map'], function (Map) {
    function DependenciesMapper() {

        var dependencies;
        var nameGetter;

        function getNewOrExisting(key) {
            if (!dependencies.containsKey(key)) dependencies.put(key, nameGetter(key));
            return dependencies.get(key);
        }

        this.init = function (_nameGetter) {
            dependencies = new Map();
            nameGetter = _nameGetter;
        };

        this.get = getNewOrExisting;
        this.put = function (name, variable) {
            dependencies.put(name, variable)
        };
        this.variables = function () {
            return dependencies.values();
        };
        this.modules = function () {
            return dependencies.keys();
        };
    }

    return DependenciesMapper;
});
define('compiler/InputStream',[], function () {

    function InputStream(/*String */s) {

        var killer = 500000;

        var next = 0, j = s.length;
        this.cutString = function (start, end) {
            return s.substring(start, end);
        };
        this.read = function () {
            if (killer--<0) throw "Killed by killer";
            return next < j ? s.charAt(next++) : '';
        };
        this.getPosition = function () {
            return next-1;
        };
/*
        this.readRelative = function (d) {
            return next+d<j && next>=d ? s.charAt(next+d) : '';
        };
        this.readAt = function (l) {
            return l<j ? s.charAt(l) : '';
        };
        this.setPosition = function (l) {
            next= l+1;
        };
*/
        this.setRelative = function (d) {
            next = Math.max(0, Math.min(j, next+d));
        };
        this.errorAt = function (l) {
            return s.substring(l-6, l)+"___."+ s.charAt(l)+".___"+ s.substr(l, 6);
        };
    }

    return InputStream;
});
define('compiler/Build',['compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/Map', 'compiler/DependenciesMapper', 'compiler/Strings', 'compiler/InputStream'], function (HtmlParser, PropertiesParser, Map, DependenciesMapper, Strings, InputStream) {

    function build(params, cs, file, log) {

        var runParameters = parseArgs(params);
        if (!runParameters.destination && (!runParameters.replaceFile || !runParameters.contentFile)) {
            log("\n" +
                "Usage: node r.js -lib w.js [options] -source SOURCE_DIR -dest DESTINATION_DIR" +
                "\n" +
                "where options include:\n" +
                "  -exclude PARAMETER   to set the \"exclude\" regular expression for source files\n" +
                "  -create PARAMETER      to set the \"createInstance\" parameter\n" +
                "                         (Default: \"Components.createInstance\")\n" +
                "  -safeValue PARAMETER to set the \"safeValue\" parameter\n" +
                "                         (Default: \"Components._sV\")\n" +
                "  -in PARAMETER        to set the \"inputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -out PARAMETER       to set the \"outputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -control POLICIES    to set the coding rules policy\n" +
                "                       (e.g. \"-control parametricPage,parametricCall,dynamicPages,doc\")\n" +
                "  -exclude REG_EXP     to set the files to be excluded (REG_EXP is regular expression)\n" +
                "  -v VERBOSE_DIR       to set the verbose output directory\n" +
                "  -cp JAVA_CLASS_PATH  to set the CLASS_PATH for compiled java sources\n" +
                "  -javadoc PATH        to set the JavaDoc PATH of compiled java sources\n" +
                "  -overwrite           to overwrite all existing files also with the latest \"modified\" timestamp\n" +
                "  -silent              do not inform me about skipped files\n" +
                "  -f                   Follow. The program will not terminate after compiling all the files, but\n" +
                "                       will enter an endless loop, wherein it waits for file changes.\n" +
                "\n" +
                "Replace usage: node r.js -lib w.js [options] -replace DESTINATION_FILE -with SOURCE_FILE\n" +
                "\n" +
                "which replaces string '/*REQUIRE_BUILD*/' in SOURCE_FILE with content in DESTINATION_FILE\n" +
                "where options include the same options parameters as in first case." +
                "\n" +
                "Author: Lubos Strapko (https://github.com/lubino)");
            throw "Required start parameters not included!";
        }

        if (runParameters.destination) {
            var files = [];
            var filter = {
                include: /(\.htm(l)?)|(\.properties)$/g
            };
            if (runParameters.exclude) filter.exclude = new RegExp(runParameters.exclude);
            var i;
            for (i = 0; i < runParameters.sources.length; i++) {
                var source = Strings.toPath(runParameters.sources[i]);
                var toAdd = file.getFilteredFileList(source, filter, true, false);
                if (source.charAt(source.length - 1) != '/') source += '/';
                for (var l = 0; l < toAdd.length; l++) {
                    files.push({file: toAdd[l], name: toAdd[l].replace(source, "")});
                }
            }

            var destination = Strings.toPath(runParameters.destination);
            if (!Strings.endsWith(destination, '/')) destination += '/';

            //noinspection JSValidateTypes
            var /*Map*/ propertiesMap = new Map(), outs;
            var /*DependenciesMapper*/ dependencies;
            for (i = 0; i < files.length; i++) {
                //noinspection JSValidateTypes
                dependencies = new DependenciesMapper();
                //noinspection JSValidateTypes
                var /*InputStream*/ input = new InputStream(file.readFile(files[i].file, runParameters.inputCharset));
                var fileName = files[i].name;
                var name;
                var type = parseType(fileName);

                //remove extension
                fileName = fileName.substr(0, fileName.lastIndexOf('.'));

                if (type == 2) {
                    var localeIndex = fileName.indexOf('_');
                    if (localeIndex > 0) {
                        name = fileName.substr(0, localeIndex);
                    } else {
                        name = fileName;
                    }

                    var out = PropertiesParser.parseProperties(fileName, input, dependencies, cs, runParameters);
                    outs = propertiesMap.get(name);
                    if (!outs) {
                        outs = [out];
                        propertiesMap.put(name, outs);
                    } else {
                        outs.push(out);
                    }
                    outs.dependencies = dependencies;
                    //containsKey
                } else if (type == 1) {
                    name = fileName;
                    fileName = name + ".js";
                    log(i + ": " + files[i].name + " (" + destination + fileName + ")");
                    //noinspection JSValidateTypes
                    var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
                    var js = parser.parse(input, cs);
                    var requireJS_Definition = HtmlParser.doRequireModule(js, dependencies);
                    file.saveFile(destination + fileName, requireJS_Definition, runParameters.outputCharset);
                } else {
                    throw "Unknown file extension '" + fileName + "'";
                }
            }

            var names = propertiesMap.keys();
            var lineSeparator = "\n";
            for (i = 0; i < names.length; i++) {
                outs = propertiesMap.get(names[i]);
                var result = "";
                for (var k = 0; k < outs.length; k++) {
                    if (!result) result = outs[k];
                    else result += lineSeparator + outs[k];
                }
                log(i + ": " + names[i] + " (" + destination + names[i] + ")");
                result = PropertiesParser.finishProperties(names[i], result, outs.dependencies);

                file.saveFile(destination + names[i] + ".js", PropertiesParser.doRequireModule(result, outs.dependencies), runParameters.outputCharset);
            }
        }

        if (runParameters.replaceFile && runParameters.contentFile) {
            var /*String*/ replaceFile = file.readFile(runParameters.replaceFile, runParameters.inputCharset);
            var /*String*/ content = file.readFile(runParameters.contentFile, runParameters.inputCharset);
            replaceFile = replaceFile.replace('/*REQUIRE_BUILD*/', content);
            file.saveFile(runParameters.replaceFile, replaceFile, runParameters.outputCharset);
        }
    }


    function parseArgs(args) {
        var result = defaultConfig();
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
                } else if (args[i] == "-replace") {
                    result.replaceFile = args[++i];
                } else if (args[i] == "-with") {
                    result.contentFile = args[++i];
                } else if (args[i] == "-dest")
                    result.destination = args[++i];
                else if (args[i] == "-safeValue")
                    result.safeValue = args[++i];
                else if (args[i] == "-create")
                    result.createInstance = args[++i];
                else if (args[i] == "-in")
                    result.inputCharset = args[++i];
                else if (args[i] == "-exclude")
                    result.exclude = args[++i];
                else if (args[i] == "-out")
                    result.outputCharset = args[++i];
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
        if (result.webDir>"" && !Strings.endsWith(result.webDir, '/')) result.webDir += '/';
        return result;
    }

    function parseType(/*String*/ name) {
        var fileNameLowerCase = name.toLowerCase();
        if (Strings.endsWith(fileNameLowerCase, ".html")) {
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".htm")) {
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".properties")) {
            return 2;
        } else throw "Unknown file type '"+name+"'";
    }

    function defaultConfig() {
        return {
            createInstance: "Components.createInstance",
            safeValue: "Components._sV",
            resource: "Resources.setResourceModule",
            resourceBundle: "Resources.rb",
            webDir: "web/",
            inputCharset: "UTF-8",
            outputCharset: "UTF-8"
        }
    }

    return {
        parseType: parseType,
        build: build,
        defaultConfig: defaultConfig,
        author: "Lubos Strapko (https://github.com/lubino)"
    };
});
define('parse',['compiler/Build', 'compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/ConsoleStack', 'compiler/Map', 'compiler/InputStream', 'compiler/DependenciesMapper', 'compiler/Strings'], function (compile, HtmlParser, PropertiesParser, ConsoleStack, Map, InputStream, DependenciesMapper, Strings) {
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