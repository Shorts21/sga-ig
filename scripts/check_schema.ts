import fetch from 'node-fetch';

async function check() {
  const response = await fetch('http://localhost:3000/api/schema');
  const data = await response.json();
  console.log(data);
}
check();
