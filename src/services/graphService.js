// ============================================================
// CONFIGURACIÓN MICROSOFT GRAPH
// ============================================================

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

// ============================================================
// ARCHIVO CENTRAL COMPARTIDO
// ============================================================
//
// El archivo ya no se busca en /me/drive.
// Se resuelve mediante el enlace de SharePoint/OneDrive
// compartido del archivo central.
//
// Configurar en Vercel y en .env.local:
// VITE_CENTRAL_EXCEL_SHARE_URL=<enlace de LogisticsDB1.xlsm>
//
// IMPORTANTE:
// El enlace debe corresponder al archivo compartido y los
// usuarios deben tener permisos sobre ese archivo.
//
const CENTRAL_EXCEL_SHARE_URL =
    import.meta.env.VITE_CENTRAL_EXCEL_SHARE_URL || "";

let CENTRAL_DRIVE_ID = "";
let CENTRAL_EXCEL_ID = "";

function encodeSharingUrl(url) {
    if (!url) {
        throw new Error(
            "No existe la URL de SharePoint para el archivo central."
        );
    }

    // Convertir la URL a Base64
    const base64 =
        btoa(
            unescape(
                encodeURIComponent(url)
            )
        );

    // Convertir Base64 a Base64URL sin padding
    const base64Url =
        base64
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

    // Formato requerido por Microsoft Graph
    return `u!${base64Url}`;
}




export function obtenerUrlExcelCentral(excelId) {

    if (!CENTRAL_DRIVE_ID) {
        throw new Error(
            "No se ha resuelto el DriveId del archivo central. Primero debe ejecutarse buscarArchivoExcel()."
        );
    }

    if (
        CENTRAL_EXCEL_ID &&
        String(CENTRAL_EXCEL_ID) !== String(excelId)
    ) {
        throw new Error(
            "El ID del Excel recibido no corresponde al archivo central configurado."
        );
    }

    return (
        `${GRAPH_BASE_URL}/drives/${CENTRAL_DRIVE_ID}` +
        `/items/${excelId}`
    );
}


// ============================================================
// ACTUALIZAR SEMANA DE UN CONTENEDOR ANTERIOR
// ============================================================
//
// Actualiza únicamente la columna D = Semana
// de la hoja CONTENEDORES_ANTERIORES.
//
// Busca el contenedor por:
// A = ID
//
// NO modifica:
// - PLANIFICACION
// - DISPONIBILIDAD
// - INVENTARIO
// - MASTER_DATA
//
// ============================================================

export async function actualizarSemanaContenedorAnterior(
    accessToken,
    idAnterior,
    nuevaSemana
) {
    if (!accessToken) {
        throw new Error(
            "No existe accessToken para actualizar el contenedor anterior."
        );
    }

    if (!idAnterior) {
        throw new Error(
            "No existe el ID del contenedor anterior."
        );
    }

    if (
        nuevaSemana === null ||
        nuevaSemana === undefined ||
        nuevaSemana === ""
    ) {
        throw new Error(
            "No existe la nueva semana del contenedor anterior."
        );
    }

    // ----------------------------------------------------------
    // 1. OBTENER EL ARCHIVO EXCEL CENTRAL
    // ----------------------------------------------------------

    const archivoExcel =
        await buscarArchivoExcel(
            accessToken
        );

    const excelId =
        archivoExcel?.id;

    if (!excelId) {
        throw new Error(
            "No fue posible obtener el ID de LogisticsDB1.xlsm."
        );
    }

    // ----------------------------------------------------------
    // 2. LEER CONTENEDORES_ANTERIORES
    // ----------------------------------------------------------

    const urlLectura =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('CONTENEDORES_ANTERIORES')` +
        `/usedRange(valuesOnly=true)`;

    const data =
        await graphFetch(
            urlLectura,
            accessToken
        );

    const valores =
        data?.values || [];

    if (!Array.isArray(valores) || valores.length === 0) {
        throw new Error(
            "La hoja CONTENEDORES_ANTERIORES no contiene datos."
        );
    }

    // ----------------------------------------------------------
    // 3. BUSCAR EL ID
    // ----------------------------------------------------------
    //
    // A = ID
    // B = MesFacturado
    // C = MesDespacho
    // D = Semana
    //
    // La fila 1 contiene encabezados.
    // ----------------------------------------------------------

    const indiceFila =
        valores.findIndex(
            (fila, index) => {

                if (index === 0) {
                    return false;
                }

                return (
                    String(
                        fila?.[0] ?? ""
                    )
                        .trim()
                        .toUpperCase() ===
                    String(
                        idAnterior
                    )
                        .trim()
                        .toUpperCase()
                );
            }
        );

    if (indiceFila === -1) {
        throw new Error(
            `No se encontró el contenedor anterior ${idAnterior} en CONTENEDORES_ANTERIORES.`
        );
    }

    // Excel usa fila 1 como encabezado.
    // El índice 1 del array corresponde a fila 2 de Excel.
    const numeroFilaExcel =
        indiceFila + 1;

    // ----------------------------------------------------------
    // 4. ACTUALIZAR SOLAMENTE COLUMNA D
    // ----------------------------------------------------------

    const rango =
        `D${numeroFilaExcel}`;

    const url =
        obtenerUrlExcelCentral(excelId) +
        `/workbook/worksheets('CONTENEDORES_ANTERIORES')` +
        `/range(address='${rango}')`;

    await graphFetch(
        url,
        accessToken,
        {
            method: "PATCH",

            body: JSON.stringify({
                values: [
                    [
                        Number(
                            nuevaSemana
                        )
                    ]
                ]
            })
        }
    );

    // ----------------------------------------------------------
    // 5. RESULTADO
    // ----------------------------------------------------------

    console.log(
        "SEMANA CONTENEDOR ANTERIOR ACTUALIZADA EN EXCEL:",
        {
            idAnterior,
            nuevaSemana,
            filaExcel:
                numeroFilaExcel,
            rango
        }
    );

    return {
        ok: true,
        idAnterior,
        nuevaSemana:
            Number(
                nuevaSemana
            ),
        filaExcel:
            numeroFilaExcel
    };
}


// ============================================================
// FUNCIÓN GENERAL PARA LLAMAR MICROSOFT GRAPH
// ============================================================

async function graphFetch(url, accessToken, options = {}) {
    const response = await fetch(url, {
        ...options,

        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        let detalle = "";

        try {
            const errorData = await response.json();

            detalle =
                errorData?.error?.message ||
                JSON.stringify(errorData);
        } catch {
            detalle = await response.text();
        }

        throw new Error(
            `Microsoft Graph ${response.status}: ${detalle}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}


// ============================================================
// BUSCAR ARCHIVO EXCEL
// ============================================================

export async function buscarArchivoExcel(accessToken) {
    const shareToken = encodeSharingUrl(
        CENTRAL_EXCEL_SHARE_URL
    );

    const url =
        `${GRAPH_BASE_URL}/shares/${shareToken}/driveItem`;

    let archivo;

    try {
        archivo = await graphFetch(
            url,
            accessToken
        );
    } catch (error) {
        throw new Error(
            `No se pudo acceder al archivo central LogisticsDB1.xlsm mediante el enlace compartido. ${error?.message || ""}`.trim()
        );
    }

    if (
        !archivo ||
        String(archivo.name || "").toLowerCase() !==
        "logisticsdb1.xlsm"
    ) {
        throw new Error(
            "El enlace central no apunta a LogisticsDB1.xlsm."
        );
    }

    const driveId =
        archivo?.parentReference?.driveId;

    if (!driveId || !archivo?.id) {
        throw new Error(
            "Microsoft Graph encontró el archivo central, pero no devolvió DriveId/ItemId."
        );
    }

    CENTRAL_DRIVE_ID = driveId;
    CENTRAL_EXCEL_ID = archivo.id;

    return archivo;
}


// ============================================================
// OBTENER HOJAS
// ============================================================

export async function obtenerHojasExcel(
    accessToken,
    excelId
) {
    const url =
        `${obtenerUrlExcelCentral(excelId)}/workbook/worksheets`;

    const data =
        await graphFetch(
            url,
            accessToken
        );

    return data?.value || [];
}


// ============================================================
// OBTENER RANGO USADO DE UNA HOJA
// ============================================================

async function obtenerUsedRange(
    accessToken,
    excelId,
    nombreHoja
) {
    const url =
        `${obtenerUrlExcelCentral(excelId)}` +
        `/workbook/worksheets('${encodeURIComponent(nombreHoja)}')` +
        `/usedRange(valuesOnly=true)`;

    return graphFetch(
        url,
        accessToken
    );
}


// ============================================================
// INVENTARIO
// ============================================================

export async function obtenerInventario(
    accessToken,
    excelId
) {
    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "INVENTARIO"
        );

    return range?.values || [];
}


// ============================================================
// DISPONIBILIDAD
//
// COLUMNAS:
//
// A = ReferenceID
// B = Referencia
// C = CajasTotales
// D = CajasDisponible
// E = CajasNoDisponibles
// F = FechaActualizacion
// G = ActualizadoPor
// ============================================================

export async function obtenerDisponibilidad(
    accessToken,
    excelId
) {
    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "DISPONIBILIDAD"
        );

    return range?.values || [];
}


// ============================================================
// SALIDAS
// ============================================================

export async function obtenerSalidas(
    accessToken,
    excelId
) {
    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "SALIDAS"
        );

    return range?.values || [];
}


// ============================================================
// MASTER DATA
// ============================================================

export async function obtenerMasterData(
    accessToken,
    excelId
) {
    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "MASTER_DATA"
        );

    return range?.values || [];
}


// ============================================================
// COMPROBAR TABLAS DE SALIDAS
// ============================================================

export async function comprobarTablaSalidas(
    accessToken,
    excelId
) {
    const url =
        `${obtenerUrlExcelCentral(excelId)}` +
        `/workbook/worksheets('SALIDAS')/tables`;

    const data =
        await graphFetch(
            url,
            accessToken
        );

    return data?.value || [];
}


// ============================================================
// ACTUALIZAR DISPONIBILIDAD
//
// cantidadCambio:
//
// NEGATIVO = reservar/asignar cajas
//
// POSITIVO = liberar/eliminar cajas
//
// Ejemplo:
//
// 50 disponibles
//
// -10
//
// = 40
//
// Después:
//
// -10
//
// = 30
//
// Después eliminar 10:
//
// +10
//
// = 40
// ============================================================

export async function actualizarDisponibilidad(
    accessToken,
    excelId,
    referenceID,
    cantidadCambio,
    actualizadoPor = ""
) {
    if (!accessToken) {
        throw new Error(
            "No existe accessToken para actualizar Excel."
        );
    }

    if (!excelId) {
        throw new Error(
            "No existe el ID del archivo Excel."
        );
    }

    if (
        referenceID === null ||
        referenceID === undefined ||
        String(referenceID).trim() === ""
    ) {
        throw new Error(
            "No se recibió ReferenceID."
        );
    }

    const cambio =
        Number(cantidadCambio);

    if (
        !Number.isFinite(cambio) ||
        cambio === 0
    ) {
        throw new Error(
            "La cantidad de cambio debe ser un número diferente de cero."
        );
    }


    // ==========================================================
    // 1. LEER DISPONIBILIDAD ACTUAL
    // ==========================================================

    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "DISPONIBILIDAD"
        );

    const valores =
        range?.values || [];


    if (valores.length < 2) {
        throw new Error(
            "La hoja DISPONIBILIDAD no contiene registros."
        );
    }


    // ==========================================================
    // 2. BUSCAR REFERENCE ID
    // ==========================================================

    const indiceFila =
        valores
            .slice(1)
            .findIndex(
                (fila) =>
                    String(fila?.[0] ?? "")
                        .trim()
                        .toLowerCase() ===
                    String(referenceID)
                        .trim()
                        .toLowerCase()
            );


    if (indiceFila === -1) {
        throw new Error(
            `No se encontró el ReferenceID ${referenceID} en DISPONIBILIDAD.`
        );
    }


    // +1 porque quitamos encabezados con slice(1)
    const numeroFila =
        indiceFila + 2;


    // ==========================================================
    // 3. OBTENER DISPONIBILIDAD ACTUAL
    // ==========================================================

    const filaActual =
        valores[indiceFila + 1];

    const cajasTotales =
        Number(filaActual?.[2]) || 0;

    const cajasDisponibleActual =
        Number(filaActual?.[3]) || 0;

    const cajasNoDisponibles =
        Number(filaActual?.[4]) || 0;


    // ==========================================================
    // 4. CALCULAR NUEVA DISPONIBILIDAD
    // ==========================================================

    const nuevaDisponibilidad =
        cajasDisponibleActual +
        cambio;


    // ==========================================================
    // VALIDACIONES
    // ==========================================================

    if (nuevaDisponibilidad < 0) {
        throw new Error(
            `La operación dejaría la disponibilidad en ${nuevaDisponibilidad} cajas. No puede ser negativa.`
        );
    }

    if (
        cajasTotales > 0 &&
        nuevaDisponibilidad > cajasTotales
    ) {
        throw new Error(
            `La disponibilidad (${nuevaDisponibilidad}) no puede superar las cajas totales (${cajasTotales}).`
        );
    }


    // ==========================================================
    // 5. ACTUALIZAR COLUMNAS D, F Y G
    //
    // D = CajasDisponible
    // F = FechaActualizacion
    // G = ActualizadoPor
    // ==========================================================

    const fechaActualizacion =
        new Date().toISOString();

    const rango =
        `D${numeroFila}:G${numeroFila}`;


    // IMPORTANTE:
    //
    // D cambia
    // E permanece igual
    // F cambia
    // G cambia

    const valoresActualizados = [
        [
            nuevaDisponibilidad,
            cajasNoDisponibles,
            fechaActualizacion,
            actualizadoPor || "Usuario"
        ]
    ];


    const url =
        `${obtenerUrlExcelCentral(excelId)}` +
        `/workbook/worksheets('DISPONIBILIDAD')` +
        `/range(address='${rango}')`;


    await graphFetch(
        url,
        accessToken,
        {
            method: "PATCH",

            body: JSON.stringify({
                values: valoresActualizados,
            }),
        }
    );


    // ==========================================================
    // RESULTADO
    // ==========================================================

    return {
        referenceID,
        cajasTotales,
        cajasDisponibleAnterior:
            cajasDisponibleActual,

        cambio,

        cajasDisponible:
            nuevaDisponibilidad,

        cajasNoDisponibles,

        fechaActualizacion,

        actualizadoPor:
            actualizadoPor || "Usuario",

        filaExcel:
            numeroFila,
    };
}// ============================================================
// CONTENEDORES ANTERIORES
// ============================================================

// Lee los contenedores que fueron facturados en meses anteriores
// pero que serán despachados en meses posteriores.
//
// IMPORTANTE:
// Estos datos son independientes de DISPONIBILIDAD,
// INVENTARIO y PLANIFICACION.
//
export async function obtenerContenedoresAnteriores(
    accessToken,
    excelId
) {
    if (!accessToken) {
        throw new Error(
            "No existe accessToken para obtener los contenedores anteriores."
        );
    }

    if (!excelId) {
        throw new Error(
            "No existe el ID del archivo Excel."
        );
    }

    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "CONTENEDORES_ANTERIORES"
        );

    return range?.values || [];
}


// ============================================================
// DETALLE CONTENEDORES ANTERIORES
// ============================================================

// Lee las referencias y cantidades asociadas a cada
// contenedor facturado anteriormente.
//
export async function obtenerDetalleContenedoresAnteriores(
    accessToken,
    excelId
) {
    if (!accessToken) {
        throw new Error(
            "No existe accessToken para obtener el detalle de los contenedores anteriores."
        );
    }

    if (!excelId) {
        throw new Error(
            "No existe el ID del archivo Excel."
        );
    }

    const range =
        await obtenerUsedRange(
            accessToken,
            excelId,
            "DETALLE_CONTENEDORES_ANTERIORES"
        );

    return range?.values || [];
}