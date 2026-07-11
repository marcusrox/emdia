const { createServer } = require("./src/server");
const { initializeDatabase } = require("./src/database/schema");
const { seedDatabase } = require("./src/database/seed");

const port = Number(process.env.PORT || 3000);

initializeDatabase();
seedDatabase();

const server = createServer();

server.listen(port, () => {
  console.log(`EmDia rodando em http://localhost:${port}`);
});
