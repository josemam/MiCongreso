var CCAA, circunscripciones, escanyos, blancos, nulos, resultados;

function procesa() { actualiza(getResultados(
            eval(document.getElementById('sel_metodo').value),
                 document.getElementById('sel_circ').value,
      parseFloat(document.getElementById('corte').value.replace(",", "."), 10),
                (document.getElementById('pod_conf').checked ? [["Podemos", ["EN COMÚ", "Compromís-Podemos", "En Marea"]]] : []))
)}

// Suma valor (1 si valor == undefined) a partir de 0 si el elemento no está definido
function suma(obj, clave, valor) {
   if (obj[clave] == undefined)
      obj[clave] = 0;

   if (valor == undefined)
      obj[clave]++;
   else
      obj[clave] += valor;
}

// Guarda los datos del archivo JSON en variables y presenta los resultados reales
function leerdatos(data) {
   var elecciones = data["espana_2015"]
   CCAA = elecciones["CCAA"];
   circunscripciones = elecciones["circunscripciones"];
   escanyos = elecciones["escaños"];
   blancos = elecciones["blancos"];
   nulos = elecciones["nulos"];
   colores = elecciones["colores"];
   resultados = elecciones["resultados"];

   procesa();
}

$(document).ready(function() {
   $.getJSON("data.json", leerdatos);
});

// Presenta los datos procesados en gráfico y lista
function actualiza(data) {
   document.getElementById("res_texto").value = data.map(function(a) {return a.join(": ")}).join("\n");
   imprime(data);
}

// Obtiene los colores fijos de los partidos (el resto queda sin definir)
function getcolores(datos) {
   var col = [];
   for (var x in datos)
      if (colores[datos[x][0]] != undefined)
         col[x] = colores[datos[x][0]];

   return col;
}

// Limpia el gráfico
function clear_grafico() {
   d3.select("svg").remove();
}

// A partir de un color, obtiene uno más claro
function aclarar(color) {
   var r = (255-parseInt(color.substring(1,3), 16)); r = Math.floor(r*3/5); r = (255-r).toString(16)
   var g = (255-parseInt(color.substring(3,5), 16)); g = Math.floor(g*3/5); g = (255-g).toString(16)
   var b = (255-parseInt(color.substring(5,7), 16)); b = Math.floor(b*3/5); b = (255-b).toString(16)
   return "#" + r + g + b;
}

// Presenta el gráfico de los datos
function imprime(d) {
   clear_grafico();
   var w = 620,     // anchura del marco del gráfico
       h = 320,     // altura
       r = 300,     // radio exterior
       ir = 160,    // radio interior
       pad = 1/400, // grados de espacio entre bloques (radianes)
       min = 20,    // mínimo de escaños para mostrar texto
       colores = getcolores(d),
       color_def = d3.scale.category10();  // paleta para los partidos sin color
   var coloreado = function(d, i) { return (colores[i] != undefined ? colores[i] : color_def(i)); }

   var datos = [];   // Nombre y escaños de cada partido
   var total = 0;    // Total de escaños
   for (var x in d)
      if (d[x][1] != 0) {  // Si tiene más de 0 escaños
         total += d[x][1];
         datos.push({"label": d[x][0], "value": d[x][1]});
      }

   var vis = d3.select("#grafico")
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .data([datos])
      .attr("transform", "translate(" + r + "," + r + ")")

   var arc = d3.svg.arc()
      .outerRadius(r)
      .innerRadius(ir);

   vis.append("svg:text")
      .attr("font-size", "22px")
      .attr("dy", "-1.1em")
      .text(function() {return total})

   vis.append("svg:text")
      .attr("font-size", "16px")
      .attr("dy", ".0em")
      .text(function() {return "MA: " + Math.floor(total/2+1)})

   vis.selectAll("text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })

   var pie = d3.layout.pie()
      .value(function(d) { return d.value; })
      .startAngle(-Math.PI/2)
      .endAngle(Math.PI/2)
      .padAngle(pad);

   d3.select("#tooltip")
      .attr("class", "tooltip")
      .style("z-index", 1)
      .style("opacity", 0)

   var arcs = vis.selectAll("g.slice")
      .data(pie)
      .enter()
         .append("svg:g")
            .attr("class", "slice")

   arcs.append("svg:path")
      .attr("fill", coloreado )
      .attr("d", arc)
      .on("mouseover", function(d, i) {d3.select(this).style("fill",aclarar(coloreado(d,i)));
         d3.select("#tooltip")
            .attr("font-size", "14px")
            .style("opacity", 1)
            .select("#contenido")
               .text(datos[i].label + ": " + d.value);})
      .on("mousemove", function() {
         d3.select("#tooltip")
            .style("left", (d3.event.pageX + 5) + "px")
            .style("top", (d3.event.pageY - 35) + "px")})
      .on("mouseout", function(d, i) {
         d3.select(this).style("fill",coloreado(d,i));
         d3.select("#tooltip").style("opacity", 0)})

   arcs.append("svg:text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("font-size", "12px")
      .text(function(d, i) { if (d.value < min) return ""; else return datos[i].label + " " + d.value; });
}

// Pasa los votos de un partido a otro en una circunscripción
function trasvasaVotos(origen, destino, votos) {
   if (votos[origen] == undefined)
      return;

   suma(votos, destino, votos[origen]);
   votos[origen] = 0;
}

// Aplica una lista de trasvases
// Una lista de trasvases tiene la forma [[a, [b,c,d...]], [e, [f,g,h...]], [i, [j,k,l...]], ...]
// En cada elemento de la lista, el primer elemento recibe los votos de los elementos del segundo
// Por ejemplo, aquí a recibiría los votos de b, c y d; e los de f, g, h; etc.
function trasvasa(trasvases, votos) {
   for (var x in trasvases)
      for (var y in trasvases[x][1])
         trasvasaVotos(trasvases[x][1][y], trasvases[x][0], votos);
}

// Obtiene los escaños en función de los votos
function getResultados(metodo, circunscripcion, corte, trasvases) {
   var res = {};
   var res_temp;
   if (circunscripcion == "provincia") {
      for (var ca in CCAA) {
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            var resultados_circ = jQuery.extend({}, resultados[actual_circ]);  // Hace una copia
            trasvasa(trasvases, resultados_circ);
            res_temp = metodo(resultados_circ, blancos[actual_circ], escanyos[actual_circ], corte)
            for (var x in res_temp)
               suma(res, res_temp[x][0], res_temp[x][1]);
         }
      }
   }
   else if (circunscripcion == "comunidad") {
      for (var ca in CCAA) {
         var resultados_ccaa = {};
         var blancos_ccaa = 0, escanyos_ccaa = 0;
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            blancos_ccaa += blancos[actual_circ];
            escanyos_ccaa += escanyos[actual_circ];
            var partidos = Object.keys(resultados[actual_circ]);
            for (var x in partidos)
               suma(resultados_ccaa, partidos[x], resultados[actual_circ][partidos[x]]);

         }
         trasvasa(trasvases, resultados_ccaa);

         res_temp = metodo(resultados_ccaa, blancos_ccaa, escanyos_ccaa, corte)
         for (var x in res_temp)
            suma(res, res_temp[x][0], res_temp[x][1]);
      }
   }
   else if (circunscripcion == "unica") {
      var resultados_total = {};
      var blancos_total = 0, escanyos_total = 0;
      for (var ca in CCAA) {
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            blancos_total += blancos[actual_circ];
            escanyos_total += escanyos[actual_circ];
            var partidos = Object.keys(resultados[actual_circ]);
            for (var x in partidos)
               suma(resultados_total, partidos[x], resultados[actual_circ][partidos[x]]);

         }
      }
      trasvasa(trasvases, resultados_total);

      res_temp = metodo(resultados_total, blancos_total, escanyos_total, corte)
      for (var x in res_temp)
         suma(res, res_temp[x][0], res_temp[x][1]);
   }

   var salida = [];
   var partidos = Object.keys(res);
   function MasAMenosEscanos(a,b) {return res[b]-res[a]};
   partidos.sort(MasAMenosEscanos);
   for (var x in partidos)
      salida.push([partidos[x], res[partidos[x]]]);

   return salida;
}
