define(["parse", "web/Resources"], function (parse, Resources) {
    return parse('example/helloWorldTexts.properties', Resources.locales("en_US"));
});