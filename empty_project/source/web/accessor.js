define([], function () {

    var accessor = {};

    /**
     * Returns value from parameters object based on key path
     * @param parameters object (e.g. {item:{children:[0,{name:"Lubos"},2]}})
     * @param key key path (e.g. "item.children[1].name")
     * @return {*}
     */
    function getValue(parameters, key) {
        var value = parameters, nextKey = key;
        while (value) {
            // cycle is on the end, return value
            if (!nextKey) return value;

            // there is still something to get

            var point = nextKey.indexOf('.'), bracket = nextKey.indexOf('[');
            if (point>0 && (point<bracket || bracket==-1)) {
                // there is point
                value = value[nextKey.substr(0, point)];
                nextKey = point+1<nextKey.length ? nextKey.substr(point+1) : "";
            } else if (bracket>0 && (bracket<point || point==-1)) {
                // there is bracket
                var end = nextKey.indexOf(']');
                if (end<bracket) throw "Wrong key '"+key+"' for getting value from JSON";
                value = value[nextKey.substr(0, bracket)][nextKey.substr(bracket+1, end-bracket-1)];
                nextKey = end+2<nextKey.length ? nextKey.substr(end+2) : "";
            } else {
                // this is the last key
                return value[nextKey];
            }
        }
        return value;
    }

    /**
     * Sets value to parameters object based on key path
     * @param parameters object (e.g. {item:{children:[0,{name:"Lubos"},2]}})
     * @param key key path (e.g. "item.children[1].name")
     * @param newValue new value (e.g. "Steve Jobs")
     */
    function setValue(parameters, key, newValue) {
        var value = parameters, nextKey = key, oldValue, innerKey;

        while (value) {

            if (!nextKey) throw "Wrong key '"+key+"' for setting value to JSON";

            var point = nextKey.indexOf('.'), bracket = nextKey.indexOf('[');
            if (point>0 && (point<bracket || bracket==-1)) {
                // there is point
                innerKey = nextKey.substr(0, point);

                //gets or create sub value
                if (value[innerKey]) value = value[innerKey];
                else value[innerKey] = value = {};

                nextKey = point+1<nextKey.length ? nextKey.substr(point+1) : "";
            } else if (bracket>0 && (bracket<point || point==-1)) {
                // there is bracket
                var end = nextKey.indexOf(']');
                if (end<bracket) throw "Wrong key '"+key+"' for getting value from JSON";
                innerKey = nextKey.substr(0, bracket);

                //gets or create sub value
                if (value[innerKey]) value = value[innerKey];
                else value[innerKey] = value = {};

                innerKey = nextKey.substr(bracket+1, end-bracket-1);
                nextKey = end+2<nextKey.length ? nextKey.substr(end+2) : "";
                //is this the last key?
                if (nextKey) {
                    //no, continue
                    if (value[innerKey]) value = value[innerKey];
                    else value[innerKey] = value = {};
                } else {
                    //yes, set and return
                    oldValue = value[nextKey];
                    value[nextKey] = newValue;
                    return oldValue;
                }
            } else {
                // this is the last key, set it
                oldValue = value[nextKey];
                value[nextKey] = newValue;
                return oldValue;
            }
        }
        throw "Can't set value at '"+key+"' in JSON";
    }

    //publish some functions
    accessor.getValue = getValue;
    accessor.setValue = setValue;

    return accessor;

});