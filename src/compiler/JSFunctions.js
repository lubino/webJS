define(['compiler/Map', 'compiler/ConsoleStack', 'compiler/Strings', 'compiler/Brackets'],function (Map, ConsoleStack, Strings, Brackets) {

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
                    cs.addWarning("Error processing function '" + name + parameters);
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