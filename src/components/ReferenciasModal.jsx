import { useMemo, useState } from "react";

function ReferenciasModal({
  abierto,
  cerrar,
  referencias,
  onAgregar,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [referenciaSeleccionada, setReferenciaSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState("");

  const referenciasFiltradas = useMemo(() => {

    if (!busqueda.trim()) {
      return referencias;
    }

    const texto = busqueda.toLowerCase();

    return referencias.filter((ref) => {

      const referencia =
        String(ref.referencia || "").toLowerCase();

      const descripcion =
        String(ref.descripcion || "").toLowerCase();

      return (
        referencia.includes(texto) ||
        descripcion.includes(texto)
      );

    });

  }, [referencias, busqueda]);


  if (!abierto) {
    return null;
  }


  const seleccionarReferencia = (referencia) => {

    setReferenciaSeleccionada(referencia);

    setCantidad("");

  };


  const agregar = () => {

    if (!referenciaSeleccionada) {
      alert("Selecciona una referencia.");
      return;
    }

    const cantidadNumerica = Number(cantidad);

    if (
      !cantidadNumerica ||
      cantidadNumerica <= 0
    ) {

      alert("Ingresa una cantidad válida.");
      return;

    }


    if (
      cantidadNumerica >
      referenciaSeleccionada.disponible
    ) {

      alert(
        `Solo hay ${referenciaSeleccionada.disponible} cajas disponibles.`
      );

      return;

    }


    onAgregar(
      referenciaSeleccionada,
      cantidadNumerica
    );


    setReferenciaSeleccionada(null);

    setCantidad("");

    setBusqueda("");

  };


  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">


        {/* =================================================
            ENCABEZADO
        ================================================= */}

        <div className="flex justify-between items-center border-b p-6">

          <div>

            <h2 className="text-2xl font-bold text-blue-700">

              Agregar referencias

            </h2>

            <p className="text-gray-500 text-sm mt-1">

              Selecciona una referencia y la cantidad de cajas.

            </p>

          </div>


          <button
            onClick={cerrar}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >

            ✕

          </button>

        </div>


        {/* =================================================
            BUSCADOR
        ================================================= */}

        <div className="p-6 border-b">

          <input
            type="text"
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Buscar por referencia o descripción..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>


        {/* =================================================
            CONTENIDO
        ================================================= */}

        <div className="flex-1 overflow-y-auto p-6">

          {referenciasFiltradas.length === 0 ? (

            <div className="text-center py-10 text-gray-500">

              No se encontraron referencias.

            </div>

          ) : (

            <div className="space-y-2">

              {referenciasFiltradas.map(
                (ref, index) => (

                  <div
                    key={
                      ref.referenceID ||
                      index
                    }
                    onClick={() =>
                      seleccionarReferencia(ref)
                    }
                    className={`
                      border rounded-lg p-4 cursor-pointer
                      transition
                      ${
                        referenciaSeleccionada?.referenceID ===
                        ref.referenceID
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }
                    `}
                  >

                    <div className="flex justify-between items-center">

                      <div>

                        <p className="font-bold text-blue-700">

                          {ref.referencia}

                        </p>

                        <p className="text-sm text-gray-600">

                          {ref.descripcion}

                        </p>

                      </div>


                      <div className="text-right">

                        <p className="text-sm text-gray-500">

                          Disponible

                        </p>

                        <p className="text-xl font-bold">

                          {ref.disponible}

                        </p>

                        <p className="text-xs text-gray-500">

                          cajas

                        </p>

                      </div>

                    </div>


                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">

                      <div>

                        <span className="text-gray-500">
                          CBM/caja
                        </span>

                        <p className="font-semibold">
                          {ref.cbm}
                        </p>

                      </div>


                      <div>

                        <span className="text-gray-500">
                          Peso/caja
                        </span>

                        <p className="font-semibold">
                          {ref.pesoCaja} kg
                        </p>

                      </div>


                      <div>

                        <span className="text-gray-500">
                          Unidades/caja
                        </span>

                        <p className="font-semibold">
                          {ref.unidadesCaja}
                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* =================================================
            PIE DEL MODAL
        ================================================= */}

        {referenciaSeleccionada && (

          <div className="border-t p-6 bg-gray-50">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">


              {/* REFERENCIA */}

              <div>

                <p className="text-sm text-gray-500">

                  Referencia seleccionada

                </p>

                <p className="font-bold">

                  {referenciaSeleccionada.referencia}

                </p>

              </div>


              {/* DISPONIBLE */}

              <div>

                <p className="text-sm text-gray-500">

                  Disponible

                </p>

                <p className="font-bold">

                  {referenciaSeleccionada.disponible} cajas

                </p>

              </div>


              {/* CANTIDAD */}

              <div>

                <label className="text-sm text-gray-500">

                  Cantidad a asignar

                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    referenciaSeleccionada.disponible
                  }
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1"
                  placeholder="Ej: 50"
                />

              </div>

            </div>


            <div className="flex justify-end gap-3 mt-5">

              <button
                onClick={() => {
                  setReferenciaSeleccionada(null);
                  setCantidad("");
                }}
                className="px-5 py-2 border rounded-lg"
              >

                Cancelar

              </button>


              <button
                onClick={agregar}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >

                Agregar al contenedor

              </button>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

export default ReferenciasModal;