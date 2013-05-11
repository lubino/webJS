define(["parse", "web/Resources"], function (parse, Resources) {
    return parse('test/tst1.properties', Resources.locales("en_US"));
});