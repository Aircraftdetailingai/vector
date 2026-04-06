// Standard default intake flow for all new detailers
// Service Select node fetches live from the detailer's services table at render time

export function buildDefaultFlowData() {
  const edgeStyle = {
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#4a5568', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#4a5568' },
  };

  const nodes = [
    { id: 'start-1', type: 'start', position: { x: 300, y: 0 }, data: { label: 'Customer starts here' }, deletable: false },
    { id: 'aircraft-info', type: 'aircraftInfo', position: { x: 270, y: 160 }, data: { label: 'Aircraft Info' }, deletable: false },
    { id: 'svc-1', type: 'serviceSelect', position: { x: 270, y: 340 }, data: { label: 'What services do you need?', required: true } },
    { id: 'q-notes', type: 'question', position: { x: 270, y: 520 }, data: { label: 'Any specific instructions?', answerType: 'long_text', required: false, placeholder: 'Special requests, access details, timing...' } },
    { id: 'q-photos', type: 'question', position: { x: 270, y: 700 }, data: { label: 'Upload photos of your aircraft', answerType: 'photo_upload', required: false } },
    { id: 'end-1', type: 'end', position: { x: 300, y: 880 }, data: { label: 'Submit request' } },
  ];

  const edges = [
    { id: 'e-start-aircraft', source: 'start-1', target: 'aircraft-info', ...edgeStyle },
    { id: 'e-aircraft-svc', source: 'aircraft-info', target: 'svc-1', ...edgeStyle },
    { id: 'e-svc-notes', source: 'svc-1', target: 'q-notes', ...edgeStyle },
    { id: 'e-notes-photos', source: 'q-notes', target: 'q-photos', ...edgeStyle },
    { id: 'e-photos-end', source: 'q-photos', target: 'end-1', ...edgeStyle },
  ];

  return { flow_nodes: nodes, flow_edges: edges };
}
