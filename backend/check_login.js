import Usuario from './src/models/usuario.js';
async function test() {
  const u = await Usuario.findByEmail('coord.informatica@iujo.edu');
  console.log(u);
  process.exit(0);
}
test();
