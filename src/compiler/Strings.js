define([], function () {

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