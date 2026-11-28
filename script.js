var data, CCAA, circunscripciones, blancos, nulos, poblacion, resultados;

function getTrasvases(id_trasvases) {
   var confluencias_podemos_2015 = ["PODEMOS", "EN COMÚ", "PODEMOS-COM", "PODEMOS-En"];
   var confluencias_up_2016 = ["PODEMOS-IU-EQUO", "PODEMOS-EN MAREA-ANOVA-EU", "ECP", "PODEMOS-COMPROMÍS-EUPV"];
   var confluencias_up_nuevas_2019 = ["PODEMOS-EU-MAREAS EN COMÚN-EQUO", "ECP-GUANYEM EL CANVI", "PODEMOS-IU", "PODEMOS-EU"];
   var confluencias_up_2019 = confluencias_up_2016.concat(confluencias_up_nuevas_2019);
   var confluencias_podemos_up = confluencias_podemos_2015.concat(confluencias_up_2019);
   var nombres_iu = ["IU-UPeC", "IU-LV", "I.U.", "IU"];
   var agrupaciones_podemos = [["Podemos", confluencias_podemos_2015], ["Unidos Podemos", confluencias_up_2019]];
   var confluencias_mas_pais = ["MÁS PAÍS-EQUO", "MÉS COMPROMÍS", "M PAÍS-CHA-EQUO"]
   var agrupaciones_mas_pais = [["MÁS PAÍS", confluencias_mas_pais]]
   var agrupaciones = agrupaciones_podemos.concat(agrupaciones_mas_pais)
   var sumar_2023 = ["Podemos", "Unidos Podemos", "COMPROMÍS 2019", "COMPROMÍS-Q", "EN MAREA", "MÁS PAÍS", "EQUO", "CHA", "UA-CH.A", "MÉS", "ARA-MES-ESQUERRA", "MÉS-ESQUERRA"].concat(nombres_iu).concat(confluencias_podemos_up);
   var psoe_sumar = [["PSOE+Podemos+SUMAR+IU", ["PSOE", "P.S.O.E.", "PSOE-PROGR.", "SUMAR"].concat(sumar_2023).concat(nombres_iu).concat(confluencias_podemos_up).concat(confluencias_mas_pais)]]
   var izquierda_abertzale = [["EH Bildu", ["EA", "EA-EUE", "ARALAR-ZUTIK", "aralar", "EE", "HB"]]] // se excluye Amaiur porque ya unió todos los que se presentaron
   var pp_cs = [["PP+C's", ["PP", "P.P.", "C's", "Cs", "NA+"]]]
   var pp_vox = [["PP+Vox", ["PP", "P.P.", "Vox", "VOX"]]]
   var pp_cs_vox = [["PP+C's+Vox", ["PP", "P.P.", "C's", "Cs", "Vox", "VOX", "NA+"]]]
   
   return {
      "nada": [],
      "conf": agrupaciones,
      "pod_iu_mp_equo": agrupaciones.concat([["Sumar", sumar_2023]]),
      "psoe_sumar": psoe_sumar,
      "izquierda_abertzale": izquierda_abertzale,
      "pp_cs": pp_cs.concat(agrupaciones),
      "pp_vox": pp_vox.concat(agrupaciones),
      "pp_cs_vox": pp_cs_vox.concat(agrupaciones),
      "izda_ppcs": psoe_sumar.concat(pp_cs),
      "izda_ppvox": psoe_sumar.concat(pp_vox),
      "izda_dcha": psoe_sumar.concat(pp_cs_vox)
   }[id_trasvases];
}

// Lee los campos y genera los resultados
function procesa() {
   var minimo = parseInt(document.getElementById('minimo').value, 10),
       total_diputados = parseInt(document.getElementById('total_diputados').value, 10),
       metodo = window[document.getElementById('sel_metodo').value],
       tipo_circ = document.getElementById('sel_circ').value,
       corte = parseFloat(document.getElementById('corte').value.replace(",", "."), 10);

   var trasvases = getTrasvases(document.getElementById('sel_union').value);

   if (typeof(data) === "undefined")
      return;

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
function leerdatos(elec) {
   if (typeof(data) === "undefined")
      return;

   var elecciones = data[elec];
   CCAA = elecciones["CCAA"];
   circunscripciones = elecciones["circunscripciones"];
   poblacion = elecciones["ultimo_censo"];
   blancos = elecciones["blancos"];
   nulos = elecciones["nulos"];
   colores_por_defecto = data["colores_por_defecto"];
   colores = elecciones["colores"];
   resultados = elecciones["resultados"];

   for (var c in colores_por_defecto)
      if (!colores.hasOwnProperty(c))
         colores[c] = colores_por_defecto[c];

   procesa();
}


// Obtiene data.json y lo manda a procesar según los ajustes
function cargardatos() {
   try {
      var datajsonreq = new XMLHttpRequest();
   } catch (err) {
      document.getElementById("res_texto").value = "No se puede cargar los datos electorales porque este navegador no parece capaz de hacer peticiones XHR: " + err.toString();
      return;
   }
   datajsonreq.onload = function(e) {
      if (this.status >= 200 && this.status < 400) {
         try {
            if (datajsonreq.responseType === "json") {
               data = datajsonreq.response;
               if (data === null)
                  throw("error de sintaxis en data.json")
            }
            else if (window.JSON && window.JSON.parse)
               data = JSON.parse(datajsonreq.responseText);
            else
               data = new Function("return " + datajsonreq.responseText)();
         } catch(err) {
            document.getElementById("res_texto").value = "Error al procesar los datos electorales: " + err.toString();
            return;
         }
         document.getElementById("elecciones").onchange();
      }
      else
         document.getElementById("res_texto").value = "Error " + (this.status === 0 ? "al intentar obtener" : this.status + (this.statusText ? " (" + this.statusText + ")" : "") + " al descargar") + " los datos electorales";
   }
   datajsonreq.onprogress = function(e) {
      try {
         document.getElementById("res_texto").value = "Cargando datos electorales... " + (e.lengthComputable ? "(" + Math.floor(e.loaded*100/e.total) + "%)" : ["/", "-", "\\", "|"][Math.floor(Math.random()*4)]);
      } catch (err) {}
   }
   datajsonreq.onerror = function(e) {
      document.getElementById("res_texto").value = "Error al cargar los datos electorales";
   }
   datajsonreq.onabort = function(e) {
      document.getElementById("res_texto").value = "Se ha cancelado la carga de los datos electorales";
   }
   datajsonreq.open("GET", "data.json", true);
   if (XMLHttpRequest.prototype.hasOwnProperty("responseType"))
      datajsonreq.responseType = "json";
   datajsonreq.send(null);
}


// Carga los datos cuando está listo el DOM, o ya si el DOM ya está listo,
// o cuando se cargue todo si por lo que sea el navegador no lanza el evento al cargar el DOM.
// Esto es traído de jQuery (3.8.0, 2.1.4 y 1.12.2), es el comportamiento de $(document).ready()
function completed() {
   document.removeEventListener("DOMContentLoaded", completed, false);
   window.removeEventListener("load", completed, false);
   cargardatos();
}

if (document.readyState === "complete" || (document.readyState !== undefined && document.readyState !== "loading" && !document.documentElement.doScroll))
   window.setTimeout(cargardatos);
else if (document.addEventListener) {
   document.addEventListener("DOMContentLoaded", completed, false);
   window.addEventListener("load", completed, false);
} else
   window.onload = cargardatos;


// Para navegadores muy viejunos
if (!Object.keys)
   Object.keys = function(o) {
      var keys = [];
      for (var key in o)
         keys.push(key);
      return keys;
   }


// Ordena los partidos según los escaños conseguidos (por votos en caso de empate si se pasan los votos)
// Si todos es true se ordenan los partidos sin escaños también
sortPartidos = function(escanos, votos, todos) {
   if (todos == undefined) todos = false;
   var partidos = Object.keys(todos ? votos : escanos);
   function MasAMenosEscanos(a,b) {return escanos[b]-escanos[a] || (votos != undefined && votos[b]-votos[a])};
   return partidos.sort(MasAMenosEscanos);
}

// Obtiene la lista de partidos con sus escaños y votos
function parsableResults(escanos, votos) {
   var res = [];
   var partidos = sortPartidos(escanos, votos); // Ordena solo los partidos con escaños
   for (var x in partidos)
      res.push({"partido": partidos[x], "escaños": escanos[partidos[x]], "votos": votos[partidos[x]]});

   return res;
}

// Presenta los datos procesados en gráfico, lista y mapa
function actualiza(data) {
   if (typeof(data) === "undefined")
      return; // se volverá a actualizar cuando se carguen los datos

   var salida = parsableResults(data.g_escanos, data.g_votos);

   clear_mapa();
   if (data.circunscripcion != "unica")
      generaMapa(data.l_escanos, data.l_votos, data.circunscripcion, data.escanyos);

   var linea = function(a) {return a.partido + ": " + a.escaños};
   if (Array.prototype.hasOwnProperty("map"))
      var salida_lineas = salida.map(linea);
   else {
      var salida_lineas = [];
      for (var s in salida) salida_lineas.push(linea(salida[s]));
   }
   document.getElementById("res_texto").value = salida_lineas.join("\n");
   imprime(salida);
}

// Obtiene los colores fijos de los partidos (el resto queda sin definir)
function getcolores(datos) {
   var col = [];
   for (var x in datos)
      if (colores[datos[x].partido] != undefined)
         col[x] = colores[datos[x].partido];

   return col;
}

function remove_element(el) {
   if (el !== null)
      try { el.remove(); } catch(err) { el.parentNode.removeChild(el); }
}

// Limpia el gráfico
function clear_grafico() {
   if (typeof(d3) !== "undefined")
      remove_element(document.getElementById("grafico_svg"));
   remove_element(document.getElementById("grafico_alternativo"));
}

// Limpia el mapa
function clear_mapa() {
   if (typeof(d3) !== "undefined" && typeof(topojson) !== "undefined")
      remove_element(document.getElementById("mapa_svg"));
}

// A partir de un color, obtiene uno más claro
function aclarar(color) {
   if (color[0] !== '#') return color;
   if (color.length === 4)
      color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
   else if (color.length !== 7) return color;
   var r = (102+Math.ceil(parseInt(color.substring(1,3), 16)*3/5)).toString(16);
   var g = (102+Math.ceil(parseInt(color.substring(3,5), 16)*3/5)).toString(16);
   var b = (102+Math.ceil(parseInt(color.substring(5,7), 16)*3/5)).toString(16);
   return "#" + r + g + b;
}

function imprime_grafico_d3js(datos, colores, total_escaños) {
   var w = 620,     // anchura del marco del gráfico
       h = 320,     // altura
       r = 300,     // radio exterior
       ir = 160,    // radio interior
       pad = 1/400, // grados de espacio entre bloques (radianes)
       color_def = d3.scaleOrdinal(d3.schemeCategory10),  // paleta para los partidos sin color
       coloreado = function(d, i) { return (colores[i] != undefined ? colores[i] : color_def(i)); },
       min_escaños = Math.floor(total_escaños*0.055);    // mínimo de escaños para mostrar texto

   document.getElementById("grafico").textContent = '';

   var vis = d3.select("#grafico")
      .append("svg")
      .attr("id", "grafico_svg")
      .attr("viewBox", "0 0 " + w + " " + h)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .data([datos])
      .append("g")
      .attr("transform", "translate(" + w/2 + "," + r + ")")

   var arc = d3.arc()
      .outerRadius(r)
      .innerRadius(ir);

   vis.append("svg:text")
      .attr("id", "total-escanos")
      .attr("dy", "-1.1em")
      .text(function() {return total_escaños})

   vis.append("svg:text")
      .attr("id", "MA")
      .attr("dy", ".0em")
      .attr("title", "Mayoría absoluta")
      .text(function() {return "MA: " + Math.floor(total_escaños/2+1)})

   var pie = d3.pie()
      .value(function(d) { return d.value; })
      .startAngle(-Math.PI/2)
      .endAngle(Math.PI/2)
      .padAngle(pad);

   d3.select("#tooltip")
      .style("opacity", 0)

   var arcs = vis.selectAll("g")
      .data(pie)
      .enter()
         .append("svg:g")

   function path_onmouseover(d, i) {
      d3.select(this).style("fill", aclarar(coloreado(d, i)));
      d3.select("#tooltip")
         .style("opacity", 1)
         .select("#contenido")
            .text(datos[i].label + ": " + d.value);
      path_onmousemove();
   }
   function path_onmousemove() {
      d3.select("#tooltip")
         .style("left", (d3.event.pageX + 5) + "px")
         .style("top", (d3.event.pageY - 35) + "px");
   }
   function path_onmouseout(d, i) {
      d3.select(this).style("fill", coloreado(d, i));
      d3.select("#tooltip").style("opacity", 0);
   }

   arcs.append("svg:path")
      .attr("fill", coloreado)
      .attr("d", arc)
      .on("mouseover", path_onmouseover)
      .on("mousemove", path_onmousemove)
      .on("mouseout", path_onmouseout);

   arcs.append("svg:text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("font-size", "12px")
      .text(function(d, i) { if (d.value < min_escaños) return ""; else return datos[i].label + " " + d.value; });
}

function imprime_grafico_alternativo(datos, colores, total_escaños) {
   var color_def = function(i) { return ["#ccc", "#888"][i%2]; },  // paleta para los partidos sin color
       coloreado = function(d, i) { return (colores[i] != undefined ? colores[i] : color_def(i)); };

   var min_escaños = Math.floor(total_escaños*0.055);    // mínimo de escaños para mostrar texto

   var graf = document.createElement("table");
   graf.id = "grafico_alternativo";
   graf.setAttribute("cellpadding", "0");

   var fila_barras = document.createElement("tr");

   function barra_onmousemove(mouseEvent) {
      var tooltip_style = document.getElementById("tooltip").style;
      tooltip_style.setProperty("left", (mouseEvent.pageX + 5) + "px", "");
      tooltip_style.setProperty("top", (mouseEvent.pageY - 35) + "px", "");
   }
   function barra_onmouseover(nombre_partido, index, num_escaños) {
      return function(mouseEvent) {
         this.style.setProperty("background-color", aclarar(coloreado(nombre_partido, index)), "");
         document.getElementById("contenido").textContent = nombre_partido + ": " + num_escaños;
         document.getElementById("tooltip").style.setProperty("opacity", 1, "");
         barra_onmousemove(mouseEvent);
      }
   }
   function barra_onmouseout(nombre_partido, index) {
      return function() {
         this.style.setProperty("background-color", coloreado(nombre_partido, index), "");
         document.getElementById("tooltip").style.setProperty("opacity", 0, "");
      }
   }

   var colgroup = document.createElement("colgroup");
   for (var x in datos) {
      var col = document.createElement("col");
      col.setAttribute("style", "min-width: " + datos[x].value*100/total_escaños + "%;");
      colgroup.appendChild(col);
   }
   graf.appendChild(colgroup);

   for (var x in datos) {
      var nombre_partido = datos[x].label;
      var num_escaños = datos[x].value;

      var barra = document.createElement("td");
      barra.setAttribute("style", "max-width:0.01px; width: " + num_escaños*1000 + "px; width: -webkit-calc(" + num_escaños*100/total_escaños + "%); width: calc(" + num_escaños*100/total_escaños + "%); background-color: " + coloreado(nombre_partido, x) + ";");

      barra.title = nombre_partido + ": " + num_escaños;
      barra.addEventListener("mouseover", barra_onmouseover(nombre_partido, x, num_escaños), false);
      barra.addEventListener("mousemove", barra_onmousemove, false);
      barra.addEventListener("mouseout", barra_onmouseout(nombre_partido, x), false);

      if (num_escaños > min_escaños) {
         var texto = document.createElement("text");
         texto.textContent = nombre_partido.replace(/\+/g, '\u200b+').replace(/\-/g, '-\u200b') + " " + num_escaños; // añade espacios de ancho cero, que se comportan como <wbr>
         barra.appendChild(texto);
      }
      fila_barras.appendChild(barra);
   }

   var ultima_barra = document.createElement("td");
   ultima_barra.setAttribute("style", "width: 1000px;");
   fila_barras.appendChild(ultima_barra);

   var barra_MA = document.createElement("div");
   barra_MA.id = "barra_MA";

   graf.appendChild(fila_barras);
   graf.appendChild(barra_MA);

   var texto_escaños_totales = document.createElement("text");
   texto_escaños_totales.id = "total-escanos";
   texto_escaños_totales.textContent = total_escaños;

   var texto_MA = document.createElement("text");
   texto_MA.id = "MA";
   texto_MA.innerHTML = "<abbr title='Mayoría absoluta'>MA</abbr>: " + Math.floor(total_escaños/2+1);

   var placeholder = document.getElementById("placeholder_grafico_alternativo");
   placeholder.textContent = 'Gráfico de escaños alternativo al de d3js. Podría haber imprecisiones.';
   placeholder.appendChild(graf);
   placeholder.appendChild(texto_escaños_totales);
   placeholder.appendChild(texto_MA);

   document.getElementById("descripcion").style.setProperty("margin-top", "200px", "");
}

// Presenta el gráfico de los datos
function imprime(d) {
   clear_grafico();

   var datos = [],   // Nombre y escaños de cada partido
       colores = getcolores(d),
       total_escaños = 0;
   for (var x in d)
      if (d[x].escaños != 0) {
         total_escaños += d[x].escaños;
         datos.push({"label": d[x].partido, "value": d[x].escaños});
      }

   if (typeof(d3) !== "undefined") {
      try {
         imprime_grafico_d3js(datos, colores, total_escaños);
         document.getElementById("placeholder_grafico_alternativo").textContent = '';
         try {
            document.getElementById("descripcion").style.removeProperty("margin-top");
         } catch(err){}
         return;
      } catch(err) {
         document.getElementById("grafico").textContent = "Error al dibujar el gráfico de escaños con d3js: " + err.toString();
      }
   }
   // Si pasa algo con d3js, se imprime otro gráfico
   imprime_grafico_alternativo(datos, colores, total_escaños);
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
   
   clear_mapa();

   var width = 400, height = 300;

   if (typeof(d3) === "undefined")
      return; // en su lugar se muestra que se está cargando topojson (o que hubo error); se mostrará cuando se cargue

   var projection = d3.geoAlbers()
      .center([2.4, 39.4])
      .rotate([4.4, 0])
      .parallels([50, 60])
      .scale(2000)
      .translate([width / 2, height / 2]);

   var path = d3.geoPath()
      .projection(projection);

   d3.json("mapa.json", function(error, mapa) {
      if (error !== null) {
         d3.select("#mapa").text("Error " + (error.target.status === 0 ? "no especificado" : error.target.status + " (" + error.target.statusText + ")") + " al cargar el mapa");
         return;
      }
      if (typeof(topojson) === "undefined")
         return; // en su lugar se muestra que se está cargando topojson (o que hubo error); se mostrará cuando se cargue
      d3.select("#mapa").text("");

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

      var svg = d3.select("#mapa").append("svg")
         .attr("id", "mapa_svg")
         .attr("viewBox", "0 0 " + width + " " + height)
         .attr("preserveAspectRatio", "xMidYMid meet");

      function province_onmouseover(d, i) {
         d3.select(this).style("fill", function(d) { return aclarar(coloreado(d)); } );
         d3.select("#tooltip")
            .style("opacity", 1)
            .select("#contenido")
               .html(d.id + ": " + escanyos[d.id] + "<br><br>" + (cmix && !escanos_partidos.hasOwnProperty(d.id) ? "(Escaños de " + d.properties.ccaa + ")<br>" : "") + parsableResults(escanos_partidos[cmix ? d.properties.ccaa : d.id], votos[cmix ? d.properties.ccaa : d.id]).map(function(a) {return a.partido + ": " + a.escaños}).join("<br>"));
         province_onmousemove();
      }
      function province_onmousemove() {
         d3.select("#tooltip")
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY + 5) + "px");
      }
      function province_onmouseout(d, i) {
         d3.select(this).style("fill", coloreado);
         d3.select("#tooltip").style("opacity", 0);
      }

      svg.selectAll(".province")
         .data(features)
         .enter().append("path")
         .attr("class", function(d) { return "province " + d.id; })
         .attr("d", path)
         .style("fill", coloreado)
         .on("mouseover", province_onmouseover)
         .on("mousemove", province_onmousemove)
         .on("mouseout", province_onmouseout);

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
            var l_votos_actual_circ = {}, resultados_actual_circ = resultados[actual_circ], partido;
            for (partido in resultados_actual_circ)
               l_votos_actual_circ[partido] = resultados_actual_circ[partido];  // Hace una copia
            l_votos[actual_circ] = l_votos_actual_circ;
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

   return {"g_escanos": g_escanos, "g_votos": g_votos, "l_escanos": l_escanos, "l_votos": l_votos, "circunscripcion": circunscripcion, "escanyos": escanyos};
}
