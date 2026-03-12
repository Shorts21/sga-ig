import React, { useState } from 'react';
import { Upload, Map as MapIcon, AlertCircle, CheckCircle2, Loader2, Circle, Hexagon, MapPin } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface ImportadorGeoProps {
    onSuccess?: () => void;
}

// Subsampling: mantém no máximo N pontos distribuídos uniformemente
function subsample<T>(arr: T[], maxPoints: number): T[] {
    if (arr.length <= maxPoints) return arr;
    const step = arr.length / maxPoints;
    return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step) % arr.length]);
}

// Distância Haversine entre dois pontos [lat, lng] em metros
function haversine(p1: [number, number], p2: [number, number]): number {
    const R = 6371e3;
    const phi1 = p1[0] * Math.PI / 180;
    const phi2 = p2[0] * Math.PI / 180;
    const dPhi = (p2[0] - p1[0]) * Math.PI / 180;
    const dLam = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoords(coordStr: string): [number, number][] {
    return coordStr.trim().split(/\s+/).map(p => {
        const parts = p.split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0 && parts[1] !== 0) {
            return [parts[1], parts[0]] as [number, number]; // [lat, lng]
        }
        return null;
    }).filter((p): p is [number, number] => p !== null);
}

function parseKML(xmlText: string): any[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    const result: any[] = [];

    for (let i = 0; i < placemarks.length; i++) {
        const pm = placemarks[i];

        // 1. Extrair Nome
        let nome = '';
        const simpleDatas = pm.getElementsByTagName('SimpleData');
        const nameFields = ['DESC_TALHA', 'NOME', 'Nome', 'Name', 'TALHAO', 'Talhao', 'Label', 'ID_TALHAO', 'Pivo', 'PIVO', 'Identificador'];

        for (let j = 0; j < simpleDatas.length; j++) {
            const attr = simpleDatas[j].getAttribute('name') || '';
            const val = simpleDatas[j].textContent?.trim() || '';
            if (nameFields.includes(attr) && val && isNaN(Number(val))) {
                nome = val;
                break;
            }
        }
        if (!nome) {
            for (let j = 0; j < simpleDatas.length; j++) {
                const val = simpleDatas[j].textContent?.trim() || '';
                if (val && isNaN(Number(val)) && val.length > 1) {
                    nome = val; break;
                }
            }
        }
        if (!nome) {
            const tagName = pm.getElementsByTagName('name')[0]?.textContent?.trim() || '';
            if (isNaN(Number(tagName))) nome = tagName;
        }
        if (!nome) nome = `Pivô ${i + 1}`;

        // 2. Extrair Área (opcional, se presente no SimpleData)
        let area = 0;
        const areaFields = ['AREA_TOTAL', 'Area', 'AREA', 'Hectares', 'area_ha'];
        for (let j = 0; j < simpleDatas.length; j++) {
            if (areaFields.includes(simpleDatas[j].getAttribute('name') || '')) {
                area = parseFloat(simpleDatas[j].textContent || '0');
                if (area > 0) break;
            }
        }

        // 3. Extrair Geometrias (Point, Polygon)
        // O getElementsByTagName detecta dentro de MultiGeometry automaticamente
        const geometries: { type: string, coords: [number, number][] }[] = [];

        const ptTags = pm.getElementsByTagName('Point');
        for (let k = 0; k < ptTags.length; k++) {
            const coordStr = ptTags[k].getElementsByTagName('coordinates')[0]?.textContent || '';
            const pts = parseCoords(coordStr);
            if (pts.length > 0) geometries.push({ type: 'Point', coords: [pts[0]] });
        }

        const polyTags = pm.getElementsByTagName('Polygon');
        for (let k = 0; k < polyTags.length; k++) {
            const coordStr = polyTags[k].getElementsByTagName('coordinates')[0]?.textContent || '';
            const pts = parseCoords(coordStr);
            if (pts.length > 0) geometries.push({ type: 'Polygon', coords: pts });
        }

        const lineTags = pm.getElementsByTagName('LineString');
        for (let k = 0; k < lineTags.length; k++) {
            const coordStr = lineTags[k].getElementsByTagName('coordinates')[0]?.textContent || '';
            const pts = parseCoords(coordStr);
            // Considera LineString com mais de 10 pontos como um possível contorno de pivô (polígono)
            if (pts.length >= 4) {
                geometries.push({ type: 'Polygon', coords: pts });
            }
        }

        for (let g = 0; g < geometries.length; g++) {
            const geom = geometries[g];
            const nomeFinal = geometries.length > 1 ? `${nome} (Parte ${g + 1})` : nome;

            let isCircle = false;
            let meanR = 0;
            let centro: [number, number] | null = null;
            let finalCoords: [number, number][] | null = null;
            let finalTipo = geom.type === 'Point' ? 'point' : 'polygon';

            if (geom.type === 'Point') {
                centro = geom.coords[0];
            } else if (geom.type === 'Polygon') {
                const latMed = geom.coords.reduce((s, p) => s + p[0], 0) / geom.coords.length;
                const lngMed = geom.coords.reduce((s, p) => s + p[1], 0) / geom.coords.length;
                centro = [latMed, lngMed];

                const dists = geom.coords.map(p => haversine(centro!, p));
                meanR = dists.reduce((s, d) => s + d, 0) / dists.length;
                const std = Math.sqrt(dists.reduce((s, d) => s + (d - meanR) ** 2, 0) / dists.length);
                const cv = std / meanR;

                if (cv < 0.06) {
                    isCircle = true;
                    finalTipo = 'circle';
                    if (area === 0) area = parseFloat(((Math.PI * meanR ** 2) / 10000).toFixed(2));
                } else {
                    finalCoords = subsample(geom.coords, 180); // Limite seguro para PostGIS/API
                }
            }

            // Identificador Único: sha256(slug_nome + coords + tipo) para evitar duplicação persistente
            const normalizedHashName = (nomeFinal || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const coordsStr = isCircle ? JSON.stringify(centro) : JSON.stringify(finalCoords || geom.coords);
            const strForHash = `${normalizedHashName}_${coordsStr}_${finalTipo}`;
            const import_hash = CryptoJS.SHA256(strForHash).toString(CryptoJS.enc.Hex);

            result.push({
                nome: nomeFinal,
                area_ha: area,
                tipo: finalTipo,
                geometry: finalTipo === 'polygon' ? (finalCoords || geom.coords) : (finalTipo === 'point' ? [centro] : null),
                centro: centro,
                raio_m: isCircle ? parseFloat(meanR.toFixed(2)) : null,
                import_hash
            });
        }
    }
    return result;
}

const ImportadorGeo: React.FC<ImportadorGeoProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [progress, setProgress] = useState({ total: 0, current: 0 });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setSuccess(null);
        setPreview([]);
        setProgress({ total: 0, current: 0 });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const startTime = performance.now();
                const rawPivos = parseKML(text);

                if (rawPivos.length === 0) {
                    throw new Error('Nenhum Placemark geométrico válido encontrado no KML.');
                }

                // 1. Desduplicar no Batch
                const seenHash = new Map<string, any>();
                rawPivos.forEach(p => seenHash.set(p.import_hash, p));
                const pivos = Array.from(seenHash.values());
                const localDuplicates = rawPivos.length - pivos.length;

                setPreview(pivos);
                setProgress({ total: pivos.length, current: 0 });

                let savedTotal = 0;
                let dbDuplicates = 0;
                let errorTotal = 0;

                // 2. Processar em Batches de 200 (evitar timeout/payload limit)
                const BATCH_SIZE = 200;
                for (let i = 0; i < pivos.length; i += BATCH_SIZE) {
                    const chunk = pivos.slice(i, i + BATCH_SIZE);

                    const res = await fetch('/api/pivos-geo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(chunk)
                    });

                    const resData = await res.json().catch(() => ({}));

                    if (!res.ok) {
                        errorTotal += chunk.length;
                        console.error('Batch Error:', resData);
                    } else {
                        // Se backend retornou array, conta quantos vieram. Se desduplicou no DB, resData.length pode ser menor
                        const chunkSaved = Array.isArray(resData) ? resData.length : chunk.length;
                        savedTotal += chunkSaved;
                        dbDuplicates += (chunk.length - chunkSaved);
                    }

                    setProgress(prev => ({ ...prev, current: Math.min(i + BATCH_SIZE, pivos.length) }));
                }

                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                const totalIgnored = localDuplicates + dbDuplicates;

                setSuccess(`Sucesso! ${savedTotal} importados em ${elapsed}s. Ignorados: ${totalIgnored} (duplicatas). Erros: ${errorTotal}.`);
                if (onSuccess) onSuccess();
            } catch (err: any) {
                setError(err.message || 'Erro ao processar arquivo.');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
                <MapIcon className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Importação Completa KML (Geo)</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 italic">
                Suporta Point, Polygon, MultiGeometry e De-duplicação por Hash
            </p>

            <div className="max-w-xl">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${loading ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className={`w-8 h-8 mb-3 ${loading ? 'text-primary-400 animate-pulse' : 'text-slate-400'}`} />
                        <p className="mb-1 text-sm text-slate-600 font-medium">
                            {loading ? 'Processando Batch...' : 'Selecione arquivo KML'}
                        </p>
                        <p className="text-xs text-slate-400">Placemarks → PostGIS → Mapa</p>
                    </div>
                    <input
                        type="file"
                        accept=".kml"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="hidden"
                    />
                </label>
            </div>

            {loading && progress.total > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Progresso da Importação</span>
                        <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-primary-500 h-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-primary-600 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Persistindo geometrias no banco...
                    </div>
                </div>
            )}

            {preview.length > 0 && !loading && (
                <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Geometrias Processadas</span>
                        <span className="ml-auto text-xs text-slate-400">{preview.length} itens</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {preview.slice(0, 15).map((p, idx) => (
                            <div key={idx} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 hover:bg-slate-50">
                                {p.tipo === 'circle' ? <Circle className="w-3.5 h-3.5 text-blue-500" /> :
                                    p.tipo === 'point' ? <MapPin className="w-3.5 h-3.5 text-rose-500" /> :
                                        <Hexagon className="w-3.5 h-3.5 text-emerald-500" />}
                                <span className="text-xs font-medium text-slate-700 truncate">{p.nome}</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono flex-shrink-0">
                                    {p.import_hash.substring(0, 8)}
                                </span>
                            </div>
                        ))}
                        {preview.length > 15 && (
                            <div className="px-4 py-2 text-xs text-slate-400 text-center">+{preview.length - 15} mais...</div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                </div>
            )}
        </div>
    );
};

export default ImportadorGeo;

