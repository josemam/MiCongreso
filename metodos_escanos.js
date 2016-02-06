// Ordena la lista de votos por partido por número de votos
// En el JSON están ordenadas, pero pueden desordenarse al trasvasar votos
function ordenaPorVotos(a, b) { return b.votos - a.votos };

// Da un escaño a cada partido por cada cincuenta mil votos
function escanocadacincuentamil(resultados, blancos, escanyos, corte) {
   var divisor = 50000
   // Mapea a lista de objetos
   if (typeof(resultados) == "object")
      var resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });

   resultados.sort(ordenaPorVotos);

   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < divisor) {
         resultados = resultados.slice(0, i);
         break;
      }

   var res_nombres = [];
   for (var x = 0; resultados[x] != undefined; x++)
      res_nombres[x] = [resultados[x].partido, Math.floor(resultados[x].votos / divisor)];
   
   return res_nombres;
}

// Toma tantos votantes al azar como escaños y considera sus votos
function muestreoaleatorio(resultados, blancos, escanyos, corte) {
   // Mapea a lista de objetos
   if (typeof(resultados) == "object")
      var resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });

   resultados.sort(ordenaPorVotos);

   var votos_totales = blancos;
   for (var i = 0; i < resultados.length; i++)
      votos_totales += resultados[i].votos;

   var votos_corte = votos_totales*corte/100;
   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < votos_corte) {
         resultados = resultados.slice(0, i);
         break;
      }

   if (resultados.length == 0) return [];

   var votos_no_cortados = 0;
   for (var i = 0; i < resultados.length; i++)
      votos_no_cortados += resultados[i].votos;

   var votos_matrix = [];
   var res = [0];
   votos_matrix[0] = resultados[0].votos;
   for (var i = 1; i < resultados.length; i++) {
      votos_matrix[i] = resultados[i].votos+votos_matrix[i-1];
      res[i] = 0;
   }

   for (var i = 0; i < escanyos; i++) {
      var muestreo = Math.random()*votos_no_cortados;
      var partido;
      for (partido = 0; votos_matrix[partido] < muestreo; partido++);

      res[partido]++;
   }

   var res_nombres = [];
   for (var x in res)
      res_nombres[x] = [resultados[x].partido, res[x]];

   return res_nombres;
}

// Aplica el método del resto mayor con cociente Droop
function resto_mayor(resultados, blancos, escanyos, corte) {
   // Mapea a lista de objetos
   if (typeof(resultados) == "object")
      var resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });

   resultados.sort(ordenaPorVotos);

   var votos_totales = blancos;
   for (var i = 0; i < resultados.length; i++)
      votos_totales += resultados[i].votos;

   var votos_corte = votos_totales*corte/100;
   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < votos_corte) {
         resultados = resultados.slice(0, i);
         break;
      }

   if (resultados.length == 0) return [];

   var divisor = 1+votos_totales/(escanyos+1);  // cociente Droop
   //var divisor = votos_totales/escanyos;      // cociente Hare

   var cocientes = []
   var restos = [];
   var asignados = 0;
   for (var i = 0; i < resultados.length; i++) {
      asignados += (cocientes[i] = Math.floor(resultados[i].votos/divisor));
      restos[i] = resultados[i].votos - cocientes[i]/divisor;
   }

   while(asignados < escanyos) {
      var maximo = 0;
      for (var i = 1; i < cocientes.length; i++)
         if (restos[i] > restos[maximo])
            maximo = i;

      cocientes[maximo]++;
      restos[maximo] = -1;
      asignados++;
   }

   var res_nombres = [];
   for (var x = 0; x < cocientes.length; x++)
      if (cocientes[x] != 0)
         res_nombres.push([resultados[x].partido, cocientes[x]]);

   return res_nombres;
}

// Aplica el método D'Hondt
function dhondt(resultados, blancos, escanyos, corte) {
   // Mapea a lista de objetos
   if (typeof(resultados) == "object")
      var resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });

   resultados.sort(ordenaPorVotos);

   var votos_totales = blancos;
   for (var i = 0; i < resultados.length; i++)
      votos_totales += resultados[i].votos;

   var votos_corte = votos_totales*corte/100;
   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < votos_corte) {
         resultados = resultados.slice(0, i);
         break;
      }

   var dhondt_matrix = [];
   for (var i = 0; i < resultados.length; i++) {
      dhondt_matrix[i] = [];
      for (var j = 0; j < escanyos; j++)
         dhondt_matrix[i][j] = resultados[i].votos/(j+1);
   }

   var res = [];
   function orden(a, b) { var dif = dhondt_matrix[b[0]][b[1]] - dhondt_matrix[a[0]][a[1]]; if (dif != 0) { return dif } else { return a[0]-b[0]} };
   var candidatos = [];
      for (var i = 0; i < resultados.length; i++)
         for (var j = 0; j < escanyos; j++)
            candidatos.push([i, j]); // [partido, división]

   candidatos.sort(orden);
   candidatos = candidatos.slice(0, escanyos);
   for (var x in candidatos)
      suma(res, candidatos[x][0]);

   var res_nombres = [];
   for (var x in res)
      res_nombres[x] = [resultados[x].partido, res[x]];

   return res_nombres;
}

// Aplica el método Sainte-Laguë
function saintelague(resultados, blancos, escanyos, corte) {
   // Mapea a lista de objetos
   if (typeof(resultados) == "object")
      var resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });

   resultados.sort(ordenaPorVotos);

   var votos_totales = blancos;
   for (var i = 0; i < resultados.length; i++)
      votos_totales += resultados[i].votos;

   var votos_corte = votos_totales*corte/100;
   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < votos_corte) {
         resultados = resultados.slice(0, i);
         break;
      }

   var saint_lague_matrix = [];
   for (var i = 0; i < resultados.length; i++) {
      saint_lague_matrix[i] = [];
      for (var j = 0; j < escanyos; j++)
         saint_lague_matrix[i][j] = resultados[i].votos/(2*j+1);
   }

   var res = [];
   function orden(a, b) { var dif = saint_lague_matrix[b[0]][b[1]] - saint_lague_matrix[a[0]][a[1]]; if (dif != 0) { return dif } else { return a[0]-b[0]} };
   var candidatos = [];
      for (var i = 0; i < resultados.length; i++)
         for (var j = 0; j < escanyos; j++)
            candidatos.push([i, j]); // [partido, división]

   candidatos.sort(orden);
   candidatos = candidatos.slice(0, escanyos);
   for (var x in candidatos)
      suma(res, candidatos[x][0]);

   var res_nombres = [];
   for (var x in res)
      res_nombres[x] = [resultados[x].partido, res[x]];

   return res_nombres;
}
