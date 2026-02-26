import fetch from 'node-fetch';

const data = {
  "poligonais": [
    {
      "nome": "POLIGONAL_1",
      "poligono": [
        [-41.49492850326317,-13.05820811814919],
        [-41.49262856848448,-13.05718022231286],
        [-41.48877238970137,-13.05545673378683],
        [-41.48314689908523,-13.05294483615988],
        [-41.47898602537476,-13.05107370603678]
      ],
      "pivo": {
        "nome": "Pivo_1",
        "longitude": -41.4876922771816,
        "latitude": -13.05497232328911
      }
    },
    {
      "nome": "POLIGONAL_2",
      "poligono": [
        [-41.35318518427582,-13.20400429403122],
        [-41.34214089613801,-13.20092526564902],
        [-41.33028913228639,-13.19774645027712],
        [-41.33259533965804,-13.19636867897825],
        [-41.33431642026849,-13.19553381807058]
      ],
      "pivo": {
        "nome": "Pivo_2",
        "longitude": -41.33850539412535,
        "latitude": -13.19891570140124
      }
    },
    {
      "nome": "POLIGONAL_3",
      "poligono": [
        [-41.44395933999744,-13.14110121999982],
        [-41.44381844999745,-13.14164439999982],
        [-41.44360056999745,-13.14205974999981],
        [-41.44355144999742,-13.14227812999986],
        [-41.44319321999746,-13.14294617999986]
      ],
      "pivo": {
        "nome": "Pivo_3",
        "longitude": -41.44362460599744,
        "latitude": -13.14200593599983
      }
    }
  ]
};

async function addPoligonaisPivos() {
  try {
    const response = await fetch('http://localhost:3000/api/poligonais-pivos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    const responseData = await response.json();
    console.log('Successfully added poligonais and pivots:', JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error('Error adding poligonais and pivots:', error);
  }
}

addPoligonaisPivos();
