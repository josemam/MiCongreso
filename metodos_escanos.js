// Ordena la lista de votos por partido por número de votos
// En el JSON están ordenadas, pero pueden desordenarse al trasvasar votos
function ordenaPorVotos(a, b) { return b.votos - a.votos };

// Mapea a lista ordenada de objetos
function aListaOrdenada(resultados) {
   if (typeof(resultados) == "object")
      resultados = $.map(resultados, function(value, index) {
         return { partido: index, votos: value}; });
         
   return resultados.sort(ordenaPorVotos);
}

// Cuenta el total de votos emitidos no nulos
function contarVotosTotales(resultados, blancos) {
   if (blancos == undefined) blancos = 0;
   for (var i = 0; i < resultados.length; i++)
      blancos += resultados[i].votos;

   return blancos;
}

// Aplica el corte en los resultados
function corta(resultados, votos_totales, corte) {
   var votos_corte = votos_totales*corte/100;
   for (var i = 0; i < resultados.length; i++)
      if (resultados[i].votos < votos_corte)
         return resultados.slice(0, i);

   return resultados;
}

// Da un escaño a cada partido por cada cincuenta mil votos (ignora el corte)
function escanocadacincuentamil(resultados, blancos, escanyos, corte) {
   resultados = aListaOrdenada(resultados);

   var res_nombres = [];
   var divisor = 50000;
   for (var x = 0; x < resultados.length && resultados[x].votos >= divisor; x++)
      res_nombres[resultados[x].partido] = Math.floor(resultados[x].votos / divisor);
   
   return res_nombres;
}

// Da todos los escaños al partido más votado en la circunscripción
// Sí, esto todavía se usa en algunos países
function fptp(resultados, blancos, escanyos, corte) {
   resultados = aListaOrdenada(resultados)
   if (resultados.length == 0) return [];
   var res_nombres = [];
   res_nombres[resultados[0].partido] = escanyos;
   return res_nombres;
}

// Da tres escaños al partido más votado y uno al siguiente,
// salvo donde hubiese 1, en cuyo caso da 2, ambos al más votado.
// Se basa en lo que se hace en el Senado para los senadores de
// designación directa (asume que el votante marca los tres primeros
// candidatos a senador del partido al que votó en el Congreso, ignora
// que los territorios insulares tienen una organización en
// circunscripciones distinta)
function simul_senado(resultados, blancos, escanyos, corte) {
   resultados = aListaOrdenada(resultados)
   if (resultados.length == 0) return [];
   var res_nombres = [];
   if (escanyos == 1)
      res_nombres[resultados[0].partido] = 2;
   else
   {
      res_nombres[resultados[0].partido] = 3;
      if (resultados.length > 1) res_nombres[resultados[1].partido] = 1;
   }
   return res_nombres;
}

// Toma tantos votantes al azar como escaños y considera sus votos
function muestreoaleatorio(resultados, blancos, escanyos, corte) {
   resultados = aListaOrdenada(resultados);
   var votos_totales = contarVotosTotales(resultados, blancos);
   resultados = corta(resultados, votos_totales, corte);

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
      if (res[x] != 0)
         res_nombres[resultados[x].partido] = res[x];

   return res_nombres.sort(function(a, b) { return b[1]-a[1]; });
}

// Cociente Droop para el método de resto mayor
function cociente_droop(totales, escanyos) {
   return 1+totales/(escanyos+1);
}

// Cociente Hare para el método de resto mayor
function cociente_hare(totales, escanyos) {
   return totales/escanyos;
}

// Divisor usado en la versión D'Hondt del método de promedio mayor
function divisor_dhondt(votos, index) {
   return votos/(index+1);
}

// Divisor usado en la versión Sainte-Laguë del método de promedio mayor
function divisor_sainte_lague(votos, index) {
   return votos/(2*index+1);
}

// Divisor usado en la versión modificada de la versión Sainte-Laguë del método de promedio mayor
function divisor_sainte_lague_mod(votos, index) {
   return votos/(index ? (2*index+1) : 1.4);
}

// Divisor usado en la versión Huntington-Hill del método de promedio mayor
function divisor_huntington_hill(votos, index) {
   return votos/(Math.sqrt((index+1)*(index+2)));
}

// Aplica un método de resto mayor
function resto_mayor(resultados, blancos, escanyos, corte, tipo_cociente) {
   resultados = aListaOrdenada(resultados);
   var votos_totales = contarVotosTotales(resultados, blancos);
   resultados = corta(resultados, votos_totales, corte);
   // Se podría volver a contar los votos totales, lo que trataría los votos a candidaturas sin suficientes votos como nulos. Al no hacer nada, los tratamos como votos en blanco

   if (resultados.length == 0) return [];

   var divisor = tipo_cociente(votos_totales, escanyos);

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

      if (restos[maximo] === -1)
         break; // ya se añadió un escaño a todos los partidos que superaron el corte: se dejan vacantes los demás. (Esto puede pasar si hay suficientes votos en blanco)

      cocientes[maximo]++;
      restos[maximo] = -1;
      asignados++;
   }

   var res_nombres = {};
   for (var x = 0; x < cocientes.length; x++)
      if (cocientes[x] != 0)
         res_nombres[resultados[x].partido] = cocientes[x];

   return res_nombres;
}

// Aplica un método de promedio mayor
function promedio_mayor(resultados, blancos, escanyos, corte, tipo_divisor) {
   resultados = aListaOrdenada(resultados);
   var votos_totales = contarVotosTotales(resultados, blancos);
   resultados = corta(resultados, votos_totales, corte);

   if (resultados.length == 0) return [];

   var cocientes_matrix = [];
   for (var i = 0; i < resultados.length; i++) {
      cocientes_matrix[i] = [];
      for (var j = 0; j < escanyos; j++)
         cocientes_matrix[i][j] = tipo_divisor(resultados[i].votos, j);
   }

   var res = [];
   function orden(a, b) { var dif = cocientes_matrix[b[0]][b[1]] - cocientes_matrix[a[0]][a[1]]; if (dif != 0) { return dif } else { return a[0]-b[0]} };
   var candidatos = [];
      for (var i = 0; i < resultados.length; i++)
         for (var j = 0; j < escanyos; j++)
            candidatos.push([i, j]); // [partido, división]

   candidatos.sort(orden);
   candidatos = candidatos.slice(0, escanyos);
   for (var x in candidatos)
      suma(res, candidatos[x][0]);

   var res_nombres = {};
   for (var x in res)
      res_nombres[resultados[x].partido] = res[x];

   return res_nombres;
}

// Aplica el método de resto mayor con cociente Droop
function droop(resultados, blancos, escanyos, corte) {
   return resto_mayor(resultados, blancos, escanyos, corte, cociente_droop);
}

// Aplica el método de resto mayor con cociente Hare
function hare(resultados, blancos, escanyos, corte) {
   return resto_mayor(resultados, blancos, escanyos, corte, cociente_hare);
}

// Aplica el método D'Hondt
function dhondt(resultados, blancos, escanyos, corte) {
   return promedio_mayor(resultados, blancos, escanyos, corte, divisor_dhondt);
}

// Aplica el método Sainte-Laguë
function saintelague(resultados, blancos, escanyos, corte) {
   return promedio_mayor(resultados, blancos, escanyos, corte, divisor_sainte_lague);
}

// Aplica el método Sainte-Laguë modificado
function saintelaguemod(resultados, blancos, escanyos, corte) {
   return promedio_mayor(resultados, blancos, escanyos, corte, divisor_sainte_lague_mod);
}

// Aplica el método Huntington-Hill
function huntington_hill(resultados, blancos, escanyos, corte) {
   return promedio_mayor(resultados, blancos, escanyos, corte, divisor_huntington_hill);
}
