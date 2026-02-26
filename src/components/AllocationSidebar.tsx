import { useState } from 'react';

export default function AllocationSidebar({ isOpen, onClose, collaborators, pivots, onAllocationSuccess }) {
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [selectedPivot, setSelectedPivot] = useState(null);

  const handleAllocate = async () => {
    if (!selectedCollaborator || !selectedPivot) return;

    try {
      const response = await fetch('/api/collaborators/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: selectedCollaborator, pivotId: selectedPivot }),
      });
      if (response.ok) {
        alert('Alocação bem-sucedida!');
        onAllocationSuccess();
        setSelectedCollaborator(null);
        setSelectedPivot(null);
      } else {
        alert('Falha na alocação.');
      }
    } catch (error) {
      console.error('Allocation error:', error);
      alert('Erro ao alocar.');
    }
  };

  return (
    <div className={`absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-[1000] p-6 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <button onClick={onClose} className="absolute top-4 right-4">X</button>
      <h2 className="text-2xl font-bold mb-4">Alocar Colaborador</h2>

      <div className="space-y-4">
        <div>
          <label>Colaborador</label>
          <select onChange={(e) => setSelectedCollaborator(e.target.value)} value={selectedCollaborator || ''} className="w-full p-2 border rounded">
            <option value="" disabled>Selecione</option>
            {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label>Pivô de Destino</label>
          <select onChange={(e) => setSelectedPivot(e.target.value)} value={selectedPivot || ''} className="w-full p-2 border rounded">
            <option value="" disabled>Selecione</option>
            {pivots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={handleAllocate} disabled={!selectedCollaborator || !selectedPivot} className="w-full p-2 bg-indigo-600 text-white rounded disabled:bg-gray-400">Alocar</button>
      </div>
    </div>
  );
}
