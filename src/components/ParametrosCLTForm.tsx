import React, { useState } from 'react';

const ParametrosCLTForm: React.FC = () => {
  const [params, setParams] = useState({
    inss: 20,
    fgts: 8,
    rat: 2,
    terceiros: 5.8,
    provisoes: 28,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = () => {
    // In a real app, this would save to Supabase or Context
    alert('Parâmetros salvos com sucesso! (Simulação)');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Parâmetros CLT Padrão</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">INSS Patronal (%)</label>
          <input
            type="number"
            name="inss"
            value={params.inss}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">FGTS (%)</label>
          <input
            type="number"
            name="fgts"
            value={params.fgts}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">RAT / SAT (%)</label>
          <input
            type="number"
            name="rat"
            value={params.rat}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Terceiros (%)</label>
          <input
            type="number"
            name="terceiros"
            value={params.terceiros}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Provisões (%)</label>
          <input
            type="number"
            name="provisoes"
            value={params.provisoes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Salvar Parâmetros
        </button>
      </div>
    </div>
  );
};

export default ParametrosCLTForm;
