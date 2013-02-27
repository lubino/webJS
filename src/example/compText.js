define(['parse', 'web/Localization'], function (parse, Localization) {
    return parse('example/compText.properties', ["en_US"], null, Localization);
});