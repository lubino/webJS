define(['compiler/Map', 'compiler/Brackets', 'compiler/ParsedText'], function (Map, Brackets, ParsedText) {

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