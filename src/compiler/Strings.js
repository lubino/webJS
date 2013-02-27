define([],function () {

    function replace(s, searchvalue, newValue){
        var i=0;
        while ((i=s.indexOf(searchvalue,i))!=-1) s = s.replace(searchvalue, newValue);
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