function init() {
    var i = 1;
    do {
        var key = 'ace' + i++, element = document.getElementById(key);
        if (element) {
            var width = element.offsetWidth-10, height = element.offsetHeight+30, value = element.innerHTML,
                type = element.getAttribute("type");
            var replace = document.createElement("div");
            element.parentNode.replaceChild(replace, element);
            var div = document.createElement("div");
            div.innerHTML = value;
            replace.appendChild(div);
            replace.style.backgroundColor = "white";
            replace.style.margin = "5px";
            replace.style.width = div.style.width = width + "px";
            replace.style.height = div.style.height = height + "px";
            var editor = ace.edit(div);
            editor.setTheme("ace/theme/chrome");
            editor.getSession().setMode("ace/mode/"+type);
            //editor.setValue(value);
            //editor.resize();
        }
    } while (element);
}
