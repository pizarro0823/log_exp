
// ============================================================
// PLANIFICACION SERVICE
// ============================================================
//
// RESPONSABILIDAD:
//
// - Leer PLANIFICACION desde LogisticsDB1.xlsm
// - Guardar PLANIFICACION en LogisticsDB1.xlsm
// - Crear la hoja PLANIFICACION si no existe
// - Mantener los encabezados
//
// IMPORTANTE:
//
// ESTE SERVICIO NO MODIFICA:
//
// - INVENTARIO
// - DISPONIBILIDAD
// - SALIDAS
// - MASTER_DATA
//
// ============================================================

import { buscarArchivoExcel } from "./graphService.js";

const GRAPH_BASE_URL =
  "https://graph.microsoft.com/v1.0";


// ============================================================
// GRAPH FETCH
// ============================================================

async function graphFetch(
  url,
  accessToken,
  options = {}
) {

  if (!accessToken) {
    throw new Error(
      "No existe accessToken."
    );
  }

  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          ...(options.headers || {}),
        },
      }
    );

  if (!response.ok) {

    let detalle = "";

    try {

      const errorData =
        await response.json();

      detalle =
        errorData?.error?.message ||
        JSON.stringify(errorData);

    } catch {

      detalle =
        await response.text();

    }

    throw new Error(
      `Microsoft Graph ${response.status}: ${detalle}`
    );
  }

  if (
    response.status === 204
  ) {

    return null;
  }

  return response.json();
}


// ============================================================
// NORMALIZAR VALORES
// ============================================================

function valorExcel(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return "";
  }

  return valor;
}


// ============================================================
// ENCABEZADOS DE PLANIFICACION
// ============================================================
//
// EXACTAMENTE 20 COLUMNAS:
//
// A:T
//
// ============================================================

const ENCABEZADOS = [

  "PlanificacionID",

  "SemanaID",

  "NumeroSemana",

  "NombreBuque",

  "FechaInicio",

  "FechaFin",

  "ContenedorID",

  "CodigoContenedor",

  "ReferenceID",

  "PO",

  "Referencia",

  "Descripcion",

  "CantidadCajas",

  "UnidadesCaja",

  "CantidadUnidades",

  "PesoCajaKg",

  "PesoTon",

  "CBMCaja",

  "CBMTotal",

  "FechaActualizacion",

];


// ============================================================
// ASEGURAR HOJA PLANIFICACION
// ============================================================

export async function asegurarHojaPlanificacion(
  accessToken,
  excelId
) {

  if (!accessToken) {

    throw new Error(
      "No existe accessToken."
    );
  }

  if (!excelId) {

    throw new Error(
      "No existe el ID del archivo Excel."
    );
  }

  const url =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets`;

  const data =
    await graphFetch(
      url,
      accessToken
    );

  const hojas =
    data?.value || [];

  const hojaExistente =
    hojas.find(
      (hoja) =>
        String(
          hoja?.name || ""
        )
          .trim()
          .toUpperCase() ===
        "PLANIFICACION"
    );

  if (hojaExistente) {

    return hojaExistente;
  }

  console.log(
    "CREANDO HOJA PLANIFICACION..."
  );

  const nuevaHoja =
    await graphFetch(
      url,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify({
          name: "PLANIFICACION",
        }),
      }
    );

  return nuevaHoja;
}


// ============================================================
// ASEGURAR ENCABEZADOS
// ============================================================
//
// IMPORTANTE:
//
// Esta función SOLO escribe A1:T1.
//
// Nunca toca las filas de datos.
//
// ============================================================

async function asegurarEncabezados(
  accessToken,
  excelId
) {

  const rango =
    "A1:T1";

  const url =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets('PLANIFICACION')` +
    `/range(address='${rango}')`;

  await graphFetch(
    url,
    accessToken,
    {
      method: "PATCH",

      body: JSON.stringify({
        values: [
          ENCABEZADOS
        ],
      }),
    }
  );

  console.log(
    "ENCABEZADOS PLANIFICACION ASEGURADOS"
  );
}


// ============================================================
// OBTENER PLANIFICACION
// ============================================================
//
// Lee:
//
// A1:T...
//
// Devuelve:
//
// [
//   [encabezado1, encabezado2, ...],
//   [dato1, dato2, ...],
//   ...
// ]
//
// Esto es lo que App.jsx utiliza posteriormente para
// convertir los registros nuevamente en semanas.
//
// ============================================================

export async function obtenerPlanificacion(
  accessToken
) {

  console.log(
    "=========================================="
  );

  console.log(
    "CARGANDO PLANIFICACIÓN DESDE EXCEL"
  );

  console.log(
    "=========================================="
  );

  if (!accessToken) {

    throw new Error(
      "No existe accessToken para leer la planificación."
    );
  }

  // ----------------------------------------------------------
  // BUSCAR EXCEL
  // ----------------------------------------------------------

  const archivoExcel =
    await buscarArchivoExcel(
      accessToken
    );

  if (!archivoExcel?.id) {

    throw new Error(
      "No fue posible encontrar LogisticsDB1.xlsm."
    );
  }

  const excelId =
    archivoExcel.id;

  console.log(
    "EXCEL ENCONTRADO:",
    archivoExcel.name
  );

  // ----------------------------------------------------------
  // ASEGURAR HOJA
  // ----------------------------------------------------------

  const hoja =
    await asegurarHojaPlanificacion(
      accessToken,
      excelId
    );

  console.log(
    "HOJA PLANIFICACION:",
    hoja
  );

  // ----------------------------------------------------------
  // LEER USED RANGE
  // ----------------------------------------------------------

  const url =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets('PLANIFICACION')` +
    `/usedRange`;

  console.log(
    "LEYENDO RANGO:",
    url
  );

  const data =
    await graphFetch(
      url,
      accessToken
    );

  const values =
    data?.values || [];

  const address =
    data?.address || "";

  console.log(
    "RANGO PLANIFICACION:",
    address
  );

  console.log(
    "FILAS PLANIFICACION:",
    values.length
  );

  // ----------------------------------------------------------
  // SI NO EXISTEN DATOS
  // ----------------------------------------------------------

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    console.log(
      "PLANIFICACION VACÍA."
    );

    // Aseguramos los encabezados solamente.
    await asegurarEncabezados(
      accessToken,
      excelId
    );

    return [
      ENCABEZADOS
    ];
  }

  // ----------------------------------------------------------
  // PROTEGER ENCABEZADOS
  // ----------------------------------------------------------
  //
  // Si por alguna razón Excel devuelve solamente A1
  // o una tabla sin encabezados correctos, restauramos
  // solamente la fila 1.
  //
  // NUNCA borramos los datos aquí.
  //
  // ----------------------------------------------------------

  const primeraFila =
    Array.isArray(values[0])
      ? values[0]
      : [];

  const encabezadosCorrectos =
    ENCABEZADOS.every(
      (encabezado, index) =>
        primeraFila[index] ===
        encabezado
    );

  if (
    !encabezadosCorrectos
  ) {

    console.log(
      "ENCABEZADOS INCORRECTOS. RESTAURANDO A1:T1..."
    );

    await asegurarEncabezados(
      accessToken,
      excelId
    );

    // Volvemos a leer para devolver la estructura
    // correcta al frontend.

    const dataActualizada =
      await graphFetch(
        url,
        accessToken
      );

    const valuesActualizados =
      dataActualizada?.values || [];

    return valuesActualizados;
  }

  return values;
}


// ============================================================
// CONVERTIR SEMANAS A FILAS DE EXCEL
// ============================================================
//
// Cada referencia asignada = una fila.
//
// ============================================================

function convertirSemanasAFilas(
  semanas
) {

  const filas = [];

  (
    semanas || []
  ).forEach(
    (semana) => {

      (
        semana?.contenedores || []
      ).forEach(
        (contenedor) => {

          (
            contenedor?.referencias || []
          ).forEach(
            (ref) => {

              const cantidadCajas =
                Number(
                  ref?.cantidadCajas
                ) || 0;

              const pesoCajaKg =
                Number(
                  ref?.pesoCajaKg
                ) || 0;

              const cbmCaja =
                Number(
                  ref?.cbmCaja
                ) || 0;

              const unidadesCaja =
                Number(
                  ref?.unidadesCaja
                ) || 0;

              const cantidadUnidades =
                Number(
                  ref?.cantidadUnidades
                ) ||
                (
                  cantidadCajas *
                  unidadesCaja
                );

              const pesoTon =
                (
                  cantidadCajas *
                  pesoCajaKg
                ) / 1000;

              const cbmTotal =
                cantidadCajas *
                cbmCaja;

              // ------------------------------------------------
              // ID ÚNICO
              // ------------------------------------------------

              const identificadorReferencia =
                ref?.availabilityKey ||
                ref?.referenceID ||
                ref?.availabilityReferenceID ||
                ref?.PO ||
                "";

              const planificacionID =
                `${semana?.id || ""}` +
                `__${contenedor?.id || ""}` +
                `__${identificadorReferencia}`;

              filas.push([

                // A
                planificacionID,

                // B
                valorExcel(
                  semana?.id
                ),

                // C
                valorExcel(
                  semana?.numero
                ),

                // D
                valorExcel(
                  semana?.nombreBuque
                ),

                // E
                valorExcel(
                  semana?.fechaInicio
                ),

                // F
                valorExcel(
                  semana?.fechaFin
                ),

                // G
                valorExcel(
                  contenedor?.id
                ),

                // H
                valorExcel(
                  contenedor?.codigo
                ),

                // I
                valorExcel(
                  ref?.referenceID ||
                  ref?.availabilityReferenceID
                ),

                // J
                valorExcel(
                  ref?.PO
                ),

                // K
                valorExcel(
                  ref?.referenciaDis ||
                  ref?.referencia
                ),

                // L
                valorExcel(
                  ref?.descripcion
                ),

                // M
                cantidadCajas,

                // N
                unidadesCaja,

                // O
                cantidadUnidades,

                // P
                pesoCajaKg,

                // Q
                pesoTon,

                // R
                cbmCaja,

                // S
                cbmTotal,

                // T
                new Date().toISOString(),

              ]);
            }
          );
        }
      );
    }
  );

  return filas;
}


// ============================================================
// OBTENER ÚLTIMA FILA DE PLANIFICACION
// ============================================================

async function obtenerRangoPlanificacion(
  accessToken,
  excelId
) {

  const url =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets('PLANIFICACION')` +
    `/usedRange(valuesOnly=true)`;

  const data =
    await graphFetch(
      url,
      accessToken
    );

  return data;
}


// ============================================================
// LIMPIAR DATOS ANTERIORES
// ============================================================
//
// IMPORTANTE:
//
// SOLO limpia desde A2:T...
//
// JAMÁS toca A1:T1.
//
// ============================================================

async function limpiarPlanificacion(
  accessToken,
  excelId
) {

  const data =
    await obtenerRangoPlanificacion(
      accessToken,
      excelId
    );

  const address =
    data?.address;

  if (!address) {

    console.log(
      "No existe rango utilizado en PLANIFICACION."
    );

    return;
  }

  console.log(
    "RANGO ACTUAL PLANIFICACION:",
    address
  );

  // ----------------------------------------------------------
  // Extraer coordenadas
  // ----------------------------------------------------------

  const match =
    address.match(
      /!([A-Z]+)(\d+):([A-Z]+)(\d+)$/i
    );

  if (!match) {

    console.log(
      "No fue posible interpretar el rango:",
      address
    );

    return;
  }

  const columnaInicio =
    match[1];

  const filaInicio =
    Number(
      match[2]
    );

  const columnaFin =
    match[3];

  const filaFin =
    Number(
      match[4]
    );

  // ----------------------------------------------------------
  // Si solamente existe la fila 1,
  // NO limpiamos nada.
  // ----------------------------------------------------------

  if (
    filaFin < 2
  ) {

    console.log(
      "Solo existe la fila de encabezados. No se limpia."
    );

    return;
  }

  // ----------------------------------------------------------
  // Siempre comenzamos mínimo en fila 2.
  // ----------------------------------------------------------

  const filaLimpieza =
    Math.max(
      2,
      filaInicio
    );

  const rango =
    `${columnaInicio}${filaLimpieza}:` +
    `${columnaFin}${filaFin}`;

  console.log(
    "LIMPIANDO RANGO:",
    rango
  );

  const urlLimpiar =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets('PLANIFICACION')` +
    `/range(address='${rango}')`;

  // ----------------------------------------------------------
  // Determinar número de filas y columnas
  // ----------------------------------------------------------

  const numeroFilas =
    filaFin -
    filaLimpieza +
    1;

  const numeroColumnas =
    20;

  const valoresVacios =
    Array.from(
      {
        length:
          numeroFilas,
      },
      () =>
        Array(
          numeroColumnas
        ).fill("")
    );

  // ----------------------------------------------------------
  // IMPORTANTE:
  //
  // Usamos una variable llamada values.
  //
  // Esto evita el error:
  //
  // ReferenceError: values is not defined
  //
  // ----------------------------------------------------------

  const values =
    valoresVacios;

  await graphFetch(
    urlLimpiar,
    accessToken,
    {
      method: "PATCH",

      body: JSON.stringify({
        values,
      }),
    }
  );

  console.log(
    "PLANIFICACION ANTERIOR LIMPIADA."
  );
}


// ============================================================
// GUARDAR PLANIFICACION
// ============================================================

export async function guardarPlanificacion(
  accessToken,
  semanas
) {

  console.log(
    "=========================================="
  );

  console.log(
    "GUARDANDO PLANIFICACIÓN EN EXCEL"
  );

  console.log(
    "=========================================="
  );

  if (!accessToken) {

    throw new Error(
      "No existe accessToken para guardar la planificación."
    );
  }

  if (
    !Array.isArray(semanas)
  ) {

    throw new Error(
      "La planificación recibida no es válida."
    );
  }

  // ----------------------------------------------------------
  // BUSCAR EXCEL
  // ----------------------------------------------------------

  const archivoExcel =
    await buscarArchivoExcel(
      accessToken
    );

  if (!archivoExcel?.id) {

    throw new Error(
      "Se encontró LogisticsDB1.xlsm, pero no fue posible obtener su ID."
    );
  }

  const excelId =
    archivoExcel.id;

  console.log(
    "EXCEL ENCONTRADO:",
    archivoExcel.name
  );

  // ----------------------------------------------------------
  // 1. ASEGURAR HOJA
  // ----------------------------------------------------------

  await asegurarHojaPlanificacion(
    accessToken,
    excelId
  );

  // ----------------------------------------------------------
  // 2. ASEGURAR ENCABEZADOS
  // ----------------------------------------------------------
  //
  // Esto escribe SOLO A1:T1.
  //
  // No elimina los datos existentes.
  //
  // ----------------------------------------------------------

  await asegurarEncabezados(
    accessToken,
    excelId
  );

  // ----------------------------------------------------------
  // 3. CONVERTIR SEMANAS
  // ----------------------------------------------------------

  const filas =
    convertirSemanasAFilas(
      semanas
    );

  console.log(
    "FILAS A GUARDAR:",
    filas.length
  );

  // ----------------------------------------------------------
  // 4. LIMPIAR DATOS ANTERIORES
  // ----------------------------------------------------------
  //
  // SOLO A2:T...
  //
  // LOS ENCABEZADOS QUEDAN INTACTOS.
  //
  // ----------------------------------------------------------

  await limpiarPlanificacion(
    accessToken,
    excelId
  );

  // ----------------------------------------------------------
  // 5. SI NO HAY REFERENCIAS
  // ----------------------------------------------------------

  if (
    filas.length === 0
  ) {

    console.log(
      "No existen referencias para guardar."
    );

    return {

      ok: true,

      filasGuardadas: 0,

      mensaje:
        "La planificación fue guardada. No existen referencias asignadas.",

    };
  }

  // ----------------------------------------------------------
  // 6. ESCRIBIR NUEVAS FILAS
  // ----------------------------------------------------------

  const filaInicial =
    2;

  const filaFinal =
    filaInicial +
    filas.length -
    1;

  const rango =
    `A${filaInicial}:T${filaFinal}`;

  console.log(
    "ESCRIBIENDO RANGO:",
    rango
  );

  const url =
    `${GRAPH_BASE_URL}/me/drive/items/${excelId}` +
    `/workbook/worksheets('PLANIFICACION')` +
    `/range(address='${rango}')`;

  // ----------------------------------------------------------
  // IMPORTANTE:
  //
  // La variable correcta es filas.
  //
  // NO usar una variable inexistente llamada "values".
  //
  // ----------------------------------------------------------

  const values =
    filas;

  await graphFetch(
    url,
    accessToken,
    {
      method: "PATCH",

      body: JSON.stringify({
        values,
      }),
    }
  );

  console.log(
    "PLANIFICACIÓN GUARDADA CORRECTAMENTE."
  );

  console.log(
    "FILAS GUARDADAS:",
    filas.length
  );

  // ----------------------------------------------------------
  // RESULTADO
  // ----------------------------------------------------------

  return {

    ok: true,

    filasGuardadas:
      filas.length,

    mensaje:
      `Planificación guardada correctamente. ${filas.length} registros enviados a Excel.`,

  };
}


// ============================================================
// EXPORTACIÓN
// ============================================================

export default {

  asegurarHojaPlanificacion,

  obtenerPlanificacion,

  guardarPlanificacion,

};
