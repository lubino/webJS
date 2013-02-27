define(['compiler/Map'],function (Map) {
    function ServerRequest(/*String*/ moduleName, /*String*/ functionName) {
        this.moduleName = moduleName;
        this.functions = new Map();
        this.functions.add(functionName);
    }

    return ServerRequest;
});