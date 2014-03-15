define(['compiler/ConsoleStack', 'compiler/Build'], function (ConsoleStack, Build) {

    var fs = require('fs');

    function propertyFileLocale(fileWithoutExtension, length, fileName) {
        if (fileName.substr(0, length)==fileWithoutExtension) {
            var ext = fileName.lastIndexOf('.');
            if (ext>length && fileName.substr(ext)==".properties") {
                return fileName.substr(length+1, ext-length-2);
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
                                    next();
                                } else {
                                    res.set('Content-Type', 'text/javascript');
                                    res.send(data);
                                }
                            });
                        } else next();
                    } else {
                        var fileWithoutExtension = rootDir + path.substr(0, length - 2);
                        fs.exists(fileWithoutExtension + "html", function (exists) {
                            if (exists) {
                                res.set('Content-Type', 'text/javascript');
                                //TODO Compile HTML component
                                res.send("... HTML");
                            } else {
                                var hasSlash = fileWithoutExtension.lastIndexOf('/'),
                                    filePath = hasSlash>0 ? fileWithoutExtension.substr(0, hasSlash) : "",
                                    fileName = hasSlash>=0 ? fileWithoutExtension.substr(hasSlash+1) : fileWithoutExtension;
                                fs.readdir(rootDir+filePath, function (err, files) {
                                    if (err) {
                                        //todo log error
                                        next();
                                    } else {
                                        var filesCount = files.length, fileNameLength = fileName.length, result;
                                        files.forEach(function (file) {
                                            var locale = propertyFileLocale(fileName, fileNameLength, file);
                                            if (locale) {
                                                //TODO Compile Properties component
                                                result = "... Properties";
                                            }
                                            if (filesCount--==1) {
                                                if (result) {
                                                    res.set('Content-Type', 'text/javascript');
                                                    res.send(result);
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