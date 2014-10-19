define(['compiler/Build', 'compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/ConsoleStack', 'compiler/Map', 'compiler/InputStream', 'compiler/DependenciesMapper'], function (compile, HtmlParser, PropertiesParser, ConsoleStack, Map, InputStream, DependenciesMapper) {
    var runParameters = compile.defaultConfig(),
        staticJsFiles = {
            /*staticJsFiles*/
            "/require.js": "replace_require"
        };

    function processHtml(fileName, value,/*ConsoleStack*/cs) {
        var result = "";
        try {
            //noinspection JSValidateTypes
            var /*DependenciesMapper*/ dependencies = new DependenciesMapper();
            var index = fileName.lastIndexOf('.');
            var name = fileName.substr(0, index);

            var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
            result = parser.parse(new InputStream(value), cs);
            result = HtmlParser.doRequireModule(result, dependencies);
        } catch (e) {
            cs.addError(e);
            result += "\n\n\n/* \n\n"+e+"\n\n*/\n\n";
        }
        return result;
    }

    function processProperties(names, values, cs) {
        var result = "";
        try {
            //noinspection JSValidateTypes
            var /*DependenciesMapper*/ dependencies = new DependenciesMapper();
            for (var i = 0; i < names.length; i++) {
                var name = names[i];
                result = PropertiesParser.parseProperties(name, new InputStream(values[i]), dependencies, cs, runParameters);
            }
            result = PropertiesParser.finishProperties(name, result, dependencies);
            result = PropertiesParser.doRequireModule(result, dependencies);
        } catch (e) {
            cs.addError(e);
            result += "\n\n\n/* \n\n"+e+"\n\n*/\n\n";
        }
        return result;
    }


    function createMiddleware(configuration) {
        var dir, logger, fs = require('fs');
        if (configuration) {
            if (configuration.baseDir) dir = configuration.baseDir;
            if (configuration.logger) logger = configuration.logger;
        }

        if (!logger) logger = {log: function (a, b) {
            console.log(a, b);
        }};

        var cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, logger),
            cache = {};

        function parse(res, filePath, fileName) {
            fs.readFile(filePath, function (err, data) {
                res.type('js');
                res.send(processHtml(fileName, data.toString('utf8'), cs));
            });
        }

        function loadPropertyFile(properties, languages, name, prefixLength, filePath, contents, res) {
            var file = properties.pop();
            languages.push(name + file.substr(prefixLength, file.length-prefixLength-11));
            fs.readFile(filePath + "/" + file, function (err, data) {
                contents.push(data.toString('utf8'));
                if (properties.length == 0) {
                    res.type('js');
                    res.send(processProperties(languages, contents, cs));
                } else {
                    loadPropertyFile(properties, languages, name, prefixLength, filePath, contents, res);
                }
            });
        }

        function parseProperties(res, filePath, properties, name, prefixLength) {
            var languages = [], contents = [];
            loadPropertyFile(properties, languages, name, prefixLength, filePath, contents, res);
        }

        function middleware(req, res, next) {
            var path=req.path,
                length = path.length,
                t;
            //console.log('Time: %d', Date.now(), req, res);
            if (!cache[path] && length>3 && path.substr(length-3,3)==".js") {
                fs.exists(dir+path, function (exists) {
                    if (exists) {
                        cache[path]=true;
                        next();
                    } else if (t=staticJsFiles[path]) {
                        res.type('js');
                        res.send(t);
                    } else {
                        var name = path.substr(1,length-4), fileName = name+'.html', filePath = dir+"/"+fileName;
                        fs.exists(filePath, function (exists) {
                            if (!exists) {
                                var lIO = filePath.lastIndexOf('/'),
                                    filePrefixNameLength = filePath.length-lIO-6,
                                    filePrefixName = filePath.substr(lIO+1, filePrefixNameLength);

                                filePath = filePath.substr(0, lIO);
                                fs.readdir(filePath, function (err, files) {
                                    var properties = [];
                                    for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        if (file.substr(0, filePrefixNameLength) == filePrefixName) properties.push(file);
                                    }

                                    if (properties.length==0) next();
                                    else parseProperties(res, filePath, properties, name, filePrefixNameLength)
                                });
                            } else {
                                parse(res, filePath, fileName);
                            }
                        });
                    }
                });
            } else next();
        }

        return middleware;
    }

    return {
        middleware: createMiddleware
    }

});