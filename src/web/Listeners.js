define([], function () {

    var allListeners = {};

    /**
     * Register a call back function and calls it every time when some page is going to be opened
     * @param forKind kind of listener
     * @param listener callBack function with 1 argument
     */
    function registerListener(forKind, listener) {
        if (typeof listener != 'function') throw "Sorry, listener '"+listener+"' for '"+forKind+"' must by a function.";
        if (!allListeners[forKind]) allListeners[forKind] = [];
        allListeners[forKind].push(listener);
    }

    /**
     * Calls all call back functions registered for some kind of listener with given agrument
     * @param forKind kind of listener
     * @param args argument with parameters
     */
    function executeListeners(forKind, args) {
        var listeners = allListeners[forKind];
        if (listeners) {
            var index = listeners.length;
            while (index-- > 0) listeners[index](args);
        }

    }

    function createModelListener(o) {
        //model for listeners
        var listeners = {};

        function listenerFor(key) {
            return listeners[key];
        }
        /**
         * Adds parameters changes listener
         * @param key key in parameters (e.g. parameters.person.name has key "person.name")
         * @param listener listener function (value, instance, parameters) {...}
         */
        function addListener(key, listener) {
            var existing = listeners[key];
            if (existing) {
                if (typeof(existing) == "function") listeners[key] = [existing, listener];
                else existing.push(listener);
            } else listeners[key] = listener;
        }

        function runListeners () {

        }

        o.listenerFor = listenerFor;
        o.addListener = addListener;
        o.runListeners = runListeners;
    }

    var Listeners = {
        registerListener: registerListener,
        executeListeners: executeListeners,
        createModelListener: createModelListener,
        author: "Lubos Strapko"
    };

    return Listeners;
});