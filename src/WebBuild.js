require(['compiler/Build', 'compiler/ConsoleStack'], function (compile, ConsoleStack) {
    //Execute the build
    require(['env!env/args', 'env!env/file', 'env!env/print'], function (params, file, print) {
        function log(a, b) {
            var message = "";
            for (var i = 0; i < arguments.length; i++) {
                if (message) message += ' ';
                switch (typeof arguments[i]) {
                    case "undefined":
                        message += "undefined";
                        break;
                    case "object":
                        message += arguments[i] ? JSON.stringify(arguments[i]) : "null";
                        break;
                    default:
                        message += arguments[i];
                        break;
                }
            }
            print(message);
        }
        var logger = {log: log};
        var cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, logger);
        compile.build(params, cs, file, print);
    });
});

