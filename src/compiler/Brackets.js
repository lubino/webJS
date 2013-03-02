define([], function () {


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