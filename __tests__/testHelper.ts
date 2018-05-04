// Test helper, in case integration tests with postgres have different defaults

const SQL_USER = process.env.SQL_USER || "postgres";
const SQL_HOST = process.env.SQL_HOST || "localhost";
const SQL_PASSWORD = process.env.SQL_PASSWORD || "mysecretpassword";
const SQL_DB = process.env.SQL_DB || "testdb";
const SQL_PORT = process.env.SQL_PORT || "5432";

export {
  SQL_USER,
  SQL_HOST,
  SQL_PASSWORD,
  SQL_DB,
  SQL_PORT
};
