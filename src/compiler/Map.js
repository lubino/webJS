define([],function () {

    /**
     * Map
     * @constructor Map
     */
    function Map() {

        var map = {};
        var _keys = [];
        var _values = [];

        function size() {
            return _values.length;
        }

        function keys() {
            return _keys;
        }

        function values() {
            return _values;
        }

        function containsKey(key) {
            return typeof map[key] != "undefined";
        }

        function add(key) {
            map[key] = size();
            _keys.push(key);
            _values.push(key);
        }

        function put(key, value) {
            map[key] = size();
            _keys.push(key);
            _values.push(value);
        }

        function getValue(key) {
            var i = map[key];
            if (typeof i == 'undefined') return null;
            return _values[i];
        }

        this.size = size;
        this.contains = containsKey;
        this.containsKey = containsKey;
        this.keys = keys;
        this.values = values;
        this.put = put;
        this.get = getValue;
        this.add = add;
    }

    return Map;
});