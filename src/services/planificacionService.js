// ============================================================
// PLANIFICACION SERVICE
// ============================================================
//
// RESPONSABILIDAD:
//
// Guardar la planificación de semanas, contenedores
// y referencias en la hoja PLANIFICACION de Excel.
//
// IMPORTANTE:
//
// Este servicio NO modifica DISPONIBILIDAD.
//
// DISPONIBILIDAD sigue siendo responsabilidad de
// graphService.js.
//
// ============================================================
import {
    buscarArchivoExcel,
    obtenerUrlExcelCentral,
} from "./graphService";


const GRAPH_BASE_URL =
    "https://graph.microsoft.com/v1.0";



// ============================================================
// GRAPH FETCH LOCAL
// ============================================================
//
// No dependemos de la lógica de Semanas.jsx.
// Este servicio se comunica directamente con Graph.
//
// ============================================================

async function graphFetch(
    url,
    accessToken,
    options = {}
) {

    if (!accessToken) {
        throw new Error(
            "No existe accessToken para guardar la planificación."
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
// NORMALIZAR VALOR
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
// OBTENER PLANIFICACION
// ============================================================
//
// Lee la hoja PLANIFICACION del Excel central.
//
// IMPORTANTE:
// - Utiliza el archivo central de SharePoint.
// - NO utiliza /me/drive.
// - NO modifica Semanas.jsx.
// - Devuelve directamente el arreglo "values"
//   para que App.jsx pueda convertirlo en semanas.
//
// ============================================================

export async function obtenerPlanificacion(accessToken) {

    if (!accessToken) {
        throw new Error(
            "No existe accessToken para obtener la planificación."
        );
    }

    // ----------------------------------------------------------
    // 1. BUSCAR EL EXCEL CENTRAL
    // ----------------------------------------------------------

    const archivoExcel =
        await buscarArchivoExcel(accessToken);

    const excelId =
        archivoExcel?.id;

    if (!excelId) {
        throw new Error(
            "Se encontró LogisticsDB1.xlsm, pero no fue posible obtener su ID."
        );
    }

    // ----------------------------------------------------------
    // 2. OBTENER EL RANGO UTILIZADO DE PLANIFICACION
    // ----------------------------------------------------------

    const url =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('PLANIFICACION')` +
        `/usedRange(valuesOnly=true)`;

    const data =
        await graphFetch(
            url,
            accessToken
        );

    // ----------------------------------------------------------
    // 3. DEVOLVER LOS VALORES
    // ----------------------------------------------------------

    return data?.values || [];
}


// ============================================================
// CREAR HOJA PLANIFICACION
// ============================================================
//
// Si la hoja no existe:
//
// PLANIFICACION
//
// Si ya existe:
//
// no hace nada.
//
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
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets`;

    const data =
        await graphFetch(
            url,
            accessToken
        );

    const hojas =
        data?.value || [];

    const existe =
        hojas.some(
            (hoja) =>
                String(
                    hoja?.name || ""
                )
                    .trim()
                    .toUpperCase() ===
                "PLANIFICACION"
        );

    if (existe) {
        return hojas.find(
            (hoja) =>
                String(
                    hoja?.name || ""
                )
                    .trim()
                    .toUpperCase() ===
                "PLANIFICACION"
        );
    }

    const nuevaHoja =
        await graphFetch(
            url,
            accessToken,
            {
                method: "POST",

                body: JSON.stringify({
                    name:
                        "PLANIFICACION",
                }),
            }
        );

    return nuevaHoja;
}


// ============================================================
// ENCABEZADOS
// ============================================================
//
// UNA FILA = UNA REFERENCIA DENTRO DE UN CONTENEDOR.
//
// Esto permite después:
//
// - mover referencias
// - cambiar cantidades
// - identificar semana
// - identificar contenedor
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
// ESCRIBIR ENCABEZADOS
// ============================================================

async function asegurarEncabezados(
    accessToken,
    excelId
) {

    const rango =
        `A1:T1`;

    const url =
        obtenerUrlExcelCentral(excelId) +
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
}


// ============================================================
// CONVERTIR SEMANAS A FILAS EXCEL
// ============================================================
//
// Una referencia asignada genera una fila.
//
// Si un contenedor tiene:
//
// REF A → 10 cajas
// REF B → 20 cajas
//
// Excel tendrá:
//
// fila REF A
// fila REF B
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
            )
                .filter(
                    (contenedor) =>
                        !contenedor?.esContenedorAnterior
                )
                .forEach(
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

                                filas.push([

                                    // ------------------------------------------------
                                    // ID ÚNICO DE ESTA ASIGNACIÓN
                                    // ------------------------------------------------

                                    `${semana.id}__${contenedor.id}__${ref.availabilityKey || ref.referenceID || ref.PO || ""}`,

                                    // ------------------------------------------------
                                    // SEMANA
                                    // ------------------------------------------------

                                    valorExcel(
                                        semana?.id
                                    ),

                                    valorExcel(
                                        semana?.numero
                                    ),

                                    valorExcel(
                                        semana?.nombreBuque
                                    ),

                                    valorExcel(
                                        semana?.fechaInicio
                                    ),

                                    valorExcel(
                                        semana?.fechaFin
                                    ),

                                    // ------------------------------------------------
                                    // CONTENEDOR
                                    // ------------------------------------------------

                                    valorExcel(
                                        contenedor?.id
                                    ),

                                    valorExcel(
                                        contenedor?.codigo
                                    ),

                                    // ------------------------------------------------
                                    // REFERENCIA
                                    // ------------------------------------------------

                                    valorExcel(
                                        ref?.referenceID ||
                                        ref?.availabilityReferenceID
                                    ),

                                    valorExcel(
                                        ref?.PO
                                    ),

                                    valorExcel(
                                        ref?.referenciaDis ||
                                        ref?.referencia
                                    ),

                                    valorExcel(
                                        ref?.descripcion
                                    ),

                                    // ------------------------------------------------
                                    // CANTIDADES
                                    // ------------------------------------------------

                                    cantidadCajas,

                                    unidadesCaja,

                                    cantidadUnidades,

                                    // ------------------------------------------------
                                    // PESO
                                    // ------------------------------------------------

                                    pesoCajaKg,

                                    pesoTon,

                                    // ------------------------------------------------
                                    // CBM
                                    // ------------------------------------------------

                                    cbmCaja,

                                    cbmTotal,

                                    // ------------------------------------------------
                                    // FECHA
                                    // ------------------------------------------------

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
// LIMPIAR DATOS ANTERIORES
// ============================================================
//
// IMPORTANTE:
//
// SOLO limpia PLANIFICACION.
//
// NO toca:
//
// INVENTARIO
// DISPONIBILIDAD
// SALIDAS
// MASTER_DATA
//
// ============================================================

async function limpiarPlanificacion(
    accessToken,
    excelId
) {

    const url =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('PLANIFICACION')` +
        `/usedRange(valuesOnly=true)`;

    const data =
        await graphFetch(
            url,
            accessToken
        );

    const address =
        data?.address;

    if (!address) {
        return;
    }

    // ----------------------------------------------------------
    // Solo limpiamos desde la fila 2.
    //
    // Los encabezados quedan intactos.
    // ----------------------------------------------------------

    const match =
        address.match(
            /!([A-Z]+)(\d+):([A-Z]+)(\d+)$/i
        );

    if (!match) {
        return;
    }

    const columnaInicio =
        match[1];

    const filaInicio =
        Number(match[2]);

    const columnaFin =
        match[3];

    const filaFin =
        Number(match[4]);

    if (
        filaFin < 2
    ) {
        return;
    }

    const rango =
        `${columnaInicio}${Math.max(
            2,
            filaInicio
        )}:${columnaFin}${filaFin}`;

    const urlLimpiar =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('PLANIFICACION')` +
        `/range(address='${rango}')`;

    await graphFetch(
        urlLimpiar,
        accessToken,
        {
            method: "PATCH",

            body: JSON.stringify({
                values:
                    Array.from(
                        {
                            length:
                                filaFin - 1,
                        },
                        () =>
                            Array(
                                20
                            ).fill("")
                    ),
            }),
        }
    );
}


// ============================================================
// GUARDAR PLANIFICACION
// ============================================================
//
// Esta es la función principal.
//
// Semanas.jsx solamente necesita llamar:
//
// guardarPlanificacion(
//   accessToken,
//   excelId,
//   semanas
// )
//
// ============================================================

export async function guardarPlanificacion(
    accessToken,
    semanas
) {

    if (!accessToken) {

        throw new Error(
            "No existe accessToken para guardar la planificación."
        );
    }

    // ----------------------------------------------------------
    // OBTENER AUTOMÁTICAMENTE EL ARCHIVO EXCEL
    // ----------------------------------------------------------

    const archivoExcel =
        await buscarArchivoExcel(
            accessToken
        );

    const excelId =
        archivoExcel?.id;

    if (!excelId) {

        throw new Error(
            "Se encontró LogisticsDB1.xlsm, pero no fue posible obtener su ID."
        );
    }

    if (!Array.isArray(semanas)) {

        throw new Error(
            "La planificación recibida no es válida."
        );
    }

    // ----------------------------------------------------------
    // 1. ASEGURAR HOJA
    // ----------------------------------------------------------

    await asegurarHojaPlanificacion(
        accessToken,
        excelId
    );

    // ----------------------------------------------------------
    // 2. ENCABEZADOS
    // ----------------------------------------------------------

    await asegurarEncabezados(
        accessToken,
        excelId
    );

    // ----------------------------------------------------------
    // 3. CONVERTIR DATOS
    // ----------------------------------------------------------

    const filas =
        convertirSemanasAFilas(
            semanas
        );

    // ----------------------------------------------------------
    // 4. LIMPIAR PLANIFICACIÓN ANTERIOR
    // ----------------------------------------------------------

    await limpiarPlanificacion(
        accessToken,
        excelId
    );

    // ----------------------------------------------------------
    // 5. SI NO HAY CARGA, TERMINAMOS
    // ----------------------------------------------------------

    if (
        filas.length === 0
    ) {

        return {
            ok: true,

            filasGuardadas: 0,

            mensaje:
                "La planificación fue guardada. No existen referencias asignadas.",
        };
    }

    // ----------------------------------------------------------
    // 6. ESCRIBIR FILAS
    // ----------------------------------------------------------

    const filaInicial = 2;

    const filaFinal =
        filaInicial +
        filas.length -
        1;

    const rango =
        `A${filaInicial}:T${filaFinal}`;

    const url =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('PLANIFICACION')` +
        `/range(address='${rango}')`;

    await graphFetch(
        url,
        accessToken,
        {
            method: "PATCH",

            body: JSON.stringify({
                values:
                    filas,
            }),
        }
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
// EXPORTACIÓN POR DEFECTO
// ============================================================

export default {
    asegurarHojaPlanificacion,
    guardarPlanificacion,
    obtenerPlanificacion,
};