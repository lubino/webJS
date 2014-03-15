define(['compiler/ConsoleStack', 'compiler/Build'], function (ConsoleStack, compile) {

    var fs = require('fs');

    function propertyFileLocale(fileWithoutExtension, length, fileName) {
        if (fileName.substr(0, length)==fileWithoutExtension) {
            var ext = fileName.lastIndexOf('.');
            if (ext>length && fileName.substr(ext)==".properties") {
                return fileName.substr(length+1, ext-length-1);
            }
        }
        return null;
    }

    function middleware(configuration) {
        var rootDir = "", logger, cs, doStaticLoad = true;
        if (configuration) {
            if (configuration.baseDir) rootDir = configuration.baseDir;
            if (configuration.logger) logger = configuration.logger;
        }
        if (!logger) logger = {log: function (a, b) {
            console.log(a, b)
        }};
        var runParameters = compile.defaultConfig();
        cs = new ConsoleStack(/*IOutputStreamCreator*/ null, /*File*/ null, /*String*/ null, /*String*/ null, /*Boolean*/ false, logger);
        function expressUseCallBack(req, res, next) {
            var path = req.path, length;
            if ((length = path.length) > 3 && path.substr(length - 3, 3) == ".js") {
                var jsFile = rootDir + path;
                fs.exists(jsFile, function (exists) {
                    if (exists) {
                        if (doStaticLoad) {
                            fs.readFile(jsFile, function (err, data) {
                                if (err) {
                                    //todo log error
                                    console.log(err);
                                    next();
                                } else {
                                    res.set('Content-Type', 'text/javascript');
                                    res.send(data);
                                }
                            });
                        } else next();
                    } else {
                        var name = path.substr(0, length - 3);
                        var fileWithoutExtension = rootDir + name;
                        var htmlFile = fileWithoutExtension + ".html";
                        fs.exists(htmlFile, function (exists) {
                            if (exists) {
                                fs.readFile(htmlFile, function (err, data) {
                                    if (err) {
                                        //todo log error
                                        console.log(err);
                                        next();
                                    } else {
                                        res.set('Content-Type', 'text/javascript');
                                        var content = data.toString(runParameters.inputCharset);
                                        if (content.indexOf('\uFEFF') === 0) {
                                            content = content.substring(1, data.length);
                                        }
                                        res.send(compile.compileHTML(name.substr(1), content, cs, runParameters));
                                    }
                                });
                            } else {
                                var hasSlash = fileWithoutExtension.lastIndexOf('/'),
                                    filePath = hasSlash>0 ? fileWithoutExtension.substr(0, hasSlash) : "",
                                    fileName = hasSlash>=0 ? fileWithoutExtension.substr(hasSlash+1) : fileWithoutExtension;
                                fs.readdir(filePath, function (err, files) {
                                    if (err) {
                                        //todo log error
                                        console.log(err);
                                        next();
                                    } else {
                                        var filesCount = files.length, fileNameLength = fileName.length, locales = [],
                                            sname = name.substr(1);

                                        files.forEach(function (file) {
                                            var locale = propertyFileLocale(fileName, fileNameLength, file);
                                            if (locale) {
                                                locales.push(locale);
                                            }
                                            if (filesCount--==1) {
                                                if (locales.length>0) {
                                                    compile.compileProperties(cs, runParameters, function (nxt, finish) {
                                                        var li=0;
                                                        function ili() {
                                                            var locale = locales[li++];
                                                            if (!locale) {
                                                                res.set('Content-Type', 'text/javascript');
                                                                res.send(finish());
                                                            } else fs.readFile(filePath+'/'+sname+"_"+locale+".properties", function (err, data) {
                                                                if (err) {
                                                                    //todo log error
                                                                    console.log(err);
                                                                    next();
                                                                } else {
                                                                    var content = data.toString(runParameters.inputCharset);
                                                                    if (content.indexOf('\uFEFF') === 0) {
                                                                        content = content.substring(1, data.length);
                                                                    }
                                                                    nxt(sname+"_"+locale, content);
                                                                    ili();
                                                                }
                                                            });
                                                        }
                                                        ili();
                                                    });
                                                } else {
                                                    next();
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else next();
        }

        return expressUseCallBack;
    }

    return {
        middleware: middleware
    }
});