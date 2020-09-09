function menu() {
    var x = document.getElementById("myLinks");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function openForm() {
    document.getElementById("formUpdate").style.display = "block";
    document.getElementById("formBG").style.display = "block";
}
function closeForm() {
    document.getElementById("formUpdate").style.display = "none";
    document.getElementById("formBG").style.display = "none";
}

if ($(window).width() > 767) {
    alert("This website only for phones.");
 }
