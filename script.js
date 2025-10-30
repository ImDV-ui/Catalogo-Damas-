async function loadproducts() {
    var data = await fetch("data.json");
    var products = await data.json();
    var container = document.getElementById("products");
    container.innerHTML="Hello";
}
loadproducts();

//accedemos a cada uno de los elementos de productsÇ
products.forEach(product => {
    //creamos un div para cada elemento
    document.createElement("div");
    //Le ponemos el HTML que queramos
    
});