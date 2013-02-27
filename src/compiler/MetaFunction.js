define([],function () {

    function MetaFunction(/*String*/ name, /*String[]*/ parameters, /*String*/ body, /*String*/ description, /*String[]*/ parametersDescription, /*String*/ returns) {
        this.name = name;
        this.parameters = parameters;
        if (body != null && body.length > 320) body = body.substring(0, 317) + "...";
        this.body = body;
        this.description = description;
        this.parametersDescription = parametersDescription;
        this.returns = returns;
    }

    return MetaFunction;
});