
import { useState } from "react";

const MAX_PESO = 25;
const MAX_CBM = 71;

function Semanas({
  semanas = [],
  setSemanas,
  disponibilidad = [],
  masterData = [],
}) {
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [numeroSemana, setNumeroSemana] =
    useState("");

  const [nombreBuque, setNombreBuque] =
    useState("");

  const [cantidadContenedores, setCantidadContenedores] =
    useState(1);

  const [error, setError] = useState("");

  // ============================================================
  // CREAR SEMANA
  // ============================================================

  const crearSemana = () => {
    setError("");

    const numero = Number(numeroSemana);
    const cantidad = Number(cantidadContenedores);

    if (!Number.isFinite(numero) || numero <= 0) {
      setError("Debes ingresar un número de semana válido.");
      return;
    }

    if (!nombreBuque.trim()) {
      setError("Debes ingresar el nombre del buque.");
      return;
    }

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      cantidad > 100
    ) {
      setError(
        "La cantidad de contenedores debe estar entre 1 y 100."
      );
      return;
    }

    // ==========================================================
    // VALIDAR QUE NO EXISTA LA SEMANA
    // ==========================================================

    const existe = semanas.some(
      (semana) =>
        Number(semana.numero) === numero
    );

    if (existe) {
      setError(
        `La semana ${numero} ya existe.`
      );
      return;
    }

    // ==========================================================
    // CREAR CONTENEDORES
    // ==========================================================

    const contenedores = [];

    for (let i = 1; i <= cantidad; i++) {
      contenedores.push({
        id: crypto.randomUUID(),

        codigo: `CONT-${numero}-${String(i).padStart(
          2,
          "0"
        )}`,

        numero: i,

        peso: 0,

        cbm: 0,

        cajas: 0,

        unidades: 0,

        referencias: [],
      });
    }

    // ==========================================================
    // CREAR SEMANA
    // ==========================================================

    const nuevaSemana = {
      id: crypto.randomUUID(),

      numero,

      nombreBuque:
        nombreBuque.trim(),

      contenedores,

      creadaEn:
        new Date().toISOString(),
    };

    // ==========================================================
    // AGREGAR AL ESTADO CENTRAL
    // ==========================================================

    setSemanas((actuales) => [
      ...actuales,
      nuevaSemana,
    ]);

    // ==========================================================
    // LIMPIAR FORMULARIO
    // ==========================================================

    setNumeroSemana("");
    setNombreBuque("");
    setCantidadContenedores(1);

    setMostrarFormulario(false);
  };

  // ============================================================
  // ELIMINAR SEMANA
  // ============================================================

  const eliminarSemana = (semanaId) => {
    const semana = semanas.find(
      (item) => item.id === semanaId
    );

    if (!semana) {
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la Semana ${semana.numero} - ${semana.nombreBuque}?`
    );

    if (!confirmar) {
      return;
    }

    setSemanas((actuales) =>
      actuales.filter(
        (item) => item.id !== semanaId
      )
    );
  };

  // ============================================================
  // AGREGAR CONTENEDOR A UNA SEMANA
  // ============================================================

  const agregarContenedor = (semanaId) => {
    setError("");

    setSemanas((actuales) =>
      actuales.map((semana) => {
        if (semana.id !== semanaId) {
          return semana;
        }

        const contenedores =
          semana.contenedores || [];

        const nuevoNumero =
          contenedores.length + 1;

        const nuevoContenedor = {
          id: crypto.randomUUID(),

          codigo: `CONT-${semana.numero}-${String(
            nuevoNumero
          ).padStart(2, "0")}`,

          numero: nuevoNumero,

          peso: 0,

          cbm: 0,

          cajas: 0,

          unidades: 0,

          referencias: [],
        };

        return {
          ...semana,

          contenedores: [
            ...contenedores,
            nuevoContenedor,
          ],
        };
      })
    );
  };

  // ============================================================
  // ELIMINAR CONTENEDOR
  // ============================================================

  const eliminarContenedor = (
    semanaId,
    contenedorId
  ) => {
    const semana = semanas.find(
      (item) => item.id === semanaId
    );

    if (!semana) {
      return;
    }

    const contenedor =
      semana.contenedores?.find(
        (item) => item.id === contenedorId
      );

    if (!contenedor) {
      return;
    }

    if (
      contenedor.referencias &&
      contenedor.referencias.length > 0
    ) {
      const confirmar = window.confirm(
        "Este contenedor tiene referencias asignadas. ¿Seguro que deseas eliminarlo?"
      );

      if (!confirmar) {
        return;
      }
    }

    setSemanas((actuales) =>
      actuales.map((item) => {
        if (item.id !== semanaId) {
          return item;
        }

        return {
          ...item,

          contenedores:
            (item.contenedores || []).filter(
              (contenedor) =>
                contenedor.id !==
                contenedorId
            ),
        };
      })
    );
  };

  // ============================================================
  // TOTAL CONTENEDORES
  // ============================================================

  const totalContenedores =
    semanas.reduce(
      (total, semana) =>
        total +
        (semana.contenedores?.length || 0),
      0
    );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mt-8">

      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

        <div>

          <h2 className="text-2xl font-bold text-gray-800">
            Semanas y buques
          </h2>

          <p className="text-gray-500 mt-1">
            Crea las semanas de planificación y
            asigna los contenedores.
          </p>

        </div>

        <button
          type="button"
          onClick={() => {
            setMostrarFormulario(
              !mostrarFormulario
            );
            setError("");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg"
        >
          {mostrarFormulario
            ? "Cancelar"
            : "+ Crear semana"}
        </button>

      </div>

      {/* ======================================================
          RESUMEN
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">

          <p className="text-sm text-gray-500">
            Semanas
          </p>

          <p className="text-3xl font-bold text-blue-700">
            {semanas.length}
          </p>

        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5">

          <p className="text-sm text-gray-500">
            Contenedores
          </p>

          <p className="text-3xl font-bold text-green-700">
            {totalContenedores}
          </p>

        </div>

        <div className="bg-gray-50 border rounded-xl p-5">

          <p className="text-sm text-gray-500">
            Referencias cargadas
          </p>

          <p className="text-3xl font-bold text-gray-800">

            {semanas.reduce(
              (totalSemanas, semana) =>
                totalSemanas +
                (semana.contenedores || []).reduce(
                  (totalContenedores, contenedor) =>
                    totalContenedores +
                    (contenedor.referencias?.length ||
                      0),
                  0
                ),
              0
            )}

          </p>

        </div>

      </div>

      {/* ======================================================
          FORMULARIO CREAR SEMANA
      ====================================================== */}

      {mostrarFormulario && (

        <div className="mt-6 bg-white border border-blue-200 rounded-2xl shadow-sm p-6">

          <h3 className="text-xl font-bold text-blue-700">
            Crear nueva semana
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Define la semana, el buque y la cantidad
            inicial de contenedores.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

            {/* NUMERO SEMANA */}

            <div>

              <label className="text-sm font-semibold">
                Número de semana
              </label>

              <input
                type="number"
                min="1"
                value={numeroSemana}
                onChange={(e) =>
                  setNumeroSemana(
                    e.target.value
                  )
                }
                placeholder="Ej: 34"
                className="mt-1 w-full border rounded-lg px-4 py-3"
              />

            </div>

            {/* BUQUE */}

            <div>

              <label className="text-sm font-semibold">
                Nombre del buque
              </label>

              <input
                type="text"
                value={nombreBuque}
                onChange={(e) =>
                  setNombreBuque(
                    e.target.value
                  )
                }
                placeholder="Ej: MSC ARIES"
                className="mt-1 w-full border rounded-lg px-4 py-3"
              />

            </div>

            {/* CONTENEDORES */}

            <div>

              <label className="text-sm font-semibold">
                Contenedores iniciales
              </label>

              <input
                type="number"
                min="1"
                max="100"
                value={cantidadContenedores}
                onChange={(e) =>
                  setCantidadContenedores(
                    e.target.value
                  )
                }
                className="mt-1 w-full border rounded-lg px-4 py-3"
              />

            </div>

          </div>

          {/* ERROR */}

          {error && (

            <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">

              {error}

            </div>

          )}

          {/* BOTON CREAR */}

          <button
            type="button"
            onClick={crearSemana}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg"
          >
            Crear semana y contenedores
          </button>

        </div>

      )}

      {/* ======================================================
          LISTADO DE SEMANAS
      ====================================================== */}

      <div className="mt-8 space-y-6">

        {semanas.length === 0 ? (

          <div className="bg-gray-50 border border-dashed rounded-2xl p-10 text-center">

            <p className="text-gray-500">
              Todavía no has creado ninguna semana.
            </p>

            <button
              type="button"
              onClick={() =>
                setMostrarFormulario(true)
              }
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold"
            >
              + Crear primera semana
            </button>

          </div>

        ) : (

          semanas.map((semana) => (

            <div
              key={semana.id}
              className="bg-white border rounded-2xl shadow-sm overflow-hidden"
            >

              {/* ==================================================
                  CABECERA SEMANA
              ================================================== */}

              <div className="bg-gray-50 border-b p-6">

                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                  <div>

                    <div className="flex items-center gap-3">

                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        Semana {semana.numero}
                      </span>

                      <h3 className="text-xl font-bold text-gray-800">
                        {semana.nombreBuque}
                      </h3>

                    </div>

                    <p className="text-sm text-gray-500 mt-2">
                      {
                        semana.contenedores
                          ?.length || 0
                      }{" "}
                      contenedores
                    </p>

                  </div>

                  <div className="flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        agregarContenedor(
                          semana.id
                        )
                      }
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      + Contenedor
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarSemana(
                          semana.id
                        )
                      }
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-semibold"
                    >
                      Eliminar semana
                    </button>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  CONTENEDORES
              ================================================== */}

              <div className="p-6">

                {(
                  semana.contenedores || []
                ).length === 0 ? (

                  <div className="border border-dashed rounded-xl p-8 text-center">

                    <p className="text-gray-500">
                      Esta semana todavía no tiene
                      contenedores.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        agregarContenedor(
                          semana.id
                        )
                      }
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold"
                    >
                      + Crear contenedor
                    </button>

                  </div>

                ) : (

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {(
                      semana.contenedores || []
                    ).map(
                      (contenedor) => (

                        <div
                          key={
                            contenedor.id
                          }
                          className="border rounded-xl p-5 hover:shadow-md transition"
                        >

                          {/* CONTENEDOR */}

                          <div className="flex justify-between items-start">

                            <div>

                              <p className="text-lg font-bold text-blue-700">
                                {
                                  contenedor.codigo
                                }
                              </p>

                              <p className="text-xs text-gray-500">
                                Contenedor #
                                {
                                  contenedor.numero
                                }
                              </p>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarContenedor(
                                  semana.id,
                                  contenedor.id
                                )
                              }
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Eliminar
                            </button>

                          </div>

                          {/* CAPACIDAD */}

                          <div className="grid grid-cols-2 gap-3 mt-5">

                            <div className="bg-gray-50 rounded-lg p-3">

                              <p className="text-xs text-gray-500">
                                Peso
                              </p>

                              <p className="font-bold">
                                {Number(
                                  contenedor.peso ||
                                    0
                                ).toFixed(2)}{" "}
                                T
                              </p>

                              <p className="text-xs text-gray-400">
                                máximo {MAX_PESO} T
                              </p>

                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">

                              <p className="text-xs text-gray-500">
                                CBM
                              </p>

                              <p className="font-bold">
                                {Number(
                                  contenedor.cbm ||
                                    0
                                ).toFixed(2)}
                              </p>

                              <p className="text-xs text-gray-400">
                                máximo {MAX_CBM}
                              </p>

                            </div>

                          </div>

                          {/* REFERENCIAS */}

                          <div className="mt-4 bg-blue-50 rounded-lg p-3">

                            <p className="text-xs text-gray-500">
                              Referencias asignadas
                            </p>

                            <p className="font-bold text-blue-700">

                              {
                                contenedor
                                  .referencias
                                  ?.length || 0
                              }

                            </p>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default Semanas;
