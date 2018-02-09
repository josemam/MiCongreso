var data, CCAA, circunscripciones, blancos, nulos, poblacion, resultados;

// Lee los campos y genera los resultados
function procesa() {
   var minimo = parseInt(document.getElementById('minimo').value, 10);
   var total_diputados = parseInt(document.getElementById('total_diputados').value, 10);
   var metodo = eval(document.getElementById('sel_metodo').value);
   var tipo_circ = document.getElementById('sel_circ').value;
   var corte = parseFloat(document.getElementById('corte').value.replace(",", "."), 10);
   var trasvases = (document.getElementById('iu_pod').checked ? [["Unidos Podemos", ["Podemos", "EN COMÚ", "Compromís-Podemos", "En Marea", "IU-UPeC"]]] : (document.getElementById('pod_conf').checked ? [["Podemos", ["EN COMÚ", "Compromís-Podemos", "En Marea"]]] : []));
   var escanyos = (tipo_circ == "unica" ? total_diputados : getEscanyos(minimo,[[["Ceuta", "Melilla"], 1]], total_diputados, tipo_circ == "comunidad"));

   actualiza(getResultados(escanyos, metodo, tipo_circ, corte, trasvases));
}

// Obtiene el reparto de escaños por circunscripción
// minimo es el mínimo número de escaños que puede tener una circunscripción (ignorando los fijos)
// fijos es un array de la forma [[[circ1a, circ1b, ...], num1], [[circ2a, circ2b, ...], num2], ...]
// donde a circ1a, circ1b... se les asigna num1 escaños, etc
// total es el número de escaños que deben repartirse
// por_ccaa determina si se reparten entre comunidades autónomas (true) o provincias (false)
function getEscanyos(minimo, fijos, total, por_ccaa) {
   var escanos = {}, escanos_fijos = {};
   var restantes = total;
   for (var i = 0; i < fijos.length; i++)
      for (var j = 0; j < fijos[i][0].length; j++) {
         escanos_fijos[fijos[i][0][j]] = fijos[i][1];
         restantes -= fijos[i][1];
      }

   if (por_ccaa) {
      for (var ccaa in circunscripciones)
         if (!escanos_fijos.hasOwnProperty(ccaa))
            restantes -= (escanos[ccaa] = minimo);
   }
   else
      for (var ccaa in circunscripciones)
         for (var circ in circunscripciones[ccaa])
            if (!escanos_fijos.hasOwnProperty(circunscripciones[ccaa][circ]))
               restantes -= (escanos[circunscripciones[ccaa][circ]] = minimo);

   if (restantes > 0) {
      var divisiones = {};
      var poblacion_total = 0;

      if (por_ccaa)
         for (var ccaa in circunscripciones)
            if (!poblacion.hasOwnProperty(ccaa)) {
               var suma_ccaa = 0;
               for (var prov in circunscripciones[ccaa])
                  suma_ccaa += poblacion[circunscripciones[ccaa][prov]];
               poblacion[ccaa] = suma_ccaa;
            }

      for (var l in escanos)
         poblacion_total += poblacion[l];

      var cuota_reparto = poblacion_total/restantes;
      for (var e in escanos) {
         divisiones[e] = poblacion[e]/cuota_reparto;
         var suelo = Math.floor(divisiones[e]);
         escanos[e] += suelo;
         divisiones[e] -= suelo;
         restantes -= suelo;
      }

      var restos = [];
      for (var d in divisiones)
         restos.push([d, divisiones[d]]);

      restos.sort(function(a,b) { return b[1]-a[1] });
      for (; restantes > 0; restantes--)
         escanos[restos.shift()[0]]++;
   }
   for (var f in escanos_fijos)
      escanos[f] = escanos_fijos[f];

   return escanos;
}

// Suma valor (o 1 si valor == undefined) a partir de 0 si el elemento no está definido
function suma(obj, clave, valor) {
   if (obj[clave] == undefined)
      obj[clave] = 0;

   if (valor == undefined)
      obj[clave]++;
   else
      obj[clave] += valor;
}

// Reparte los datos del archivo JSON en variables y presenta los resultados reales
function leerdatos(elec = "espana_2016") {
   var elecciones = data[elec];
   CCAA = elecciones["CCAA"];
   circunscripciones = elecciones["circunscripciones"];
   poblacion = elecciones["ultimo_censo"];
   blancos = elecciones["blancos"];
   nulos = elecciones["nulos"];
   colores = elecciones["colores"];
   resultados = elecciones["resultados"];

   procesa();
}

$(document).ready(function() {
   $.getJSON("data.json", function(d) { data = d; leerdatos() } );
});

// Ordena los partidos según los escaños conseguidos (por votos en caso de empate si se pasan los votos)
// Si todos es true se ordenan los partidos sin escaños también
sortPartidos = function(escanos, votos, todos) {
   if (todos == undefined) todos = false;
   var partidos = Object.keys(todos ? votos : escanos);
   function MasAMenosEscanos(a,b) {return escanos[b]-escanos[a] || (votos != undefined && votos[b]-votos[a])};
   return partidos.sort(MasAMenosEscanos);
}

// Obtiene la lista de partidos con sus escaños
function parsableResults(escanos, votos) {
   var res = [];
   var partidos = sortPartidos(escanos, votos); // Ordena solo los partidos con escaños
   for (var x in partidos)
      res.push([partidos[x], escanos[partidos[x]]]);

   return res;
}

// Presenta los datos procesados en gráfico, lista y mapa
function actualiza(data) {
   var salida = parsableResults(data.g_escanos, data.g_votos);

   clear_mapa();
   if (data.circunscripcion != "unica")
      generaMapa(data.l_escanos, data.l_votos, data.circunscripcion, data.escanyos);

   document.getElementById("res_texto").value = salida.map(function(a) {return a.join(": ")}).join("\n");
   imprime(salida);
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
   d3.select("#grafico").select("svg").remove();
}

// Limpia el mapa
function clear_mapa() {
   d3.select("#mapa").select("svg").remove();
}

// A partir de un color, obtiene uno más claro
function aclarar(color) {
   var r = (102+Math.ceil(parseInt(color.substring(1,3), 16)*3/5)).toString(16);
   var g = (102+Math.ceil(parseInt(color.substring(3,5), 16)*3/5)).toString(16);
   var b = (102+Math.ceil(parseInt(color.substring(5,7), 16)*3/5)).toString(16);
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

   var min = Math.floor(total*0.055);    // mínimo de escaños para mostrar texto

   var vis = d3.select("#grafico")
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .data([datos])
      .append("g")
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

   var pie = d3.layout.pie()
      .value(function(d) { return d.value; })
      .startAngle(-Math.PI/2)
      .endAngle(Math.PI/2)
      .padAngle(pad);

   d3.select("#tooltip")
      .attr("class", "tooltip")
      .style("z-index", 1)
      .style("opacity", 0)

   var arcs = vis.selectAll("g")
      .data(pie)
      .enter()
         .append("svg:g")

   arcs.append("svg:path")
      .attr("fill", coloreado)
      .attr("d", arc)
      .on("mouseover", function(d, i) {d3.select(this).style("fill",aclarar(coloreado(d,i)));
         d3.select("#tooltip")
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

// Obtiene los colores de cada circunscripción a partir de los resultados
function getColoresFromData(escanos, votos) {
   var partidos = sortPartidos(escanos, votos);
   if (partidos.length) {
      if (colores.hasOwnProperty(partidos[0]))
         return colores[partidos[0]];

      return "#CDD"; // Color si el primer partido no tiene color asignado
   }
   return "#777"; // Color si ningún partido obtiene escaños
}

// Obtiene los escaños de una circunscripción a partir de los resultados
// Si el reparto asigna un número distinto de diputados al previsto, esta función no devolverá el previsto, sino el resultante
function getEscanyosFromData(escanos) {
   var total = 0;
   for (var x in escanos)
      total += escanos[x];

   return total;
}

// Prepara el mapa
function generaMapa(escanos_partidos, votos, circunscripcion, escanyos_supuestos) {
   var colores = {};
   var escanyos = {};
   var cmix = circunscripcion == "comunidad_mix";
   for (var circ in escanos_partidos) {
      colores[circ] = getColoresFromData(escanos_partidos[circ], votos[circ]);
      if (!cmix)
         escanyos[circ] = getEscanyosFromData(escanos_partidos[circ]);
   }

   if (cmix)
      for (var prov in escanyos_supuestos)
         escanyos[prov] = escanyos_supuestos[prov]
   
   d3.select("#mapa").select("svg").remove();

   var width = 400, height = 300;
    
   var projection = d3.geo.albers()
      .center([2.4, 39.4])
      .rotate([4.4, 0])
      .parallels([50, 60])
      .scale(2000)
      .translate([width / 2, height / 2]);

   var path = d3.geo.path()
      .projection(projection);
    
    
   var svg = d3.select("#mapa").append("svg")
      .attr("width", width)
      .attr("height", height);

   d3.json("mapa.json", function(error, mapa) {
      var provincias = topojson.feature(mapa, mapa.objects.provinces);
      var features;
      if (circunscripcion != "comunidad")
         features = provincias.features;
      else {
         features = [];
         for (var ca in CCAA) {
            var m = topojson.merge(mapa, mapa.objects.provinces.geometries.filter(function(d) { return circunscripciones[CCAA[ca]].indexOf(d.id) != -1 }));
            m.id = CCAA[ca];
            features.push(m)
         }
      }

      var coloreado;
      if (circunscripcion != "comunidad_mix")
         coloreado = function(d) { return colores[d.id] }
      else
         coloreado = function(d) { return colores[d.properties.ccaa] }
   
      svg.selectAll(".province")
         .data(features)
         .enter().append("path")
         .attr("class", function(d) { return "province " + d.id; })
         .attr("d", path)
         .style("fill", coloreado)
         .on("mouseover", function(d, i) {
            d3.select(this).style("fill", function(d) { return aclarar(coloreado(d)); } );
            d3.select("#tooltip")
               .style("opacity", 1)
               .select("#contenido")
                  .html(d.id + ": " + escanyos[d.id] + "<br><br>" + (cmix && !escanos_partidos.hasOwnProperty(d.id) ? "(Escaños de " + d.properties.ccaa + ")<br>" : "") + parsableResults(escanos_partidos[cmix ? d.properties.ccaa : d.id], votos[cmix ? d.properties.ccaa : d.id]).map(function(a) {return a.join(": ")}).join("<br>"));})
         .on("mousemove", function() {
            d3.select("#tooltip")
               .style("left", (d3.event.pageX + 10) + "px")
               .style("top", (d3.event.pageY + 5) + "px")})
         .on("mouseout", function(d, i) {
            d3.select(this).style("fill", coloreado);
            d3.select("#tooltip").style("opacity", 0)});

      if (circunscripcion == "provincia" || circunscripcion == "comunidad_mix")
         svg.append("path")
            .datum(topojson.mesh(mapa, mapa.objects.provinces, function(a, b) { return a !== b }))
            .attr("d", path)
            .attr("class", "province-boundary");

      svg.append("path")
         .datum(topojson.mesh(mapa, mapa.objects.provinces, function(a, b) { return a !== b && a.properties.ccaa != b.properties.ccaa }))
         .attr("d", path)
         .attr("class", "ccaa-boundary");
      
      svg.selectAll(".province-label")
         .data(features).enter().append("text")
         .attr("class", function(d) { return "province-label " + d.id; })
         .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
         .attr("dy", ".35em")
         .text(function(d) { return escanyos[d.id]; });
   });
}

// Vuelca resultados locales en los resultados globales
function vuelca(local, global) {
   for (var x in local)
      suma(global, x, local[x]);
}

// Obtiene los escaños en función de los votos
function getResultados(escanyos, metodo, circunscripcion, corte, trasvases) {
   var g_escanos = {}, g_votos = {}, l_escanos = {}, l_votos = {}; // global/local escaños/votos
   
   if (circunscripcion == "provincia") {
      for (var ca in CCAA) {
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            l_votos[actual_circ] = jQuery.extend({}, resultados[actual_circ]);  // Hace una copia
            trasvasa(trasvases, l_votos[actual_circ]);
            l_escanos[actual_circ] = metodo(l_votos[actual_circ], blancos[actual_circ], escanyos[actual_circ], corte);

            vuelca(l_escanos[actual_circ], g_escanos);
            vuelca(l_votos[actual_circ], g_votos);
         }
      }
   }
   else if (circunscripcion == "comunidad" || circunscripcion == "comunidad_mix") {
      for (var ca in CCAA) {
         l_votos[CCAA[ca]] = {};
         var blancos_ccaa = 0, escanyos_ccaa = 0;
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            blancos_ccaa += blancos[actual_circ];
            escanyos_ccaa += escanyos[actual_circ];
            var partidos = Object.keys(resultados[actual_circ]);
            for (var x in partidos)
               suma(l_votos[CCAA[ca]], partidos[x], resultados[actual_circ][partidos[x]]);

         }
         trasvasa(trasvases, l_votos[CCAA[ca]]);
         if (circunscripcion == "comunidad")
            escanyos_ccaa = escanyos[CCAA[ca]];

         l_escanos[CCAA[ca]] = metodo(l_votos[CCAA[ca]], blancos_ccaa, escanyos_ccaa, corte);

         vuelca(l_escanos[CCAA[ca]], g_escanos);
         vuelca(l_votos[CCAA[ca]], g_votos);
      }
   }
   else if (circunscripcion == "unica") {
      var blancos_total = 0;
      for (var ca in CCAA) {
         for (var circ in circunscripciones[CCAA[ca]]) {
            var actual_circ = circunscripciones[CCAA[ca]][circ];
            blancos_total += blancos[actual_circ];
            var partidos = Object.keys(resultados[actual_circ]);
            for (var x in partidos)
               suma(g_votos, partidos[x], resultados[actual_circ][partidos[x]]);

         }
      }
      trasvasa(trasvases, g_votos);

      g_escanos = metodo(g_votos, blancos_total, escanyos, corte)
   }

   return {g_escanos, g_votos, l_escanos, l_votos, circunscripcion, escanyos};
}
