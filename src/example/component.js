define(['parse', 'web/Components', 'web/Localization', 'example/compText'], function (parse, Components, Localization, compText) {
    return parse('example/component.html', null, Components, Localization);
});