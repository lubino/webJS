var fs = require('fs');
var args = process.argv.slice(2);

fs.readFile(args[0], function (err, a1) {
    fs.readFile(args[2], function (err, a2) {
        var replacement = a2.toString('utf8'), i=-2;
        while ((i=replacement.indexOf('\\',i+2))>=0) {
            replacement = (i>0?replacement.substr(0, i):"")+"\\\\"+replacement.substr(i+1);
        }
        while (replacement.indexOf("\n")!=-1) replacement = replacement.replace("\n", "\\n");
        i=-2;
        while ((i=replacement.indexOf('"',i+2))>=0) {
            replacement = (i>0?replacement.substr(0, i):"")+"\\\""+replacement.substr(i+1);
        }
        var replaced = a1.toString('utf8').replace(args[1], replacement);
        console.log("Writing "+args[2]+" to "+args[3]+" as token '"+args[1]+"'");
        fs.writeFile(args[3], replaced, function (err) {
            if (err) console.log("ERROR writing file "+args[3], err);
        });
    });
});