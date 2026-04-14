const fetch = require('node-fetch');

async function check(folder) {
    const url = `https://audio.iskcondesiretree.com/02_-_ISKCON_Swamis/${folder}/`;
    try {
      const res = await fetch(url, { method: 'HEAD', timeout: 3000 });
      console.log(`[02_-_ISKCON_Swamis] ${folder} -> ${res.status}`);
    } catch(e) {
      console.log(`[02_-_ISKCON_Swamis] ${folder} -> ERROR`);
    }
}

async function run() {
    await check("ISKCON_Swamis_-_A_to_C");
    await check("ISKCON_Swamis_-_D_to_F");
    await check("ISKCON_Swamis_-_G_to_L");
    await check("ISKCON_Swamis_-_M_to_Q");
    await check("ISKCON_Swamis_-_R_to_Y");
    await check("ISKCON_Swamis_-_Z_to_others");
}

run();
