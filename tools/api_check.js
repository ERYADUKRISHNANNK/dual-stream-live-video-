const fetch = require('node-fetch');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNGJjMDBlMjEwODVmNDg2YjRhNmJiZiIsInVzZXJuYW1lIjoiWUFEVUtSSVNITkFOIE4gSyIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc4MzM1MTUwMSwiZXhwIjoxNzgzMzgwMzAxfQ.b5Z1wSTZdoFZJGxAhDQ9zbX83bivB6HnGYB7GAm_i10';

async function check() {
  try {
    const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
    const list = await fetch('http://127.0.0.1:5000/api/files/list', { headers });
    console.log('/api/files/list', list.status);
    const listJson = await list.text();
    console.log(listJson.slice(0, 2000));

    const resp = await fetch('http://127.0.0.1:5000/api/files/download/000000000000000000000000', { headers });
    console.log('/api/files/download', resp.status);
    console.log(await resp.text());

    const share = await fetch('http://127.0.0.1:5000/api/files/share', { method: 'POST', headers, body: JSON.stringify({ fileId: 'fakeid', targetUsername: 'someone', durationSeconds: 3600 }) });
    console.log('/api/files/share', share.status);
    console.log(await share.text());
  } catch (e) {
    console.error('fetch error', e.message);
  }
}

check();
