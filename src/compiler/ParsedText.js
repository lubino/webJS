define(['compiler/Strings'], function () {
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