define(['compiler/HtmlParser', 'compiler/PropertiesParser', 'compiler/Map', 'compiler/DependenciesMapper', 'compiler/Strings', 'compiler/InputStream'], function (HtmlParser, PropertiesParser, Map, DependenciesMapper, Strings, InputStream) {

    function build(params, cs, file, log) {

        var runParameters = parseArgs(params);
        if (!runParameters.destination && (!runParameters.replaceFile || !runParameters.contentFile)) {
            log("\n" +
                "Usage: node r.js -lib w.js [options] -source SOURCE_DIR -dest DESTINATION_DIR" +
                "\n" +
                "where options include:\n" +
                "  -exclude PARAMETER   to set the \"exclude\" regular expression for source files\n" +
                "  -create PARAMETER      to set the \"createInstance\" parameter\n" +
                "                         (Default: \"Components.createInstance\")\n" +
                "  -safeValue PARAMETER to set the \"safeValue\" parameter\n" +
                "                         (Default: \"Components._sV\")\n" +
                "  -in PARAMETER        to set the \"inputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -out PARAMETER       to set the \"outputCharset\" parameter\n" +
                "                         (Default: \"UTF-8\")\n" +
                "  -control POLICIES    to set the coding rules policy\n" +
                "                       (e.g. \"-control parametricPage,parametricCall,dynamicPages,doc\")\n" +
                "  -exclude REG_EXP     to set the files to be excluded (REG_EXP is regular expression)\n" +
                "  -v VERBOSE_DIR       to set the verbose output directory\n" +
                "  -cp JAVA_CLASS_PATH  to set the CLASS_PATH for compiled java sources\n" +
                "  -javadoc PATH        to set the JavaDoc PATH of compiled java sources\n" +
                "  -overwrite           to overwrite all existing files also with the latest \"modified\" timestamp\n" +
                "  -silent              do not inform me about skipped files\n" +
                "  -f                   Follow. The program will not terminate after compiling all the files, but\n" +
                "                       will enter an endless loop, wherein it waits for file changes.\n" +
                "\n" +
                "Replace usage: node r.js -lib w.js [options] -replace DESTINATION_FILE -with SOURCE_FILE\n" +
                "\n" +
                "which replaces string '/*REQUIRE_BUILD*/' in SOURCE_FILE with content in DESTINATION_FILE\n" +
                "where options include the same options parameters as in first case." +
                "\n" +
                "Author: Lubos Strapko (https://github.com/lubino)");
            throw "Required start parameters not included!";
        }

        if (runParameters.destination) {
            var files = [];
            var filter = {
                include: /(\.htm(l)?)|(\.properties)$/g
            };
            if (runParameters.exclude) filter.exclude = new RegExp(runParameters.exclude);
            var i;
            for (i = 0; i < runParameters.sources.length; i++) {
                var source = Strings.toPath(runParameters.sources[i]);
                var toAdd = file.getFilteredFileList(source, filter, true, false);
                if (source.charAt(source.length - 1) != '/') source += '/';
                for (var l = 0; l < toAdd.length; l++) {
                    files.push({file: toAdd[l], name: toAdd[l].replace(source, "")});
                }
            }

            var destination = Strings.toPath(runParameters.destination);
            if (!Strings.endsWith(destination, '/')) destination += '/';

            //noinspection JSValidateTypes
            var /*Map*/ propertiesMap = new Map(), outs;
            var /*DependenciesMapper*/ dependencies;
            for (i = 0; i < files.length; i++) {
                //noinspection JSValidateTypes
                dependencies = new DependenciesMapper();
                //noinspection JSValidateTypes
                var /*InputStream*/ input = new InputStream(file.readFile(files[i].file, runParameters.inputCharset));
                var fileName = files[i].name;
                var name;
                var type = parseType(fileName);

                //remove extension
                fileName = fileName.substr(0, fileName.lastIndexOf('.'));

                if (type == 2) {
                    var localeIndex = fileName.indexOf('_');
                    if (localeIndex > 0) {
                        name = fileName.substr(0, localeIndex);
                    } else {
                        name = fileName;
                    }

                    var out = PropertiesParser.parseProperties(fileName, input, dependencies, cs, runParameters);
                    outs = propertiesMap.get(name);
                    if (!outs) {
                        outs = [out];
                        propertiesMap.put(name, outs);
                    } else {
                        outs.push(out);
                    }
                    outs.dependencies = dependencies;
                    //containsKey
                } else if (type == 1) {
                    name = fileName;
                    fileName = name + ".js";
                    log(i + ": " + files[i].name + " (" + destination + fileName + ")");
                    //noinspection JSValidateTypes
                    var /*HtmlParser*/ parser = new HtmlParser(name, dependencies, runParameters);
                    var js = parser.parse(input, cs);
                    var requireJS_Definition = HtmlParser.doRequireModule(js, dependencies);
                    file.saveFile(destination + fileName, requireJS_Definition, runParameters.outputCharset);
                } else {
                    throw "Unknown file extension '" + fileName + "'";
                }
            }

            var names = propertiesMap.keys();
            var lineSeparator = file.getLineSeparator();
            for (i = 0; i < names.length; i++) {
                outs = propertiesMap.get(names[i]);
                var result = "";
                for (var k = 0; k < outs.length; k++) {
                    if (!result) result = outs[k];
                    else result += lineSeparator + outs[k];
                }
                log(i + ": " + names[i] + " (" + destination + names[i] + ")");
                result = PropertiesParser.finishProperties(names[i], result, outs.dependencies);

                file.saveFile(destination + names[i] + ".js", PropertiesParser.doRequireModule(result, outs.dependencies), runParameters.outputCharset);
            }
        }

        if (runParameters.replaceFile && runParameters.contentFile) {
            var /*String*/ replaceFile = file.readFile(runParameters.replaceFile, runParameters.inputCharset);
            var /*String*/ content = file.readFile(runParameters.contentFile, runParameters.inputCharset);
            replaceFile = replaceFile.replace('/*REQUIRE_BUILD*/', content);
            file.saveFile(runParameters.replaceFile, replaceFile, runParameters.outputCharset);
        }
    }


    function parseArgs(args) {
        var result = defaultConfig();
        if (args != null) {
            var /*int*/ i = 0, j;
            while (i < args.length) {
                var /*String[]*/ paths;
                if (args[i] == "-source") {
                    paths = args[++i].split(";");
                    if (paths.length > 1 || paths[0].length > 0) {
                        result.sources = [];
                        for (j = 0; j < paths.length; j++) if (paths[j] > '') {
                            result.sources.push(paths[j]);
                        }
                    }
                } else if (args[i] == "-cp") {
                    paths = args[++i].split(";");
                    if (paths.length > 1 || paths[0].length > 0) {
                        result.cp = [];
                        for (j = 0; j < paths.length; j++) if (paths[j] > '') {
                            result.cp.push(paths[j]);
                        }
                    }
                } else if (args[i] == "-replace") {
                    result.replaceFile = args[++i];
                } else if (args[i] == "-with") {
                    result.contentFile = args[++i];
                } else if (args[i] == "-dest")
                    result.destination = args[++i];
                else if (args[i] == "-safeValue")
                    result.safeValue = args[++i];
                else if (args[i] == "-create")
                    result.createInstance = args[++i];
                else if (args[i] == "-in")
                    result.inputCharset = args[++i];
                else if (args[i] == "-exclude")
                    result.exclude = args[++i];
                else if (args[i] == "-out")
                    result.outputCharset = args[++i];
                else if (args[i] == "-control")
                    result.control = args[++i];
                else if (args[i] == "-v")
                    result.verbose = args[++i];
                else if (args[i] == "-api")
                    result.webDir = args[++i];
                else if (args[i] == "-javadoc")
                    result.javaDocPath = args[++i];
                else if (args[i] == "-overwrite")
                    result.overwrite = true;
                else if (args[i] == "-silent")
                    result.silent = true;
                else if (args[i] == "-f")
                    result.follow = [];
                i++;
            }
        }
        if (result.webDir>"" && !Strings.endsWith(result.webDir, '/')) result.webDir += '/';
        return result;
    }

    function parseType(/*String*/ name) {
        var fileNameLowerCase = name.toLowerCase();
        if (Strings.endsWith(fileNameLowerCase, ".html")) {
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".htm")) {
            return 1;
        } else if (Strings.endsWith(fileNameLowerCase, ".properties")) {
            return 2;
        } else throw "Unknown file type '"+name+"'";
    }

    function defaultConfig() {
        return {
            createInstance: "Components.createInstance",
            safeValue: "Components._sV",
            resource: "Resources.setResourceModule",
            resourceBundle: "Resources.rb",
            webDir: "web/",
            inputCharset: "UTF-8",
            outputCharset: "UTF-8"
        }
    }

    return {
        parseType: parseType,
        build: build,
        defaultConfig: defaultConfig,
        author: "Lubos Strapko (https://github.com/lubino)"
    };
});