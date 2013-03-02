define(['compiler/Strings'], function (Strings) {
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
/*
        this.simple = function () {
            content.join("");
        };
        this.content = function () {
            return "'" + content.join("', '") + "'";
        };
*/

        this.toJS = function () {
            return toJS(content);
        };

        this.toDirectJS = function () {
            return toDirectJS(content);
        };

    }

    function toDirectJS(content) {
        var result = "";
        for (var i = 0; i < content.length; i++) {
            var c = content[i];
            if (typeof c == "string") {
                if (i == 0) result = c;
                else result += c;
            } else {
                if (i == 0) result = c.toDirectJS();
                else result += c.toDirectJS();
            }
        }
        return result;
    }

    function toJS(content) {
        var result = "";
        var addText = false;
        var finishJs = false;
        for (var i = 0; i < content.length; i++) {
            var c = content[i];
            if (typeof c == "string") {
                finishJs = false;
                c = Strings.toJSString(c);
                if (addText) result = result + c.substr(1, c.length - 2);
                else {
                    if (i == 0) result = c.substr(0, c.length - 1);
                    else result += ' + ' + c.substr(0, c.length - 1);
                    addText = true;
                }
            } else {
                if (i == 0) result = '(' + c.toJS() + ')';
                else {
                    if (addText) result += "'";
                    result += " + ";
                    result += '(' + c.toJS() + ')';
                }
                addText = false;
                finishJs = true;
            }
        }
        if (addText) result += "'";
        if (finishJs) result += " + ''";
        return result;
    }

    return ParsedText;
});