define(['compiler/Map'], function (Map) {
    function DependenciesMapper() {

        var dependencies;
        var nameGetter;

        function getNewOrExisting(key) {
            if (!dependencies.containsKey(key)) dependencies.put(key, nameGetter(key));
            return dependencies.get(key);
        }

        this.init = function (_nameGetter) {
            dependencies = new Map();
            nameGetter = _nameGetter;
        };

        this.get = getNewOrExisting;
        this.put = function (name, variable) {
            dependencies.put(name, variable)
        };
        this.variables = function () {
            return dependencies.values();
        };
        this.modules = function () {
            return dependencies.keys();
        };
    }

    return DependenciesMapper;
});