require(['compiler/compile', 'compiler/ConsoleStack'], function (compile, ConsoleStack) {
    //Execute the build
    require(['env!env/args', 'env!env/file', 'env!env/print'], function (params, file, log) {
        var cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, {log: log});
        compile.build(params, cs, file, log);
    });
});

