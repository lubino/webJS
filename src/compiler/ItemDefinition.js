define([], function () {

    function ItemDefinition(/*String*/ name, /*int*/ type) {

        this.name = name;
        this.type = type;


        this. /*long*/ compiled = new Date.getTime();
        this. /*List<MetaFunction>*/ functions = null;
        this. /*List<ServerRequest>*/ calls = null;
        this. /*List<String>*/ components = null;
        this. /*List<String>*/ pages = null;
        this. /*List<String>*/ errors = null;
    }

    return ItemDefinition;
});