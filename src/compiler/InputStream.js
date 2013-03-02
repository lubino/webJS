define([], function () {

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