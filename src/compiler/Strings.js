define([],function () {

    function replace(s, searchvalue, newValue){
        var i= 0, len1 = searchvalue.length, len2 = newValue.length;
        while ((i=s.indexOf(searchvalue,i))!=-1) {
            var b = i>1 ? s.substr(0, i) : "";
            var e = i+len1<s.length ? s.substr(i+len1) : "";
            s = b+newValue+e;
            i += len2;
        }
        return s;
    }

    function trim(s){
        return s.replace(/^\s+|\s+$/g, '');
    }

    function startsWith(s, key, at) {
        if (typeof at != "number") at = 0;
        return s.indexOf(key)==at;
    }

    function endsWith(s, key) {
        var looksAt = s.length-key.length;
        return looksAt>=0 && s.indexOf(key) == looksAt;
    }

    function regionMatches(s, start, key) {
        return s.indexOf(key, start)== start;
    }

    return {
        replace: replace,
        trim: trim,
        startsWith: startsWith,
        endsWith: endsWith,
        regionMatches: regionMatches
    };
});