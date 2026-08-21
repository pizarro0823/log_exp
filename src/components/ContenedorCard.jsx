import React from "react";

function ContenedorCard({
    contenedor,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
}) {
    const peso = Number(contenedor?.peso || 0);
    const cbm = Number(contenedor?.cbm || 0);

    const PESO_MAXIMO = 25;
    const CBM_MAXIMO = 71;

    const porcentajePeso = Math.min(
        (peso / PESO_MAXIMO) * 100,
        100
    );

    const porcentajeCbm = Math.min(
        (cbm / CBM_MAXIMO) * 100,
        100
    );

    const referencias = Array.isArray(
        contenedor?.referencias
    )
        ? contenedor.referencias
        : [];

    const totalCajas = referencias.reduce(
        (total, ref) =>
            total + (Number(ref?.cantidadCajas) || 0),
        0
    );

    return (
        <div
            draggable
            onDragStart={(e) =>
                onDragStart?.(e, contenedor)
            }
            onDragOver={(e) => {
                e.preventDefault();
                onDragOver?.(e, contenedor);
            }}
            onDrop={(e) => {
                e.preventDefault();
                onDrop?.(e, contenedor);
            }}
            onClick={() => onClick?.(contenedor)}
            className="
        group
        relative
        bg-white
        border
        border-gray-200
        rounded-xl
        p-3
        cursor-grab
        hover:border-blue-400
        hover:shadow-md
        transition-all
        select-none
      "
        >

            {/* =====================================================
          CABECERA
      ===================================================== */}

            <div className="flex justify-between items-center">

                <div>

                    <p className="font-bold text-blue-700 text-sm">
                        {contenedor.id}
                    </p>

                    <p className="text-[11px] text-gray-500">
                        {referencias.length} referencia
                        {referencias.length !== 1 ? "s" : ""}
                    </p>

                </div>

                <span className="
          text-[10px]
          bg-gray-100
          text-gray-600
          px-2
          py-1
          rounded-full
        ">
                    {totalCajas} cajas
                </span>

            </div>


            {/* =====================================================
          PESO
      ===================================================== */}

            <div className="mt-3">

                <div className="flex justify-between text-[11px]">

                    <span className="text-gray-500">
                        Peso
                    </span>

                    <span className="font-semibold">
                        {peso.toFixed(2)} / {PESO_MAXIMO} T
                    </span>

                </div>

                <div className="
          w-full
          bg-gray-200
          rounded-full
          h-2
          mt-1
        ">

                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                            width: `${porcentajePeso}%`,
                        }}
                    />

                </div>

            </div>


            {/* =====================================================
          CBM
      ===================================================== */}

            <div className="mt-2">

                <div className="flex justify-between text-[11px]">

                    <span className="text-gray-500">
                        CBM
                    </span>

                    <span className="font-semibold">
                        {cbm.toFixed(2)} / {CBM_MAXIMO}
                    </span>

                </div>

                <div className="
          w-full
          bg-gray-200
          rounded-full
          h-2
          mt-1
        ">

                    <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                            width: `${porcentajeCbm}%`,
                        }}
                    />

                </div>

            </div>


            {/* =====================================================
          HOVER
      ===================================================== */}

            <div
                className="
          pointer-events-none
          absolute
          left-1/2
          bottom-full
          mb-2
          -translate-x-1/2
          w-64
          bg-gray-900
          text-white
          rounded-xl
          shadow-xl
          p-4
          opacity-0
          group-hover:opacity-100
          transition-opacity
          z-50
        "
            >

                <p className="font-bold text-sm mb-2">
                    {contenedor.id}
                </p>

                {referencias.length === 0 ? (

                    <p className="text-xs text-gray-400">
                        Sin referencias.
                    </p>

                ) : (

                    <div className="space-y-1">

                        {referencias.map((ref, index) => (

                            <div
                                key={`${ref.referenceID}-${index}`}
                                className="flex justify-between gap-3 text-xs"
                            >

                                <span className="truncate">
                                    {ref.referencia}
                                </span>

                                <span className="font-bold">
                                    {ref.cantidadCajas}
                                </span>

                            </div>

                        ))}

                    </div>

                )}

                <div className="
          border-t
          border-gray-700
          mt-3
          pt-2
          text-[11px]
          text-gray-300
        ">

                    {totalCajas} cajas ·{" "}
                    {referencias.length} referencias

                </div>

            </div>

        </div>
    );
}

export default ContenedorCard;