define([], function () {

    var Listeners = {
        log: function (message, object) {
            if (window.console) console.log(message, object);
        },
        author: "Lubos Strapko"
    };


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

    function runModelListeners(listeners, key, parameter) {
        var existing = listeners[key];
        if (typeof(existing) == "function") {
            try {
                existing(key, parameter);
            } catch (e) {
                Listeners.log("Executing listener for key '"+key+"' has failed.")
            }
        } else {
            var i = existing.length;
            while (i-->0) try {
                existing[i](key, parameter);
            } catch (e) {
                Listeners.log("Executing listener "+i+" for key '"+key+"' has failed.")
            }
        }

        var point = key.lastIndexOf('.');
        if (point>0) {
            parameter.child = key.substr(point+1) + (parameter.child ? '.' +parameter.child : '');
            runModelListeners(listeners, key.substr(0, point), parameter);
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

        /**
         * Executes model Listeners
         * @param key model key
         * @param value new value
         * @param previousValue old value
         */
        function runListeners(key, value, previousValue) {
            var parameter = {
                value: value,
                previousValue: previousValue,
                originalKey: key,
                child: null
            };
            runModelListeners(listeners, key, parameter)
        }

        o.listenerFor = listenerFor;
        o.addListener = addListener;
        o.runListeners = runListeners;
    }

    Listeners.registerListener = registerListener;
    Listeners.executeListeners = executeListeners;
    Listeners.createModelListener = createModelListener;

    return Listeners;
});